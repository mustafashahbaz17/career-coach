// /signin — email + password sign-in. Afterwards: onboarding if not finished, otherwise the dashboard.
// Uses Supabase Auth only. Reads the student's `profiles` row (onboarding_step). Calls no n8n webhooks.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import { supabase, supabaseConfigured } from '../../lib/supabase'
import { homeFor, useAuth } from '../../auth/AuthProvider'
import { friendlyAuthError } from '../../auth/authErrors'
import ConfigMissing from '../../components/ConfigMissing'

export default function SignIn() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Already signed in (e.g. came back from the email-confirmation link)? Go straight on.
  useEffect(() => {
    // (Skipped while the form is submitting — onSubmit does the redirect once the profile has loaded.)
    if (!loading && session && !busy) {
      const home = homeFor(profile)
      navigate(home === '/dashboard' && from ? from : home, { replace: true })
    }
  }, [loading, session, profile, from, navigate, busy])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    setBusy(true)
    const { error: err } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
    if (err) {
      setBusy(false)
      setError(friendlyAuthError(err))
      return
    }
    const p = await refreshProfile()
    setBusy(false)
    const home = homeFor(p)
    navigate(home === '/dashboard' && from ? from : home, { replace: true })
  }

  if (!supabaseConfigured) return <AuthFrame><ConfigMissing /></AuthFrame>

  return (
    <AuthFrame>
      <h2>Sign in</h2>
      <p className="muted">Welcome back.</p>
      {from && <div className="note" style={{ marginTop: 12 }}>Please sign in to continue.</div>}
      <form className="stack-m" style={{ marginTop: 16 }} onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="label">Email</span>
          <input className="inp" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">Password</span>
          <input className="inp" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="err" role="alert">{error}</div>}
        <button className="btn pri full" disabled={busy}>
          {busy ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
        </button>
        <div className="row between small">
          <Link to="/forgot-password">Forgot password?</Link>
          <Link to="/signup">Create an account</Link>
        </div>
      </form>
    </AuthFrame>
  )
}
