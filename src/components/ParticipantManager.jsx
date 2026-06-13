import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function magicLink(token) {
  return `${window.location.origin}/p/${token}`
}

export default function ParticipantManager() {
  const [participants, setParticipants] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('participants')
      .select('id, name, token, is_admin')
      .order('name', { ascending: true })
    if (error) setError(error.message)
    else setParticipants(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addParticipant(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setError(null)
    const { error } = await supabase.from('participants').insert({ name: trimmed })
    if (error) { setError(error.message); return }
    setName('')
    load()
  }

  async function removeParticipant(id) {
    if (!window.confirm('Supprimer ce participant ?')) return
    const { error } = await supabase.from('participants').delete().eq('id', id)
    if (error) { setError(error.message); return }
    load()
  }

  async function copyLink(token) {
    await navigator.clipboard.writeText(magicLink(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 1500)
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditName(p.name)
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
  }

  async function saveEdit(p) {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === p.name) { cancelEdit(); return }
    setError(null)
    const { error } = await supabase
      .from('participants')
      .update({ name: trimmed })
      .eq('id', p.id)
    if (error) { setError(error.message); return }
    cancelEdit()
    load()
  }

  const players = participants.filter((p) => !p.is_admin)

  return (
    <div>
      <form className="add-form" onSubmit={addParticipant}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du participant"
          aria-label="Nom du participant"
        />
        <button type="submit" className="btn-primary">Ajouter</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="muted">Chargement…</p>
      ) : (
        <>
          <p className="muted">{players.length} participant(s)</p>
          <ul className="participant-list">
            {players.map((p) => (
              <li key={p.id} className="participant-row">
                {editingId === p.id ? (
                  <>
                    <input
                      className="edit-name-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(p)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                    <div className="participant-actions">
                      <button className="btn-primary" onClick={() => saveEdit(p)}>Sauver</button>
                      <button className="btn-secondary" onClick={cancelEdit}>Annuler</button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="participant-name">{p.name}</span>
                    <div className="participant-actions">
                      <button className="btn-secondary" onClick={() => copyLink(p.token)}>
                        {copied === p.token ? 'Copié ✓' : 'Copier le lien'}
                      </button>
                      <button className="btn-secondary" onClick={() => startEdit(p)}>Modifier</button>
                      <button className="btn-danger" onClick={() => removeParticipant(p.id)}>Suppr.</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
