import { useContext } from 'react'
import { ParticipantCtx } from './ParticipantContext'

// Shared hook for screens that need the current magic-link participant session.
export function useParticipant() {
  return useContext(ParticipantCtx)
}
