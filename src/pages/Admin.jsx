import { useState } from 'react'
import { useAuth } from '../lib/AuthProvider'
import ParticipantManager from '../components/ParticipantManager'

function AdminLogin() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) setError('Email ou mot de passe incorrect.')
    setBusy(false)
  }

  return (
    <section className="page">
      <h2>Admin</h2>
      <p className="muted">Connectez-vous pour gérer les participants et les résultats.</p>
      <form className="login-form" onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  )
}

function Admin() {
  const { session, isAdmin, loading, signOut } = useAuth()

  if (loading) {
    return (
      <section className="page">
        <h2>Admin</h2>
        <p className="muted">Chargement…</p>
      </section>
    )
  }

  if (!session) return <AdminLogin />

  if (!isAdmin) {
    return (
      <section className="page">
        <h2>Admin</h2>
        <p className="error">Ce compte n'est pas administrateur.</p>
        <button className="btn-secondary" onClick={signOut}>Se déconnecter</button>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="page-head">
        <h2>Admin — Participants</h2>
        <button className="btn-secondary" onClick={signOut}>Se déconnecter</button>
      </div>
      <ParticipantManager />
    </section>
  )
}

export default Admin
