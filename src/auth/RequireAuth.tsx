// Wraps private pages (onboarding, dashboard, history, upgrade).
// Signed-out visitors are sent to sign-in; after signing in they come back here.
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { supabaseConfigured } from '../lib/supabase'
import ConfigMissing from '../components/ConfigMissing'

export function LoadingScreen() {
  return (
    <div className="wrap">
      <div className="placeholder row" style={{ justifyContent: 'center' }} role="status">
        <div className="spinner" /> <span className="muted">Loading…</span>
      </div>
    </div>
  )
}

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (!supabaseConfigured) return <ConfigMissing />
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
