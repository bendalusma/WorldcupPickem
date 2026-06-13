import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { frDateKey, frDayLabel } from '../lib/format'
import { ROUND_LABELS } from '../lib/scoring'
import MatchRow from '../components/MatchRow'

// Fixed display order keeps the results screen aligned with the tournament flow
// instead of relying on whatever order Supabase happens to return grouped data in.
const ROUND_ORDER = ['group_1', 'group_2', 'group_3', 'r32', 'r16', 'qf', 'final4']

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

function RoundDropdown({ round, matches }) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = `round-panel-${round}`
  const dayGroups = groupMatchesByDay(matches)

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
                <MatchRow key={m.id} match={m} />
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Manual reload keeps the "Rafraîchir" button explicit: it shows a loading
  // state immediately, then replaces the list with the latest Supabase data.
  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('kickoff_at', { ascending: true })
    if (error) setError(error.message)
    else setMatches(data)
    setLoading(false)
  }

  useEffect(() => {
    let active = true

    // Initial load avoids a synchronous state update before the first async read,
    // which keeps React's lint rules happy while still showing the default loader.
    async function loadInitialMatches() {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('kickoff_at', { ascending: true })

      if (!active) return
      if (error) setError(error.message)
      else setMatches(data)
      setLoading(false)
    }

    loadInitialMatches()
    return () => { active = false }
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

  return (
    <section className="page">
      <div className="page-head">
        <h2>Résultats</h2>
        <button className="btn-secondary" onClick={load}>Rafraîchir</button>
      </div>

      {ROUND_ORDER.filter((r) => byRound[r]?.length).map((round) => (
        <RoundDropdown key={round} round={round} matches={byRound[round]} />
      ))}
    </section>
  )
}

export default Resultats
