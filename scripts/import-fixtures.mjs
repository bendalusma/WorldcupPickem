// Import World Cup fixtures + live scores from football-data.org into Supabase.
// Run with:  npm run import-fixtures
// Re-running is safe: it updates existing rows (matched on the API match id) and
// backfills knockout matchups as the bracket fills in.
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const token = process.env.FOOTBALL_DATA_TOKEN

if (!url || !serviceKey || serviceKey.includes('PASTE_')) {
  console.error('❌ Missing Supabase URL or SERVICE_ROLE key in .env')
  process.exit(1)
}
if (!token || token.includes('PASTE_')) {
  console.error('❌ Missing FOOTBALL_DATA_TOKEN in .env')
  process.exit(1)
}

// service_role key bypasses Row-Level Security — server-side use only.
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

// --- football-data stage + matchday  ->  our round enum -------------------
function toRound(stage, matchday) {
  switch (stage) {
    case 'GROUP_STAGE':
      return matchday === 1 ? 'group_1' : matchday === 2 ? 'group_2' : 'group_3'
    case 'LAST_32': return 'r32'
    case 'LAST_16': return 'r16'
    case 'QUARTER_FINALS': return 'qf'
    case 'SEMI_FINALS':
    case 'THIRD_PLACE':
    case 'FINAL':
      return 'final4'
    default:
      return null
  }
}

const POINTS = { group_1: 1, group_2: 1, group_3: 1, r32: 2, r16: 3, qf: 4, final4: 0 }

// Derive W / D / L (home perspective) from the full-time score, once finished.
function toResult(status, score) {
  if (status !== 'FINISHED') return null
  const h = score?.fullTime?.home
  const a = score?.fullTime?.away
  if (h == null || a == null) return null
  return h > a ? 'W' : h === a ? 'D' : 'L'
}

console.log('Fetching World Cup matches from football-data.org …')
const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
  headers: { 'X-Auth-Token': token },
})
if (!res.ok) {
  console.error('❌ API error', res.status, await res.text())
  process.exit(1)
}
const { matches } = await res.json()
console.log(`Received ${matches.length} matches.`)

// --- Build team rows (dedup by code) and match rows ----------------------
const teamsByCode = new Map()
const matchRows = []
let skipped = 0

for (const m of matches) {
  const round = toRound(m.stage, m.matchday)
  if (!round) { skipped++; continue }

  const home = m.homeTeam ?? {}
  const away = m.awayTeam ?? {}

  for (const t of [home, away]) {
    if (t.tla && !teamsByCode.has(t.tla)) {
      teamsByCode.set(t.tla, { code: t.tla, name: t.name ?? t.tla, crest_url: t.crest ?? null, external_id: t.id ?? null })
    }
  }

  matchRows.push({
    external_id: m.id,
    round,
    home_team: home.tla ?? 'TBD',
    away_team: away.tla ?? 'TBD',
    home_name: home.name ?? 'À déterminer',
    away_name: away.name ?? 'À déterminer',
    home_crest: home.crest ?? null,
    away_crest: away.crest ?? null,
    kickoff_at: m.utcDate,
    status: m.status,
    match_group: m.group ?? null,
    home_score: m.score?.fullTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? null,
    result: toResult(m.status, m.score),
    points_value: POINTS[round],
  })
}

// Don't overwrite results an admin has manually locked.
const { data: lockedRows } = await supabase
  .from('matches')
  .select('external_id')
  .eq('result_locked', true)
const lockedIds = new Set((lockedRows ?? []).map((r) => r.external_id))
for (const row of matchRows) {
  if (lockedIds.has(row.external_id)) {
    delete row.result
    delete row.home_score
    delete row.away_score
    delete row.status
  }
}

// --- Write to Supabase ----------------------------------------------------
const teamRows = [...teamsByCode.values()]
const { error: teamErr } = await supabase.from('teams').upsert(teamRows, { onConflict: 'code' })
if (teamErr) { console.error('❌ teams upsert failed:', teamErr.message); process.exit(1) }
console.log(`✅ Upserted ${teamRows.length} teams.`)

const { error: matchErr } = await supabase.from('matches').upsert(matchRows, { onConflict: 'external_id' })
if (matchErr) { console.error('❌ matches upsert failed:', matchErr.message); process.exit(1) }
console.log(`✅ Upserted ${matchRows.length} matches (skipped ${skipped} unmapped).`)
