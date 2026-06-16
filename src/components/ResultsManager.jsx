import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ROUND_LABELS } from '../lib/scoring'
import { frDateTime } from '../lib/format'

const ROUND_ORDER = ['group_1', 'group_2', 'group_3', 'r32', 'r16', 'qf', 'final4']

function Crest({ url, code }) {
  // The admin rows use the same crest treatment as the player-facing screens so
  // the match header reads like a football fixture instead of a plain text list.
  if (!url) return <span className="crest crest-empty" aria-hidden="true" />
  return <img className="crest" src={url} alt={code} width="24" height="24" loading="lazy" />
}

function ResultRow({ match, onSet }) {
  const [saving, setSaving] = useState(false)

  async function set(result) {
    setSaving(true)
    await onSet(match.id, result)
    setSaving(false)
  }

  return (
    <div className="result-row">
      <div className="result-teams">
        <span className="result-team result-team-home">
          <span className="team-code">{match.home_team}</span>
          <Crest url={match.home_crest} code={match.home_team} />
        </span>
        <span className="result-kickoff">{frDateTime(match.kickoff_at)}</span>
        <span className="result-team result-team-away">
          <Crest url={match.away_crest} code={match.away_team} />
          <span className="team-code">{match.away_team}</span>
        </span>
      </div>
      <div className="pick-btns">
        <button
          className={`pick-btn${match.result === 'W' ? ' active' : ''}`}
          onClick={() => set('W')}
          disabled={saving}
        >{match.home_team} gagne</button>
        <button
          className={`pick-btn pick-btn-draw${match.result === 'D' ? ' active' : ''}`}
          onClick={() => set('D')}
          disabled={saving}
        >Nul</button>
        <button
          className={`pick-btn${match.result === 'L' ? ' active' : ''}`}
          onClick={() => set('L')}
          disabled={saving}
        >{match.away_team} gagne</button>
      </div>
    </div>
  )
}

export default function ResultsManager() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    // Initial load waits for the async Supabase query before setting state, which
    // avoids React's set-state-in-effect warning while keeping the loading UI.
    async function loadInitialResults() {
      const { data, error } = await supabase
        .from('matches')
        .select('id, round, home_team, away_team, home_crest, away_crest, kickoff_at, result, result_locked')
        .lte('kickoff_at', new Date().toISOString())
        .order('kickoff_at')

      if (!active) return
      if (error) setError(error.message)
      else setMatches(data)
      setLoading(false)
    }

    loadInitialResults()
    return () => { active = false }
  }, [])

  async function setResult(matchId, result) {
    const { error } = await supabase
      .from('matches')
      .update({ result, result_locked: true })
      .eq('id', matchId)
    if (error) { alert(error.message); return }
    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, result, result_locked: true } : m
    ))
  }

  if (loading) return <p className="muted">Chargement…</p>
  if (error) return <p className="error">Erreur : {error}</p>

  const byRound = {}
  for (const m of matches) (byRound[m.round] ||= []).push(m)

  const pending = matches.filter(m => !m.result).length
  const done = matches.filter(m => m.result).length

  return (
    <div>
      <p className="muted">{done} résultat(s) saisi(s) · {pending} en attente</p>
      {ROUND_ORDER.filter(r => byRound[r]?.length).map(round => (
        <div key={round} className="round-block">
          <p className="round-title">{ROUND_LABELS[round]}</p>
          {byRound[round].map(m => (
            <ResultRow key={m.id} match={m} onSet={setResult} />
          ))}
        </div>
      ))}
      {matches.length === 0 && (
        <p className="muted">Aucun match terminé pour l'instant.</p>
      )}
    </div>
  )
}
