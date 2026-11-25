// The frame around every page except sign-in/sign-up: top bar and footer.
// Signed out: Pricing, Sign in, Get started free. Signed in: the student's email and a Sign out button.
import { Link, Outlet, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { homeFor, useAuth } from '../auth/AuthProvider'

export default function PublicLayout() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function onSignOut() {
    await signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <>
      <header className="pubnav">
        <Link className="brand" to={session ? homeFor(profile) : '/'} style={{ padding: 0 }}>
          <Logo />
          <span className={session ? 'desk-only' : ''}>Career Coach</span>
        </Link>
        <div className="grow" />
        {session ? (
          <>
            <span className="small muted desk-only" title="Signed in">{session.user.email}</span>
            <button className="btn sm" onClick={onSignOut}>Sign out</button>
          </>
        ) : (
          <>
            {/* On phones, Pricing is hidden here (it's in the footer and the "See plans" button) so the bar fits on one line */}
            <Link className="btn ghost sm desk-only" to="/pricing">Pricing</Link>
            <Link className="btn sm" to="/signin">Sign in</Link>
            <Link className="btn pri sm" to="/signup">
              <span className="desk-only">Get started free</span>
              <span className="mob-only">Start free</span>
            </Link>
          </>
        )}
      </header>
      {session && (
        <div className="mob-only blk small muted" style={{ padding: '8px 14px 0' }}>Signed in as <b>{session.user.email}</b></div>
      )}

      <main>
        <div className="view">
          <Outlet />
        </div>
      </main>

      <footer className="wrap" style={{ paddingTop: 30, paddingBottom: 40, borderTop: '1px solid var(--line)', marginTop: 48 }}>
        <div className="row between small muted">
          <span>Career Coach — a student project. Prices are estimates.</span>
          <span className="row">
            <Link to="/pricing">Pricing</Link>
            <Link to="/privacy">Privacy</Link>
          </span>
        </div>
      </footer>
    </>
  )
}
