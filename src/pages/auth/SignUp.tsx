// /signup — create an account with name, email and password.
// Supabase Auth creates the user; the database then creates their `profiles` row automatically.
// If email confirmation is switched on in Supabase, we ask the student to check their inbox.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import { supabase, supabaseConfigured } from '../../lib/supabase'
import { homeFor, useAuth } from '../../auth/AuthProvider'
import { friendlyAuthError, passwordProblem } from '../../auth/authErrors'
import ConfigMissing from '../../components/ConfigMissing'

export default function SignUp() {
  const { session, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checkInbox, setCheckInbox] = useState('')

  // Already signed in? Go straight on. (Skipped while submitting — onSubmit handles that redirect.)
  useEffect(() => {
    if (!loading && session && !busy) navigate(homeFor(profile), { replace: true })
  }, [loading, session, profile, navigate, busy])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const cleanEmail = email.trim().toLowerCase()
    if (!name.trim()) return setError('Please add your name.')
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError('That doesn’t look like a valid email address.')
    const pw = passwordProblem(password)
    if (pw) return setError(pw)

    setBusy(true)
    const { data, error: err } = await supabase!.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: `${window.location.origin}/signin`,
      },
    })
    setBusy(false)
    if (err) return setError(friendlyAuthError(err))

    // With email confirmation on, Supabase hides "email already used" by returning a user with no identities.
    if (data.user && data.user.identities && data.user.identities.length === 0)
      return setError('An account with this email already exists — sign in instead.')

    if (data.session) {
      const p = await refreshProfile()
      navigate(homeFor(p), { replace: true })
    } else {
      setCheckInbox(cleanEmail)
    }
  }

  if (!supabaseConfigured) return <AuthFrame><ConfigMissing /></AuthFrame>

  if (checkInbox)
    return (
      <AuthFrame>
        <h2>Check your inbox</h2>
        <div className="okbox" role="status" style={{ marginTop: 14 }}>
          We sent a confirmation link to <b>{checkInbox}</b>. Open it to finish creating your account, then sign in. It can take a minute — check spam too.
        </div>
        <p className="small" style={{ marginTop: 14 }}><Link to="/signin">Go to sign in</Link></p>
      </AuthFrame>
    )

  return (
    <AuthFrame>
      <h2>Create your account</h2>
      <p className="muted">Free to start. Setting up takes about 3 minutes.</p>
      <form className="stack-m" style={{ marginTop: 16 }} onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="label">Full name</span>
          <input className="inp" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">Email</span>
          <input className="inp" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span className="label">Password (8+ characters, letters and numbers)</span>
          <input className="inp" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && (
          <div className="err" role="alert">
            <span className="grow">{error}</span>
            {error.includes('already exists') && <Link className="btn sm" to="/signin">Sign in</Link>}
          </div>
        )}
        <button className="btn pri full" disabled={busy}>
          {busy ? <><span className="spinner" /> Creating account…</> : 'Create account'}
        </button>
        <p className="small muted">
          By signing up you agree to our <Link to="/privacy">privacy terms</Link>. Nothing is ever sent to a recruiter without your approval.
        </p>
        <div className="small"><Link to="/signin">I already have an account</Link></div>
      </form>
    </AuthFrame>
  )
}
