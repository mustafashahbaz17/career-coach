// The frame around every public page: top bar (logo, Pricing, Sign in, Get started) and footer.
import { Link, Outlet } from 'react-router-dom'
import Logo from './Logo'

export default function PublicLayout() {
  return (
    <>
      <header className="pubnav">
        <Link className="brand" to="/" style={{ padding: 0 }}>
          <Logo />
          <span>Career Coach</span>
        </Link>
        <div className="grow" />
        {/* On phones, Pricing is hidden here (it's in the footer and the "See plans" button) so the bar fits on one line */}
        <Link className="btn ghost sm desk-only" to="/pricing">Pricing</Link>
        <Link className="btn sm" to="/signin">Sign in</Link>
        <Link className="btn pri sm" to="/signup">
          <span className="desk-only">Get started free</span>
          <span className="mob-only">Start free</span>
        </Link>
      </header>

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
