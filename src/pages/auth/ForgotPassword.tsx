// /forgot-password — sends a password-reset email through Supabase Auth.
// The link in that email opens /reset-password.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AuthFrame from './AuthFrame'
import { supabase, supabaseConfigured } from '../../lib/supabase'
import { friendlyAuthError } from '../../auth/authErrors'
import ConfigMissing from '../../components/ConfigMissing'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const clean = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(clean)) return setError('That doesn’t look like a valid email address.')
    setBusy(true)
    const { error: err } = await supabase!.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setBusy(false)
    if (err) return setError(friendlyAuthError(err))
    setSent(clean) // Same message whether or not the account exists, so nobody can test which emails are registered.
  }

  if (!supabaseConfigured) return <AuthFrame><ConfigMissing /></AuthFrame>

  return (
    <AuthFrame>
      <h2>Reset your password</h2>
      <p className="muted">Enter your email and we'll send a reset link if an account exists.</p>
      <form className="stack-m" style={{ marginTop: 16 }} onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="label">Email</span>
          <input className="inp" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {sent && (
          <div className="okbox" role="status">
            If an account exists for <b>{sent}</b>, a reset link is on its way. Check spam too.
          </div>
        )}
        {error && <div className="err" role="alert">{error}</div>}
        <button className="btn pri full" disabled={busy}>
          {busy ? <><span className="spinner" /> Sending…</> : 'Send reset link'}
        </button>
        <Link className="small" to="/signin">Back to sign in</Link>
      </form>
    </AuthFrame>
  )
}
