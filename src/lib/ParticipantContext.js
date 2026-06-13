import { createContext } from 'react'

// Participant context is separate from the provider component so React Fast
// Refresh can reload the provider cleanly during local development.
export const ParticipantCtx = createContext(null)
