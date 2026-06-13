import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useParticipant } from '../lib/useParticipant'

export default function MagicLink() {
  const { token } = useParams()
  const { login } = useParticipant()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    // Validate the URL token through Supabase, then store the returned
    // participant in the lightweight browser session used by magic links.
    async function validateToken() {
      if (!token) {
        if (active) setError('Lien invalide.')
        return
      }

      const { data, error } = await supabase
        .rpc('get_participant_by_token', { p_token: token })

      if (active) {
        if (error || !data?.length) {
          setError('Ce lien est invalide ou expiré.')
          return
        }
        login(data[0])
        navigate('/pronostics', { replace: true })
      }
    }

    validateToken()
    return () => { active = false }
  }, [login, navigate, token])

  if (error) return (
    <section className="page">
      <h2>Lien invalide</h2>
      <p className="error">{error}</p>
      <p className="muted">Contactez Ronald pour recevoir votre lien personnel.</p>
    </section>
  )

  return (
    <section className="page">
      <p className="muted">Connexion en cours…</p>
    </section>
  )
}
