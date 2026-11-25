// The two-column frame used by sign-in, sign-up and password pages (dark panel + form), from the HTML design.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../../components/Logo'

export default function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <Link className="brand" to="/" style={{ color: '#fff', padding: 0 }}>
          <Logo />
          <span>Career Coach</span>
        </Link>
        <div>
          <h2 style={{ fontSize: 'clamp(24px,3vw,34px)' }}>Your recruitment season, handled.</h2>
          <p style={{ color: '#B9D7D3', maxWidth: '44ch' }}>
            Find the programmes you're eligible for, tailor your CV to each, practise the interview, and never miss a deadline.
          </p>
        </div>
        <div className="small" style={{ color: '#9FC3BF' }}>
          Your account only ever sees its own data. Nothing is sent to a recruiter without your approval.
        </div>
      </div>
      <div className="auth-main">
        <div style={{ width: 'min(420px,100%)' }}>
          {/* On phones the dark panel moves below the form, so show the logo (link home) at the top */}
          <Link className="brand mob-only blk" to="/" style={{ padding: '0 0 18px' }}>
            <span className="row" style={{ gap: 9 }}><Logo size={26} /><span>Career Coach</span></span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
