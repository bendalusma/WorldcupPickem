import { useContext } from 'react'
import { AuthContext } from './AuthContext'

// Hook used by pages/components that need the current Supabase session or admin
// status without importing the provider component itself.
export function useAuth() {
  return useContext(AuthContext)
}
