// The frame around every page except sign-in/sign-up: top bar and footer.
// Signed out: Pricing, Sign in, Get started free.
// Signed in: Dashboard, History, Pricing links, the student's email and a Sign out button.
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useCardSpotlight, useScrollReveal } from '../lib/useMotion'
import Logo from './Logo'
import { homeFor, useAuth } from '../auth/AuthProvider'

// Links for signed-in students. The current page is highlighted.
function AppLinks() {
  const cls = ({ isActive }: { isActive: boolean }) => `btn sm ${isActive ? '' : 'ghost'}`
  return (
    <>
      <NavLink className={cls} to="/dashboard">Dashboard</NavLink>
      <NavLink className={cls} to="/history">History</NavLink>
      <NavLink className={cls} to="/pricing" end>Pricing</NavLink>
    </>
  )
}

export default function PublicLayout() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [main, setMain] = useState<HTMLElement | null>(null)
  useScrollReveal(main, pathname) // fade/slide headings and cards in as they scroll into view
  useCardSpotlight() // soft glow that follows the mouse on cards

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
        {session && (
          <nav className="row desk-only" style={{ gap: 4, marginLeft: 18 }} aria-label="Main">
            <AppLinks />
          </nav>
        )}
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
        <div className="mob-only blk" style={{ padding: '8px 10px 0' }}>
          <nav className="row" style={{ gap: 4 }} aria-label="Main"><AppLinks /></nav>
          <div className="small muted" style={{ padding: '4px 6px 0' }}>Signed in as <b>{session.user.email}</b></div>
        </div>
      )}

      <main ref={setMain}>
        {/* key = the page address, so each new page fades in */}
        <div className="page-fade" key={pathname}>
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
