import { createContext } from 'react'

// Shared auth context lives outside the provider component file so React Fast
// Refresh can treat AuthProvider.jsx as a component-only module.
export const AuthContext = createContext(null)
