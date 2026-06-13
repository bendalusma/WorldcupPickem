// Vercel serverless function — called by the daily cron (vercel.json) or manually.
/* global process */
// Fetches current World Cup match states from football-data.org and writes live
// scores plus final W/D/L results to Supabase. Skips any match where
// result_locked = true.
//
// Required env vars (set in Vercel dashboard, NOT prefixed with VITE_):
//   VITE_SUPABASE_URL        — your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
//   FOOTBALL_DATA_TOKEN       — football-data.org API token
//   CRON_SECRET               — any random string; protects the endpoint
import { createClient } from '@supabase/supabase-js'

function toRound(stage, matchday) {
  switch (stage) {
    case 'GROUP_STAGE':
      return matchday === 1 ? 'group_1' : matchday === 2 ? 'group_2' : 'group_3'
    case 'LAST_32':        return 'r32'
    case 'LAST_16':        return 'r16'
    case 'QUARTER_FINALS': return 'qf'
    case 'SEMI_FINALS':
    case 'THIRD_PLACE':
    case 'FINAL':          return 'final4'
    default:               return null
  }
}

function toResult(status, score) {
  if (status !== 'FINISHED') return null
  const h = score?.fullTime?.home
  const a = score?.fullTime?.away
  if (h == null || a == null) return null
  return h > a ? 'W' : h === a ? 'D' : 'L'
}

export default async function handler(req, res) {
  // Allow Vercel cron (which sends Authorization: Bearer <CRON_SECRET>)
  // or a manual call with ?secret=<CRON_SECRET> for easy browser testing.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.authorization ?? ''
    const querySecret = req.query?.secret ?? ''
    const bearer = authHeader.replace('Bearer ', '')
    if (bearer !== cronSecret && querySecret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const fdToken     = process.env.FOOTBALL_DATA_TOKEN

  if (!supabaseUrl || !serviceKey || !fdToken) {
    return res.status(500).json({ error: 'Missing env vars' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  // Fetch all WC matches from the API.
  const apiRes = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': fdToken },
  })
  if (!apiRes.ok) {
    return res.status(502).json({ error: `football-data.org ${apiRes.status}` })
  }
  const { matches } = await apiRes.json()

  // Get matches that Ronald has manually locked — never overwrite those.
  const { data: lockedRows } = await supabase
    .from('matches')
    .select('external_id')
    .eq('result_locked', true)
  const lockedIds = new Set((lockedRows ?? []).map(r => r.external_id))

  const writableMatches = matches.filter(m => !lockedIds.has(m.id))

  let updated = 0
  let skipped = 0

  for (const m of writableMatches) {
    const round = toRound(m.stage, m.matchday)
    if (!round) { skipped++; continue }
    const result = toResult(m.status, m.score)

    // Update live score/status for every unlocked match. Only finished matches
    // receive a W/D/L result; timed or in-progress matches keep result as null.
    const { error } = await supabase
      .from('matches')
      .update({
        result,
        status: m.status,
        home_score: m.score?.fullTime?.home ?? null,
        away_score: m.score?.fullTime?.away ?? null,
      })
      .eq('external_id', m.id)

    if (error) {
      console.error(`Failed to update match ${m.id}:`, error.message)
      skipped++
    } else {
      updated++
    }
  }

  const summary = { updated, skipped, total_checked: writableMatches.length }
  console.log('update-results:', summary)
  return res.status(200).json(summary)
}
