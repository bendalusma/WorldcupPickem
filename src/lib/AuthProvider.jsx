import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Track the Supabase login session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Whenever the session changes, check whether this user is the admin.
  useEffect(() => {
    let active = true
    async function checkAdmin() {
      if (!session) {
        if (active) { setIsAdmin(false); setLoading(false) }
        return
      }
      setLoading(true)
      const { data } = await supabase
        .from('participants')
        .select('is_admin')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()
      if (active) { setIsAdmin(!!data?.is_admin); setLoading(false) }
    }
    checkAdmin()
    return () => { active = false }
  }, [session])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
