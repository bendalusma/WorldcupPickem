import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ROUND_LABELS } from '../lib/scoring'
import MatchRow from '../components/MatchRow'

const ROUND_ORDER = ['group_1', 'group_2', 'group_3', 'r32', 'r16', 'qf', 'final4']

function Resultats() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('kickoff_at', { ascending: true })
    if (error) setError(error.message)
    else setMatches(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
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
        <div key={round} className="round-block">
          <h3 className="round-title">{ROUND_LABELS[round]}</h3>
          {byRound[round].map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </div>
      ))}
    </section>
  )
}

export default Resultats
