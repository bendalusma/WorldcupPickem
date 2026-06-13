import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useParticipant } from '../lib/useParticipant'
import { ROUND_LABELS } from '../lib/scoring'
import { frDateTime } from '../lib/format'
import { firstName } from '../lib/names'

const ROUND_ORDER = ['group_1', 'group_2', 'group_3', 'r32', 'r16', 'qf', 'final4']

function pickLabel(predicted, match) {
  if (predicted === 'W') return `${match.home_team} gagne`
  if (predicted === 'D') return 'Nul'
  if (predicted === 'L') return `${match.away_team} gagne`
  return predicted
}

function Crest({ url, code }) {
  if (!url) return null
  return <img className="crest" src={url} alt={code} width="22" height="22" loading="lazy" />
}

function PickCard({ match, myPick, onPick, saving }) {
  const locked = new Date(match.kickoff_at) <= new Date()
  const busy = saving === match.id

  return (
    <div className="pick-card">
      <div className="pick-teams">
        <div className="pick-team-home">
          <Crest url={match.home_crest} code={match.home_team} />
          <span className="team-code">{match.home_team}</span>
        </div>
        <span className="pick-kickoff">{frDateTime(match.kickoff_at)}</span>
        <div className="pick-team-away">
          <span className="team-code">{match.away_team}</span>
          <Crest url={match.away_crest} code={match.away_team} />
        </div>
      </div>

      {locked ? (
        <div className="pick-locked">
          🔒&nbsp;
          {myPick
            ? <span className="pick-value">{pickLabel(myPick, match)}</span>
            : <span>(pas de pronostic)</span>}
        </div>
      ) : (
        <div className="pick-btns">
          <button
            className={`pick-btn${myPick === 'W' ? ' active' : ''}`}
            onClick={() => onPick(match.id, 'W')}
            disabled={busy}
          >{match.home_team}</button>
          <button
            className={`pick-btn pick-btn-draw${myPick === 'D' ? ' active' : ''}`}
            onClick={() => onPick(match.id, 'D')}
            disabled={busy}
          >Nul</button>
          <button
            className={`pick-btn${myPick === 'L' ? ' active' : ''}`}
            onClick={() => onPick(match.id, 'L')}
            disabled={busy}
          >{match.away_team}</button>
        </div>
      )}
    </div>
  )
}

function PicksScreen({ participant }) {
  const [matches, setMatches] = useState([])
  const [picks, setPicks] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      const [matchRes, pickRes] = await Promise.all([
        supabase.from('matches').select('*').order('kickoff_at'),
        supabase.rpc('get_my_picks', { p_token: participant.token }),
      ])
      if (!active) return
      if (matchRes.error) { setError(matchRes.error.message); setLoading(false); return }
      if (pickRes.error) { setError(pickRes.error.message); setLoading(false); return }
      setMatches(matchRes.data.filter(m => m.home_team && m.away_team))
      const map = {}
      for (const pk of pickRes.data ?? []) map[pk.match_id] = pk.predicted
      setPicks(map)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [participant.token])

  async function onPick(matchId, predicted) {
    setSaving(matchId)
    const { error } = await supabase.rpc('submit_pick', {
      p_token: participant.token,
      p_match_id: matchId,
      p_predicted: predicted,
    })
    if (error) {
      alert(error.message)
    } else {
      setPicks(prev => ({ ...prev, [matchId]: predicted }))
    }
    setSaving(null)
  }

  if (loading) return <p className="muted">Chargement…</p>
  if (error) return <p className="error">Erreur : {error}</p>

  const byRound = {}
  for (const m of matches) (byRound[m.round] ||= []).push(m)

  return (
    <>
      {ROUND_ORDER.filter(r => byRound[r]?.length).map(round => (
        <div key={round} className="round-block">
          <p className="round-title">{ROUND_LABELS[round]}</p>
          {byRound[round].map(m => (
            <PickCard
              key={m.id}
              match={m}
              myPick={picks[m.id]}
              onPick={onPick}
              saving={saving}
            />
          ))}
        </div>
      ))}
    </>
  )
}

export default function Pronostics() {
  const { participant, loading, logout } = useParticipant()

  if (loading) return (
    <section className="page">
      <h2>Mes Pronostics</h2>
      <p className="muted">Chargement…</p>
    </section>
  )

  if (!participant) return (
    <section className="page">
      <h2>Mes Pronostics</h2>
      <p className="muted">
        Pour accéder à vos pronostics, ouvrez votre lien personnel envoyé par Ronald sur WhatsApp.
      </p>
      <div className="placeholder-card" style={{ marginTop: 16 }}>
        Exemple&nbsp;: <code>https://&lt;app&gt;/p/votre-prenom</code>
      </div>
    </section>
  )

  return (
    <section className="page">
      <div className="page-head">
        <h2>Mes Pronostics</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ fontSize: 14 }}>{firstName(participant.name)}</span>
          <button className="btn-secondary" onClick={logout}>Changer</button>
        </div>
      </div>
      <PicksScreen participant={participant} />
    </section>
  )
}
