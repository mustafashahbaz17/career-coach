// Temporary private pages (onboarding, dashboard, history, upgrade) until their steps are built.
// They're behind sign-in, so they also prove the protection works.
// Reads: the signed-in student's `profiles` row (via useAuth). Writes: nothing. Webhooks: none.
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'

export default function ComingNext({ title, text }: { title: string; text: string }) {
  const { session, profile, profileError } = useAuth()
  const name = (session?.user.user_metadata?.full_name as string | undefined)?.split(' ')[0]

  return (
    <div className="wrap">
      <div className="placeholder card stack-m" style={{ textAlign: 'left' }}>
        <span className="chip teal">Signed in{name ? ` as ${name}` : ''}</span>
        <h1 style={{ fontSize: 'clamp(26px,3.4vw,34px)' }}>{title}</h1>
        <p className="muted">{text}</p>
        {profileError ? (
          <div className="note gold small">We couldn't load your profile yet. That's expected until the database tables are set up.</div>
        ) : profile?.plan ? (
          <p className="small muted">Your plan: <span className="chip">{String(profile.plan)}</span></p>
        ) : null}
        <div className="row">
          <Link className="btn" to="/">Home</Link>
        </div>
      </div>
    </div>
  )
}
