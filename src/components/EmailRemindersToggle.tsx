// "Email reminders" on/off switch for the whole account: updates profiles.email_reminders
// (students are allowed to change it). When it's off, no deadline reminder emails are sent, whatever
// the per-card switches say. Shown on the Dashboard and the Tracker.
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export default function EmailRemindersToggle({ compact }: { compact?: boolean }) {
  const { session, profile, refreshProfile } = useAuth()
  const saved = profile?.email_reminders !== false // the column defaults to true
  const [value, setValue] = useState<boolean | null>(null) // local value while saving
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const on = value ?? saved

  async function toggle() {
    if (!supabase || !session || busy) return
    const next = !on
    setValue(next)
    setBusy(true)
    setError('')
    const { error: err } = await supabase.from('profiles').update({ email_reminders: next }).eq('id', session.user.id)
    if (err) {
      console.error('Saving email_reminders failed', err)
      setValue(null)
      setError('We couldn’t save that. Please try again.')
    } else {
      await refreshProfile()
      setValue(null)
    }
    setBusy(false)
  }

  return (
    <div className="email-rem">
      <label className="switch-row">
        <button
          type="button" role="switch" aria-checked={on} className={`switch${on ? ' on' : ''}`}
          onClick={toggle} disabled={busy} aria-describedby={compact ? undefined : 'email-rem-help'}
        >
          <span className="knob" />
        </button>
        <span><b>Email reminders</b> <span className="small muted">{on ? 'On' : 'Off'}</span></span>
      </label>
      {!compact && (
        <span id="email-rem-help" className="small muted">
          {on
            ? `We email ${session?.user.email ?? 'you'} 3 days and 1 day before a deadline, for tracker cards still in Saved.`
            : 'No reminder emails will be sent. Turn this on to get deadline reminders.'}
        </span>
      )}
      {error && <span className="small" role="alert" style={{ color: 'var(--coral-d)' }}>{error}</span>}
    </div>
  )
}
