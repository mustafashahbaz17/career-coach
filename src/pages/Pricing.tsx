// /pricing — the three plans, Free (PKR 0), Pro (PKR 499/month est.), Premium (PKR 999/month est.).
// The monthly limits are read from the `plan_limits` table, so the numbers on this page always match
// what n8n actually enforces. Nothing about limits is typed into this page.
// 0 in the table = not on that plan, shown as "—". The signed-in student's current plan is highlighted.
// "Upgrade" shows "Coming soon" for now (a later n8n workflow will change the plan).
// Reads: plan_limits, profiles.plan (own, via useAuth). Writes: nothing. Webhooks: none.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import ErrorNotice from '../components/ErrorNotice'
import Icon from '../components/Icon'

type PlanKey = 'free' | 'pro' | 'premium'

const PLANS: { key: PlanKey; name: string; price: number; tag?: string; line: string }[] = [
  { key: 'free', name: 'Free', price: 0, line: 'Get set up and see where you fit.' },
  { key: 'pro', name: 'Pro', price: 499, line: 'For students applying to several programmes.' },
  { key: 'premium', name: 'Premium', price: 999, tag: 'Interview and offer', line: 'Practise interviews and get help with your offer.' },
]

// Feature names exactly as in plan_limits / the Shared contracts → friendly labels, in display order.
const LABELS: [string, string][] = [
  ['onboard-tracks', 'Career track reports'],
  ['linkedin-import', 'LinkedIn imports'],
  ['cv-import', 'CV imports'],
  ['cv-review', 'CV reviews'],
  ['coach-message', 'Coach messages'],
  ['interview-session', 'Interview practice sessions'],
  ['negotiation-draft', 'Negotiation email drafts'],
  ['vent-message', 'Vent space messages'],
]
const labelFor = (f: string) => LABELS.find(([k]) => k === f)?.[1] ?? f.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

type Limits = Record<PlanKey, Record<string, number>>
const LOAD_FAILED = { code: 'load_failed', message: 'We couldn’t load the plan limits. Please try again.', retryable: true }

export default function Pricing() {
  const { session, profile, loading: authLoading } = useAuth()
  const current = (session ? String(profile?.plan || 'free') : null) as PlanKey | null
  const [limits, setLimits] = useState<Limits | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [soonFor, setSoonFor] = useState<PlanKey | null>(null)

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return }
    setLoading(true)
    setFailed(false)
    const { data, error } = await supabase.from('plan_limits').select('plan, feature, monthly_limit')
    if (error) {
      console.error('Loading plan_limits failed', error)
      setFailed(true)
      setLoading(false)
      return
    }
    const rows = (data || []) as { plan: PlanKey; feature: string; monthly_limit: number }[]
    const l: Limits = { free: {}, pro: {}, premium: {} }
    for (const r of rows) if (l[r.plan]) l[r.plan][r.feature] = r.monthly_limit
    const known = LABELS.map(([k]) => k).filter((k) => rows.some((r) => r.feature === k))
    const extra = [...new Set(rows.map((r) => r.feature))].filter((f) => !known.includes(f)).sort()
    setFeatures([...known, ...extra])
    setLimits(rows.length ? l : null)
    setLoading(false)
  }, [])

  // Load once we know whether someone is signed in (the table is readable by signed-in accounts).
  useEffect(() => { if (!authLoading) void load() }, [authLoading, session?.user.id, load])

  const noLimitsVisible = !loading && !failed && !limits

  return (
    <div className="wrap" style={{ paddingTop: 'clamp(16px,3vw,30px)' }}>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 'clamp(28px,3.6vw,40px)' }}>Plans</h1>
          <p className="muted">Start free. Upgrade only if you need more. Prices are early estimates we’re testing with students.</p>
        </div>
        {current && <span className="chip teal">You’re on {PLANS.find((p) => p.key === current)?.name ?? current}</span>}
      </div>

      {failed && <div style={{ marginBottom: 16 }}><ErrorNotice failure={LOAD_FAILED} onRetry={load} /></div>}
      {(noLimitsVisible || !supabaseConfigured) && (
        <div className="card tint row between" style={{ marginBottom: 16 }}>
          <span className="small"><b>Sign in to see each plan’s exact monthly limits.</b> They come straight from the limits we enforce, so they’re always up to date.</span>
          <Link className="btn sm pri" to="/signin" state={{ from: '/pricing' }}>Sign in</Link>
        </div>
      )}

      <div className="grid g3" style={{ alignItems: 'stretch' }}>
        {PLANS.map((p) => {
          const isCurrent = current === p.key
          return (
            <article key={p.key} className={`card price ${p.key === 'premium' ? 'feat' : ''}`} aria-current={isCurrent ? 'true' : undefined}
              style={isCurrent ? { outline: '3px solid var(--bright)', outlineOffset: 3 } : undefined}>
              <div className="row between">
                <h3>{p.name}</h3>
                {isCurrent ? <span className="chip teal">Your plan</span> : p.tag ? <span className="chip gold">{p.tag}</span> : null}
              </div>
              <div>
                <span className="amt">PKR {p.price.toLocaleString()}</span>
                <span className="muted">/month {p.price > 0 && <span className="chip line">est.</span>}</span>
              </div>
              <p className="small muted" style={{ margin: 0 }}>{p.line}</p>

              {loading ? (
                <div className="row small muted" role="status"><span className="spinner" /> Loading limits…</div>
              ) : limits ? (
                <ul className="limits" aria-label={`${p.name} monthly limits`}>
                  {features.map((f) => {
                    const n = limits[p.key][f] ?? 0
                    return (
                      <li key={f} className={n === 0 ? 'off' : ''}>
                        <span>{labelFor(f)}</span>
                        <b className="num">{n === 0 ? '—' : `${n.toLocaleString()} a month`}</b>
                      </li>
                    )
                  })}
                </ul>
              ) : null}

              <div style={{ marginTop: 'auto' }} className="stack-s">
                {!session ? (
                  <Link className={`btn full ${p.key === 'free' ? 'pri' : ''}`} to="/signup">{p.key === 'free' ? 'Start free' : 'Start free, upgrade later'}</Link>
                ) : isCurrent ? (
                  <button className="btn full" disabled>Current plan</button>
                ) : p.key === 'free' ? null : (
                  <>
                    <button className="btn full pri" onClick={() => setSoonFor(p.key)}>Upgrade to {p.name}</button>
                    {soonFor === p.key && <p className="small muted" role="status" style={{ margin: 0, textAlign: 'center' }}>Coming soon — upgrades aren’t switched on yet.</p>}
                  </>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <p className="small muted" style={{ marginTop: 18, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Icon name="shield" size={16} />
        <span>Limits reset on the 1st of each month. Only runs that work count — if something fails, it doesn’t use up your allowance. “—” means it isn’t part of that plan.</span>
      </p>
    </div>
  )
}
