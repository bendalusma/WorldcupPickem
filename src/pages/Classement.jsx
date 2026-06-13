import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ROUND_POINTS } from '../lib/scoring'
import { firstName } from '../lib/names'

function computeScores(participants, matches, picks) {
  const matchById = Object.fromEntries(matches.map(m => [m.id, m]))
  const scores = {}
  for (const p of participants) {
    scores[p.id] = { name: p.name, tour1: 0, tour2: 0, tour3: 0, rondeFinale: 0, total: 0 }
  }
  for (const pk of picks) {
    const m = matchById[pk.match_id]
    if (!m || !m.result || pk.predicted !== m.result) continue
    const pts = ROUND_POINTS[m.round]
    if (!pts) continue
    const row = scores[pk.participant_id]
    if (!row) continue
    if (m.round === 'group_1')      row.tour1 += pts
    else if (m.round === 'group_2') row.tour2 += pts
    else if (m.round === 'group_3') row.tour3 += pts
    else                            row.rondeFinale += pts
    row.total += pts
  }
  return Object.values(scores)
}

const COLS = [
  { key: 'tour1',       label: 'T1',    title: 'Tour 1' },
  { key: 'tour2',       label: 'T2',    title: 'Tour 2' },
  { key: 'tour3',       label: 'T3',    title: 'Tour 3' },
  { key: 'rondeFinale', label: 'RF',    title: 'Ronde Finale' },
  { key: 'total',       label: 'Total', title: 'Total général' },
]

export default function Classement() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sortBy, setSortBy] = useState('total')

  useEffect(() => {
    let active = true
    async function load() {
      const [pRes, mRes, pkRes] = await Promise.all([
        supabase.from('participants_public').select('id, name').eq('is_admin', false),
        supabase.from('matches').select('id, round, result'),
        supabase.from('revealed_picks').select('participant_id, match_id, predicted'),
      ])
      if (!active) return
      if (pRes.error)  { setError(pRes.error.message);  setLoading(false); return }
      if (mRes.error)  { setError(mRes.error.message);  setLoading(false); return }
      if (pkRes.error) { setError(pkRes.error.message); setLoading(false); return }
      setRows(computeScores(pRes.data, mRes.data, pkRes.data))
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  if (loading) return (
    <section className="page">
      <h2>Classement</h2>
      <p className="muted">Chargement…</p>
    </section>
  )

  if (error) return (
    <section className="page">
      <h2>Classement</h2>
      <p className="error">Erreur : {error}</p>
    </section>
  )

  const noResults = rows.every(r => r.total === 0)
  const sorted = [...rows].sort((a, b) => b[sortBy] - a[sortBy] || a.name.localeCompare(b.name))

  return (
    <section className="page">
      <h2>Classement</h2>
      {noResults ? (
        <p className="muted">Les résultats des matchs ne sont pas encore saisis.</p>
      ) : (
        <div className="table-wrap">
          <table className="leaderboard">
            <thead>
              <tr>
                <th className="lb-rank">#</th>
                <th className="lb-name">Nom</th>
                {COLS.map(c => (
                  <th
                    key={c.key}
                    title={c.title}
                    className={`lb-pts${sortBy === c.key ? ' lb-sort' : ''}`}
                    onClick={() => setSortBy(c.key)}
                  >{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr key={row.name} className={i === 0 && sortBy === 'total' ? 'lb-leader' : ''}>
                  <td className="lb-rank">{i + 1}</td>
                  <td className="lb-name">{firstName(row.name)}</td>
                  {COLS.map(c => (
                    <td key={c.key} className={`lb-pts${sortBy === c.key ? ' lb-sort' : ''}`}>
                      {row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        T1 = Tour 1 · T2 = Tour 2 · T3 = Tour 3 · RF = Ronde Finale · Cliquez sur une colonne pour trier
      </p>
    </section>
  )
}
