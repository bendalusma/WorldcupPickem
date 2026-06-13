import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { frDateKey, frDayLabel } from '../lib/format'
import { ROUND_LABELS } from '../lib/scoring'
import MatchRow from '../components/MatchRow'

// Fixed display order keeps the results screen aligned with the tournament flow
// instead of relying on whatever order Supabase happens to return grouped data in.
const ROUND_ORDER = ['group_1', 'group_2', 'group_3', 'r32', 'r16', 'qf', 'final4']
const LIVE_REFRESH_MS = 60_000

function buildPickBreakdowns(picks) {
  const breakdowns = {}

  // revealed_picks only exposes predictions after kickoff, so these totals are
  // safe to show publicly and can power the crowd-pick bar without leaking future picks.
  for (const pick of picks) {
    breakdowns[pick.match_id] ||= { W: 0, D: 0, L: 0, total: 0 }
    breakdowns[pick.match_id][pick.predicted] += 1
    breakdowns[pick.match_id].total += 1
  }

  return breakdowns
}

function groupMatchesByDay(matches) {
  const groupsByDay = new Map()

  // Matches arrive already sorted by kickoff, so this grouping preserves the
  // user's preferred chronological flow while inserting readable day dividers.
  for (const match of matches) {
    const key = frDateKey(match.kickoff_at)
    if (!groupsByDay.has(key)) {
      groupsByDay.set(key, {
        key,
        label: frDayLabel(match.kickoff_at),
        matches: [],
      })
    }
    groupsByDay.get(key).matches.push(match)
  }

  return [...groupsByDay.values()]
}

function RoundDropdown({ round, matches, pickBreakdowns, statsMatchIds }) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = `round-panel-${round}`
  const dayGroups = groupMatchesByDay(matches)
  const firstStatsMatchId = matches.find((match) => statsMatchIds.has(match.id))?.id

  // This small toggle component keeps each tournament round collapsed until the
  // user asks to inspect it, which makes the results screen easier to scan on a phone.
  return (
    <section className={`round-block${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        className="round-toggle"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="round-toggle-text">
          <span className="round-title">{ROUND_LABELS[round]}</span>
          <span className="round-count">{matches.length} match{matches.length > 1 ? 's' : ''}</span>
        </span>
        <span className="round-arrow" aria-hidden="true" />
      </button>

      {isOpen && (
        <div id={panelId} className="round-matches">
          {dayGroups.map((day) => (
            <div key={day.key} className="match-day-group">
              <div className="match-day-heading">
                <span>{day.label}</span>
              </div>
              {day.matches.map((m) => (
                <MatchRow
                  key={m.id}
                  match={m}
                  pickStats={statsMatchIds.has(m.id) ? (pickBreakdowns[m.id] ?? { W: 0, D: 0, L: 0, total: 0 }) : null}
                  showPickStatsHeading={m.id === firstStatsMatchId}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Resultats() {
  const [matches, setMatches] = useState([])
  const [pickBreakdowns, setPickBreakdowns] = useState({})
  const [revealedAt, setRevealedAt] = useState(0)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Manual reload keeps the "Rafraîchir" button explicit: it shows a loading
  // state immediately, then replaces the list with the latest Supabase data.
  async function load({ showLoading = true } = {}) {
    if (showLoading) setLoading(true)
    setError(null)
    const [matchesResult, picksResult] = await Promise.all([
      supabase
        .from('matches')
        .select('*')
        .order('kickoff_at', { ascending: true }),
      supabase
        .from('revealed_picks')
        .select('match_id, predicted'),
    ])

    if (matchesResult.error) {
      setError(matchesResult.error.message)
    } else if (picksResult.error) {
      setError(picksResult.error.message)
    } else {
      setMatches(matchesResult.data)
      setPickBreakdowns(buildPickBreakdowns(picksResult.data))
      setRevealedAt(Date.now())
      setLastUpdatedAt(new Date())
    }
    if (showLoading) setLoading(false)
  }

  useEffect(() => {
    let active = true

    // Initial load avoids a synchronous state update before the first async read,
    // which keeps React's lint rules happy while still showing the default loader.
    async function loadInitialMatches() {
      const [matchesResult, picksResult] = await Promise.all([
        supabase
          .from('matches')
          .select('*')
          .order('kickoff_at', { ascending: true }),
        supabase
          .from('revealed_picks')
          .select('match_id, predicted'),
      ])

      if (!active) return
      if (matchesResult.error) {
        setError(matchesResult.error.message)
      } else if (picksResult.error) {
        setError(picksResult.error.message)
      } else {
        setMatches(matchesResult.data)
        setPickBreakdowns(buildPickBreakdowns(picksResult.data))
        setRevealedAt(Date.now())
        setLastUpdatedAt(new Date())
      }
      setLoading(false)
    }

    loadInitialMatches()
    return () => { active = false }
  }, [])

  useEffect(() => {
    // The cron keeps Supabase fresh; this lightweight poll keeps the browser
    // synced with Supabase while someone is watching the results page.
    const timer = window.setInterval(() => {
      load({ showLoading: false })
    }, LIVE_REFRESH_MS)

    return () => window.clearInterval(timer)
  }, [])

  if (loading) {
    return (
      <section className="page">
        <h2>Résultats</h2>
        <p className="muted">Chargement des matchs…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="page">
        <h2>Résultats</h2>
        <p className="error">Erreur : {error}</p>
      </section>
    )
  }

  const byRound = {}
  for (const m of matches) {
    ;(byRound[m.round] ||= []).push(m)
  }
  const statsMatchIds = new Set(
    matches
      .filter((match) => new Date(match.kickoff_at).getTime() <= revealedAt)
      .map((match) => match.id),
  )

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h2>Résultats</h2>
          <p className="live-refresh-note">
            Mise à jour auto toutes les minutes
            {lastUpdatedAt && ` · ${lastUpdatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => load()}>Rafraîchir</button>
      </div>

      {ROUND_ORDER.filter((r) => byRound[r]?.length).map((round) => (
        <RoundDropdown
          key={round}
          round={round}
          matches={byRound[round]}
          pickBreakdowns={pickBreakdowns}
          statsMatchIds={statsMatchIds}
        />
      ))}
    </section>
  )
}

export default Resultats
