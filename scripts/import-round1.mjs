// Imports 43 participants + their Round 1 (group_1) picks from the Excel spreadsheet.
// Run with: npm run import-round1
// Safe to re-run — participants and picks are upserted, not duplicated.

import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const EXCEL_PATH = join(__dir, '..', 'worldcup_predictions_cleaned.xlsx')

// Ronald's spreadsheet had a couple of wrong column headers.
// Map them to the correct home-away pair as stored in the DB.
const HEADER_FIXES = {
  'NOR-ARG': 'IRQ-NOR', // actual match is Iraq vs Norway
  'ENG-GHA': 'ENG-CRO', // actual match is England vs Croatia
  'KSA-URU': 'KSA-URY', // Uruguay: URU (common) vs URY (FIFA)
  'ESP-CV':  'ESP-CPV', // Cape Verde: CV (common) vs CPV (FIFA)
}

// Some pick values in the spreadsheet use non-FIFA codes.
const CODE_ALIAS = { URU: 'URY', CV: 'CPV' }
const norm = c => CODE_ALIAS[c] ?? c

// "Yves-Marie Rems" → "yves-marie"
// "Ernst Legros (TNes)" → "ernst"
// "Charles-Philippe Sajous" → "charles-philippe"
function buildToken(fullName) {
  const clean = fullName.replace(/\s*\(.*?\)\s*/g, '').trim()
  return clean.split(/\s+/)[0].toLowerCase()
}

function cleanName(fullName) {
  return fullName.replace(/\s*\(.*?\)\s*/g, '').trim()
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Load spreadsheet
  const wb = XLSX.readFile(EXCEL_PATH)
  const ws = wb.Sheets['Predictions']
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })

  const headers = rows[0]           // ['NoIni','Ini','Participants','MEX-RSA',...]
  const matchCols = headers.slice(3) // just the match labels

  // Fetch all group_1 matches and build a lookup by "HOME-AWAY"
  const { data: matches, error: matchErr } = await supabase
    .from('matches')
    .select('id, home_team, away_team')
    .eq('round', 'group_1')
  if (matchErr) { console.error('❌', matchErr.message); process.exit(1) }

  const byKey = {}
  for (const m of matches) byKey[`${m.home_team}-${m.away_team}`] = m

  // Resolve each Excel column to a DB match object
  const colMatches = matchCols.map(col => {
    const key = HEADER_FIXES[col] ?? col
    const m = byKey[key]
    if (!m) console.warn(`  ⚠️  No DB match for column "${col}" (tried "${key}")`)
    return m ?? null
  })

  // Clean up test / placeholder participants
  const { error: delErr } = await supabase
    .from('participants')
    .delete()
    .in('name', ['Pierre Dupont', 'Test Participant'])
  if (!delErr) console.log('🧹 Removed test participants (if any)')

  let pCount = 0, pickCount = 0

  for (const row of rows.slice(1)) {
    const rawName = row[2]
    if (!rawName) continue

    const name  = cleanName(rawName)
    const token = buildToken(rawName)

    // Upsert participant (token is the stable unique key)
    const { data: p, error: pErr } = await supabase
      .from('participants')
      .upsert({ name, token, is_admin: false }, { onConflict: 'token' })
      .select('id')
      .single()

    if (pErr) { console.error(`❌ ${name}: ${pErr.message}`); continue }
    pCount++

    // Build W/D/L picks
    const picks = []
    for (let i = 0; i < matchCols.length; i++) {
      const match = colMatches[i]
      if (!match) continue

      const raw = row[3 + i]
      if (!raw) continue

      let predicted
      if (raw === 'Nul') {
        predicted = 'D'
      } else {
        const code = norm(raw)
        if (code === match.home_team)  predicted = 'W'
        else if (code === match.away_team) predicted = 'L'
        else {
          console.warn(`  ⚠️  ${name}: unrecognized pick "${raw}" for ${match.home_team}-${match.away_team}`)
          continue
        }
      }

      picks.push({
        participant_id: p.id,
        match_id: match.id,
        predicted,
        entered_by: p.id,
      })
    }

    if (picks.length > 0) {
      const { error: pickErr } = await supabase
        .from('picks')
        .upsert(picks, { onConflict: 'participant_id,match_id' })

      if (pickErr) { console.error(`❌ picks for ${name}: ${pickErr.message}`); continue }
      pickCount += picks.length
    }

    console.log(`✅ ${name.padEnd(28)} token: ${token.padEnd(20)} ${picks.length} picks`)
  }

  console.log(`\n🎉 Done! ${pCount} participants, ${pickCount} picks imported.`)
}

main().catch(err => { console.error('❌', err.message); process.exit(1) })
