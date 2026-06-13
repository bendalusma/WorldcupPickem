import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { frDateTime } from '../lib/format'
import { ROUND_LABELS } from '../lib/scoring'

const PICK_COLUMNS = [
  { key: 'W', label: 'Victoire maison', tone: 'home' },
  { key: 'D', label: 'Nul', tone: 'draw' },
  { key: 'L', label: 'Victoire visiteur', tone: 'away' },
]
const ROUND_ORDER = ['group_1', 'group_2', 'group_3', 'r32', 'r16', 'qf', 'final4']

function Crest({ url, code }) {
  if (!url) return <span className="pick-team-crest pick-team-crest-empty" aria-hidden="true" />
  return <img className="pick-team-crest" src={url} alt={code} width="24" height="24" loading="lazy" />
}

function emptyBuckets() {
  return { W: [], D: [], L: [] }
}

function groupLabel(match) {
  if (match.match_group?.startsWith('GROUP')) {
    const letter = match.match_group.split(/[_\s-]+/).pop()
    return `Groupe ${letter}`
  }
  return ROUND_LABELS[match.round] ?? match.round
}

function groupSortKey(group) {
  if (group.startsWith('Groupe ')) return `0-${group.slice(-1)}`
  const roundIndex = ROUND_ORDER.findIndex((round) => ROUND_LABELS[round] === group)
  return `1-${roundIndex === -1 ? 99 : roundIndex}`
}

function groupMatches(matches) {
  const groups = new Map()

  // Group-level accordions make this transparency view navigable once every
  // match has its own name list.
  for (const match of matches) {
    const label = groupLabel(match)
    if (!groups.has(label)) groups.set(label, { label, matches: [] })
    groups.get(label).matches.push(match)
  }

  return [...groups.values()].sort((a, b) => groupSortKey(a.label).localeCompare(groupSortKey(b.label)))
}

function buildPickBuckets(picks, participants) {
  const namesById = new Map(participants.map((participant) => [participant.id, participant.name]))
  const bucketsByMatch = {}

  // revealed_picks only contains picks for matches whose kickoff has passed, so
  // this page can show names transparently without exposing future predictions.
  for (const pick of picks) {
    bucketsByMatch[pick.match_id] ||= emptyBuckets()
    bucketsByMatch[pick.match_id][pick.predicted].push({
      id: pick.participant_id,
      name: namesById.get(pick.participant_id) ?? 'Participant',
    })
  }

  for (const buckets of Object.values(bucketsByMatch)) {
    for (const key of ['W', 'D', 'L']) {
      buckets[key].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    }
  }

  return bucketsByMatch
}

function PickColumn({ column, teamCode, names }) {
  const fillHeight = Math.max(10, Math.min(100, names.length * 9))

  return (
    <div className={`pick-choice-column pick-choice-${column.tone}`}>
      <span className="pick-choice-fill" style={{ height: `${fillHeight}%` }} aria-hidden="true" />
      <div className="pick-choice-head">
        <span>{teamCode ?? column.label}</span>
        <strong>{names.length}</strong>
      </div>
      {names.length > 0 ? (
        <div className="pick-name-list">
          {names.map((person) => (
            <span key={person.id} className="pick-name-chip">{person.name}</span>
          ))}
        </div>
      ) : (
        <p className="pick-name-empty">Personne</p>
      )}
    </div>
  )
}

function resultText(match) {
  if (match.home_score != null && match.away_score != null) {
    return `${match.home_score} - ${match.away_score}`
  }
  if (match.result === 'W') return `${match.home_team} gagne`
  if (match.result === 'D') return 'Nul'
  if (match.result === 'L') return `${match.away_team} gagne`
  return null
}

function PickMatchCard({ match, buckets }) {
  const [isOpen, setIsOpen] = useState(false)
  const columns = {
    W: match.home_team,
    D: 'Nul',
    L: match.away_team,
  }
  const total = buckets.W.length + buckets.D.length + buckets.L.length
  const result = resultText(match)

  return (
    <article className="pick-match-card">
      <button
        type="button"
        className="pick-match-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <div className="pick-match-teams">
          <span className="pick-team">
            <Crest url={match.home_crest} code={match.home_team} />
            <strong>{match.home_team}</strong>
          </span>
          <span className="pick-match-score">{result ?? 'vs'}</span>
          <span className="pick-team">
            <Crest url={match.away_crest} code={match.away_team} />
            <strong>{match.away_team}</strong>
          </span>
        </div>
        <span className="pick-match-meta">{frDateTime(match.kickoff_at)} · {total} votes</span>
        <span className="pick-match-arrow" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="pick-choice-grid">
          {PICK_COLUMNS.map((column) => (
            <PickColumn
              key={column.key}
              column={column}
              teamCode={columns[column.key]}
              names={buckets[column.key]}
            />
          ))}
        </div>
      )}
    </article>
  )
}

function PickGroup({ group, pickBuckets }) {
  const [isOpen, setIsOpen] = useState(false)
  const voteCount = group.matches.reduce((total, match) => {
    const buckets = pickBuckets[match.id] ?? emptyBuckets()
    return total + buckets.W.length + buckets.D.length + buckets.L.length
  }, 0)

  return (
    <section className={`pick-group${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        className="pick-group-toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>
          <strong>{group.label}</strong>
          <small>{group.matches.length} match{group.matches.length > 1 ? 's' : ''} · {voteCount} votes</small>
        </span>
        <span className="pick-match-arrow" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="pick-match-list">
          {group.matches.map((match) => (
            <PickMatchCard
              key={match.id}
              match={match}
              buckets={pickBuckets[match.id] ?? emptyBuckets()}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function Picks() {
  const [matches, setMatches] = useState([])
  const [pickBuckets, setPickBuckets] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    async function loadPicks() {
      const [matchesResult, picksResult, participantsResult] = await Promise.all([
        supabase
          .from('matches')
          .select('id, round, match_group, home_team, away_team, home_crest, away_crest, kickoff_at, result, home_score, away_score, status')
          .lte('kickoff_at', new Date().toISOString())
          .order('kickoff_at', { ascending: true }),
        supabase
          .from('revealed_picks')
          .select('match_id, participant_id, predicted'),
        supabase
          .from('participants_public')
          .select('id, name'),
      ])

      if (!active) return
      if (matchesResult.error) {
        setError(matchesResult.error.message)
      } else if (picksResult.error) {
        setError(picksResult.error.message)
      } else if (participantsResult.error) {
        setError(participantsResult.error.message)
      } else {
        setMatches(matchesResult.data)
        setPickBuckets(buildPickBuckets(picksResult.data, participantsResult.data))
      }
      setLoading(false)
    }

    loadPicks()
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <section className="page">
        <h2>Picks</h2>
        <p className="muted">Chargement des choix révélés…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="page">
        <h2>Picks</h2>
        <p className="error">Erreur : {error}</p>
      </section>
    )
  }

  const groups = groupMatches(matches)

  return (
    <section className="page">
      <h2>Picks</h2>
      <p className="muted">Les choix sont visibles seulement après le coup d'envoi du match.</p>

      <div className="pick-group-list">
        {groups.map((group) => (
          <PickGroup key={group.label} group={group} pickBuckets={pickBuckets} />
        ))}
      </div>

      {matches.length === 0 && (
        <div className="placeholder-card">Aucun choix révélé pour le moment.</div>
      )}
    </section>
  )
}

export default Picks
