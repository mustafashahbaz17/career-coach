// A simple "coming soon" page used for pages we haven't built yet (sign-in, sign-up, pricing, privacy).
import { Link } from 'react-router-dom'
import BaraPose from '../components/mascot/BaraPose'
import type { BaraPoseName } from '../components/mascot/baraPoses'

export default function Placeholder({ title, text, bara }: { title: string; text: string; bara?: BaraPoseName }) {
  return (
    <div className="wrap">
      <div className="placeholder card stack-m" style={{ alignItems: 'center' }}>
        {bara && <BaraPose pose={bara} size={150} />}
        <h1 style={{ fontSize: 'clamp(26px,3.4vw,34px)' }}>{title}</h1>
        <p className="muted">{text}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn" to="/">Back to home</Link>
        </div>
      </div>
    </div>
  )
}
