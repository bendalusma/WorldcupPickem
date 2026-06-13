import { useCallback, useState } from 'react'
import { ParticipantCtx } from './ParticipantContext'

function readStoredParticipant() {
  try {
    const raw = sessionStorage.getItem('participant')
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    console.warn('Participant session could not be restored.', err)
    return null
  }
}

export function ParticipantProvider({ children }) {
  // Read sessionStorage once during initial state creation so the first render
  // already knows whether a participant is logged in via magic link.
  const [participant, setParticipant] = useState(readStoredParticipant)
  const loading = false

  const login = useCallback((p) => {
    sessionStorage.setItem('participant', JSON.stringify(p))
    setParticipant(p)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('participant')
    setParticipant(null)
  }, [])

  return (
    <ParticipantCtx.Provider value={{ participant, loading, login, logout }}>
      {children}
    </ParticipantCtx.Provider>
  )
}
