// Welcome splash: Bara greets first-time visitors before the main site.
//  - Shows once per browser session (sessionStorage). Returning in the same session goes straight to the site.
//  - "Meet your coach", the speech bubble, "Skip" and the Escape key all enter the site.
//  - Entering: Bara does a happy bounce, an orange wipe grows from what was clicked, and the site fades in (~750ms).
//  - Reduce motion: no animation; clicking enters immediately.
//  - Accessible: it's a modal dialog, focus starts on the main button and stays inside the splash,
//    and the site behind it is made inert until it closes.
import { useCallback, useEffect, useRef, useState } from 'react'
import Bara from './mascot/Bara'
import '../styles/splash.css'

const SEEN_KEY = 'cc-splash-seen'
const BUBBLE = 'Hi! Click here to meet your new career coach 🧡'
// Pages people reach from an email link (confirm / reset password) shouldn't be blocked by the splash.
const SKIP_ON = ['/signin', '/reset-password']

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function shouldShowSplash(pathname: string): boolean {
  if (SKIP_ON.includes(pathname)) return false
  try {
    return sessionStorage.getItem(SEEN_KEY) !== '1'
  } catch {
    return false // storage blocked (e.g. strict privacy mode): don't risk showing it on every page
  }
}

export default function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const [typed, setTyped] = useState(0)
  const [wipe, setWipe] = useState<{ x: number; y: number } | null>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const chars = Array.from(BUBBLE) // emoji-safe

  // Typewriter for the speech bubble, starting after it pops in (~0.9s).
  useEffect(() => {
    if (reducedMotion()) { setTyped(chars.length); return }
    let i = 0
    let timer = 0
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        i += 1
        setTyped(i)
        if (i >= chars.length) clearInterval(timer)
      }, 26)
    }, 900)
    return () => { clearTimeout(start); clearInterval(timer) }
  }, [chars.length])

  const enter = useCallback((from?: HTMLElement | null) => {
    if (leaving) return
    try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* ignore */ }
    if (reducedMotion()) { onDone(); return }
    const r = from?.getBoundingClientRect()
    setWipe(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight / 2 })
    setLeaving(true)
    window.setTimeout(onDone, 760)
  }, [leaving, onDone])

  // Focus the main button, lock page scroll, Escape = skip, keep Tab inside the splash.
  useEffect(() => {
    ctaRef.current?.focus({ preventScroll: true })
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); enter(null) }
      if (e.key === 'Tab' && rootRef.current) {
        const f = Array.from(rootRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'))
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [enter])

  return (
    <div ref={rootRef} className={`splash ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-modal="true" aria-labelledby="splash-title">
      {/* soft drifting orange and mint circles (decorative) */}
      <div className="splash-particles" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <span key={i} className={`p p${i + 1}`} />)}
      </div>

      <button type="button" className="splash-skip" onClick={(e) => enter(e.currentTarget)}>Skip</button>

      <div className="splash-stage">
        <h1 id="splash-title" className="sr-only">Welcome to Career Coach</h1>

        <div className="splash-hero">
          <button type="button" className="splash-bubble" onClick={(e) => enter(e.currentTarget)} aria-label={BUBBLE}>
            <span aria-hidden="true">
              <span>{chars.slice(0, typed).join('')}</span>
              <span className="ghost">{chars.slice(typed).join('')}</span>
            </span>
          </button>

          <div className="bara-rise">
            <div className={`bara-idle ${leaving ? 'bara-hop' : ''}`}>
              <Bara happy={leaving} />
            </div>
            <div className="bara-shadow" aria-hidden="true" />
          </div>
        </div>

        <button ref={ctaRef} type="button" className="splash-cta" onClick={(e) => enter(e.currentTarget)}>
          Meet your coach
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {wipe && <div className="splash-wipe" aria-hidden="true" style={{ ['--wx' as string]: `${wipe.x}px`, ['--wy' as string]: `${wipe.y}px` }} />}
    </div>
  )
}
