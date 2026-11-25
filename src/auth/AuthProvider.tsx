// Keeps track of who is signed in, across every page.
// After sign-in it reads the student's own row in the `profiles` table
// (created automatically by the database when they sign up).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Profile = {
  id: string
  onboarding_step?: string | null
  plan?: string | null
  is_admin?: boolean | null
  [column: string]: unknown
}

type AuthState = {
  session: Session | null
  profile: Profile | null
  loading: boolean // true until we know whether someone is signed in
  profileError: string
  refreshProfile: () => Promise<Profile | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

// Reads the signed-in student's profile row. Row-level security means it can only ever return their own row.
// The database trigger creates the row with just id + email, so the first time we see it empty we copy in
// the name the student typed at sign-up (students are allowed to update their own full_name).
async function loadProfile(userId: string, signUpName?: string): Promise<{ profile: Profile | null; error: string }> {
  if (!supabase) return { profile: null, error: 'not_configured' }
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) {
    console.error('Could not read profile', error)
    return { profile: null, error: error.message }
  }
  const profile = (data as Profile) ?? null
  if (profile && !profile.full_name && signUpName) {
    const { error: upErr } = await supabase.from('profiles').update({ full_name: signUpName }).eq('id', userId)
    if (!upErr) profile.full_name = signUpName
  }
  return { profile, error: '' }
}

const nameFrom = (s: Session) => (s.user.user_metadata?.full_name as string | undefined) || undefined

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState('')
  const [loading, setLoading] = useState(Boolean(supabase))

  const refreshProfile = useCallback(async () => {
    const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
    const s = data.session
    if (!s) {
      setProfile(null)
      return null
    }
    const r = await loadProfile(s.user.id, nameFrom(s))
    setProfile(r.profile)
    setProfileError(r.error)
    return r.profile
  }, [])

  useEffect(() => {
    if (!supabase) return
    let alive = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return
      setSession(data.session)
      if (data.session) {
        const r = await loadProfile(data.session.user.id, nameFrom(data.session))
        if (!alive) return
        setProfile(r.profile)
        setProfileError(r.error)
      }
      setLoading(false)
    })

    // Fires on sign-in, sign-out (including sign-out in another tab) and token refresh.
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_OUT' || !s) {
        setProfile(null)
        return
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Load the profile outside this callback (Supabase recommends not awaiting inside it).
        setTimeout(async () => {
          const r = await loadProfile(s.user.id, nameFrom(s))
          if (!alive) return
          setProfile(r.profile)
          setProfileError(r.error)
        }, 0)
      }
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading, profileError, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

// Where a signed-in student should land: onboarding until it's finished, then the dashboard.
export function homeFor(profile: Profile | null): string {
  return profile?.onboarding_step === 'done' ? '/dashboard' : '/onboarding'
}
