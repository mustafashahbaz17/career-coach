// /reset-password — opened from the reset email. Supabase signs the student in from the link,
// then they choose a new password here.
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import { supabase, supabaseConfigured } from '../../lib/supabase'
import { homeFor, useAuth } from '../../auth/AuthProvider'
import { friendlyAuthError, passwordProblem } from '../../auth/authErrors'
import ConfigMissing from '../../components/ConfigMissing'
import { LoadingScreen } from '../../auth/RequireAuth'

export default function ResetPassword() {
  const { session, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const pw = passwordProblem(password)
    if (pw) return setError(pw)
    setBusy(true)
    const { error: err } = await supabase!.auth.updateUser({ password })
    setBusy(false)
    if (err) return setError(friendlyAuthError(err))
    const p = await refreshProfile()
    navigate(homeFor(p), { replace: true })
  }

  if (!supabaseConfigured) return <AuthFrame><ConfigMissing /></AuthFrame>
  if (loading) return <LoadingScreen />

  if (!session)
    return (
      <AuthFrame>
        <h2>This link has expired</h2>
        <div className="err" role="alert" style={{ marginTop: 14 }}>
          Reset links work once and expire after a while. Please ask for a new one.
        </div>
        <p style={{ marginTop: 14 }}><Link className="btn pri" to="/forgot-password">Send a new link</Link></p>
      </AuthFrame>
    )

  return (
    <AuthFrame>
      <h2>Choose a new password</h2>
      <form className="stack-m" style={{ marginTop: 16 }} onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="label">New password (8+ characters, letters and numbers)</span>
          <input className="inp" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="err" role="alert">{error}</div>}
        <button className="btn pri full" disabled={busy}>
          {busy ? <><span className="spinner" /> Saving…</> : 'Save new password'}
        </button>
      </form>
    </AuthFrame>
  )
}
