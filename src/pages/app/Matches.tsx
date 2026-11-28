// /matches — Opportunity matches: openings the student qualifies for, ranked by the AI, with reasons.
//  - On load: reads the student's last ranked list from the `my_ranked_matches` view (their own rows only,
//    no AI run) and which opportunities are already on their tracker (`applications`).
//  - "Find my matches" / "Refresh my matches": calls n8n `opportunity-matches` with {} (60 s timeout).
//    Reply: { ok: true, matches: [...], total_eligible, more_on_paid_plan } (contract: eliza_workflows.md).
//  - "Save to tracker": adds a card to `applications` (status saved). Hidden once it's on the tracker.
// Reads: my_ranked_matches, applications (own). Writes: applications (own). Webhooks: opportunity-matches.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { callWorkflow, type WorkflowFailure } from '../../lib/callWorkflow'
import { useAuth } from '../../auth/AuthProvider'
import ErrorNotice from '../../components/ErrorNotice'
import BaraPose from '../../components/mascot/BaraPose'
import { deadlineText } from '../../lib/deadlines'
import { addApplication, TRACKER_FULL } from '../../lib/tracker'

type Match = {
  opportunity_id: string
  rank: number | null
  fit_score: number | null
  why_you_qualify: string | null
  what_you_are_missing: string | null
  title: string
  organisation: string
  kind: string | null
  city: string | null
  remote: boolean | null
  deadline: string | null
  apply_url: string | null
  verified: boolean | null
  is_sample: boolean | null
  in_tracker?: boolean
  ranked_at?: string | null
}
type Reply = { matches: Match[]; total_eligible?: number; more_on_paid_plan?: boolean }

const COLUMNS = 'opportunity_id, rank, fit_score, why_you_qualify, what_you_are_missing, title, organisation, kind, city, remote, deadline, apply_url, verified, is_sample, ranked_at'
const LOAD_FAILED = { code: 'load_failed', message: 'We couldn’t load your matches. Please try again.', retryable: true }
const NOT_READY = 'Finish your profile and quiz first, then we can match you.'
const KIND: Record<string, string> = {
  internship: 'Internship', management_trainee: 'Management trainee', graduate_job: 'Graduate job',
  scholarship: 'Scholarship', fellowship: 'Fellowship', competition: 'Competition', other: 'Opportunity',
}

// The AI may send a score out of 1 or out of 100; show it out of 100 either way.
function score(n: number | null): number | null {
  if (n === null || Number.isNaN(Number(n))) return null
  const v = Number(n) <= 1 ? Number(n) * 100 : Number(n)
  return Math.max(0, Math.min(100, Math.round(v)))
}

export default function Matches() {
  const { session, profile } = useAuth()
  const uid = session?.user.id
  const [matches, setMatches] = useState<Match[]>([])
  const [tracked, setTracked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshed, setRefreshed] = useState(false) // a refresh happened in this visit
  const [failure, setFailure] = useState<WorkflowFailure | null>(null)
  const [extra, setExtra] = useState<{ total?: number; more?: boolean }>({})
  const [saving, setSaving] = useState<string>('')
  const [saveError, setSaveError] = useState<{ id: string; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!supabase || !uid) return
    setLoading(true)
    setLoadFailed(false)
    const [m, a] = await Promise.all([
      supabase.from('my_ranked_matches').select(COLUMNS).order('rank', { ascending: true }),
      supabase.from('applications').select('opportunity_id').not('opportunity_id', 'is', null),
    ])
    if (m.error || a.error) {
      console.error('Loading matches failed', m.error || a.error)
      setLoadFailed(true)
    } else {
      setMatches((m.data ?? []) as Match[])
      setTracked(new Set((a.data ?? []).map((r) => (r as { opportunity_id: string }).opportunity_id)))
    }
    setLoading(false)
  }, [uid])

  useEffect(() => { void load() }, [load])

  async function refresh() {
    setFailure(null)
    setRefreshing(true)
    const r = await callWorkflow<Reply>('opportunity-matches', {}, { timeoutMs: 60000 })
    setRefreshing(false)
    if (r.ok) {
      const list = Array.isArray(r.data.matches) ? r.data.matches : []
      setMatches(list)
      setTracked((t) => {
        const n = new Set(t)
        list.forEach((x) => { if (x.in_tracker) n.add(x.opportunity_id) })
        return n
      })
      setExtra({ total: r.data.total_eligible, more: Boolean(r.data.more_on_paid_plan) })
      setRefreshed(true)
      return
    }
    setFailure(r.code === 'bad_input' ? { ...r, message: NOT_READY, retryable: false } : r)
  }

  async function save(m: Match) {
    setSaving(m.opportunity_id)
    setSaveError(null)
    const r = await addApplication(profile?.plan as string | undefined, {
      opportunity_id: m.opportunity_id, title: m.title, organisation: m.organisation,
      deadline: m.deadline, apply_url: m.apply_url, status: 'saved',
    })
    setSaving('')
    if (r.ok || r.reason === 'duplicate') {
      setTracked((t) => new Set(t).add(m.opportunity_id))
      return
    }
    setSaveError({ id: m.opportunity_id, text: r.reason === 'full' ? TRACKER_FULL : 'We couldn’t save that. Please try again.' })
  }

  const lastRun = matches.find((m) => m.ranked_at)?.ranked_at
  const neverRun = !loading && !loadFailed && matches.length === 0 && !refreshed

  return (
    <div className="wrap" style={{ paddingTop: 'clamp(16px,3vw,30px)', paddingBottom: 48 }}>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,36px)' }}>Opportunity matches</h1>
          <p className="muted">Internships, trainee programmes and scholarships you’re eligible for, ranked for you, with what you still need.</p>
        </div>
        {!neverRun && !loading && !loadFailed && (
          <div className="stack-s" style={{ alignItems: 'flex-end' }}>
            <button type="button" className="btn pri" onClick={refresh} disabled={refreshing}>
              {refreshing ? <><span className="spinner" /> Finding matches…</> : 'Refresh my matches'}
            </button>
            {lastRun && <span className="small muted">Last updated {new Date(lastRun).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
          </div>
        )}
      </div>

      {failure && <div style={{ marginBottom: 16 }}><MatchFailure failure={failure} onRetry={refresh} retrying={refreshing} onDismiss={() => setFailure(null)} /></div>}
      {refreshing && <div className="okbox row small" role="status" style={{ marginBottom: 16 }}><span className="spinner" />Checking every open opportunity against your profile, this can take up to a minute…</div>}

      {loading ? (
        <div className="row" role="status"><span className="spinner" /><span className="muted">Loading your matches…</span></div>
      ) : loadFailed ? (
        <ErrorNotice failure={LOAD_FAILED} onRetry={load} />
      ) : neverRun ? (
        <div className="card stack-m" style={{ alignItems: 'center', textAlign: 'center', padding: 'clamp(24px,4vw,40px)' }}>
          <BaraPose pose="offer" size={130} label="Bara holding an offer letter" />
          <h3>Let’s find what you qualify for</h3>
          <p className="muted" style={{ maxWidth: 520, margin: '0 auto' }}>We check your degree, CGPA, graduation year and career tracks against every open opportunity, then rank the ones that fit and tell you why.</p>
          <button type="button" className="btn pri" onClick={refresh} disabled={refreshing}>
            {refreshing ? <><span className="spinner" /> Finding matches…</> : 'Find my matches'}
          </button>
        </div>
      ) : matches.length === 0 ? (
        <div className="card stack-s" style={{ alignItems: 'center', textAlign: 'center' }}>
          <BaraPose pose="hello" size={110} />
          <h3>No open opportunities match you yet.</h3>
          <p className="muted small" style={{ margin: 0 }}>New openings are added every week. Try again later, or update your profile if something has changed.</p>
          <Link className="btn sm" to="/onboarding?edit=1">Edit my details</Link>
        </div>
      ) : (
        <div className="stack-m">
          {refreshed && typeof extra.total === 'number' && (
            <p className="small muted" style={{ margin: 0 }}>
              Showing {matches.length} of {extra.total} opportunit{extra.total === 1 ? 'y' : 'ies'} you’re eligible for.
            </p>
          )}
          <div className="match-list">
            {matches.map((m) => (
              <MatchCard
                key={m.opportunity_id} m={m} inTracker={tracked.has(m.opportunity_id) || Boolean(m.in_tracker)}
                saving={saving === m.opportunity_id} error={saveError?.id === m.opportunity_id ? saveError.text : ''}
                onSave={() => void save(m)}
              />
            ))}
          </div>
          {extra.more && (
            <div className="card tint row between" style={{ flexWrap: 'wrap', gap: 12 }}>
              <span><b>There are more matches for you.</b> <span className="muted">See all your matches, with what you’re missing, on Pro.</span></span>
              <Link className="btn pri sm" to="/pricing">See all your matches on Pro</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MatchFailure({ failure, onRetry, retrying, onDismiss }: { failure: WorkflowFailure; onRetry: () => void; retrying: boolean; onDismiss: () => void }) {
  if (failure.message === NOT_READY) {
    return (
      <div className="card tint row between" role="alert" style={{ flexWrap: 'wrap', gap: 12 }}>
        <span><b>{NOT_READY}</b></span>
        <Link className="btn pri sm" to="/onboarding">Finish setting up</Link>
      </div>
    )
  }
  return <ErrorNotice failure={failure} onRetry={onRetry} retrying={retrying} onDismiss={onDismiss} />
}

function MatchCard({ m, inTracker, saving, error, onSave }: { m: Match; inTracker: boolean; saving: boolean; error: string; onSave: () => void }) {
  const d = deadlineText(m.deadline)
  const s = score(m.fit_score)
  const where = [m.city, m.remote ? 'Remote' : null].filter(Boolean).join(' · ')
  return (
    <article className="card match-card stack-s">
      <div className="row between" style={{ alignItems: 'flex-start', gap: 12 }}>
        <div className="stack-s" style={{ gap: 4, minWidth: 0 }}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {m.kind && <span className="chip line" style={{ fontSize: 11 }}>{KIND[m.kind] ?? m.kind}</span>}
            {m.is_sample && <span className="chip sample" style={{ fontSize: 11 }}>Sample</span>}
            {m.verified === false && <span className="chip line warn-chip" style={{ fontSize: 11 }}>Not yet verified</span>}
          </div>
          <h3 style={{ margin: 0, overflowWrap: 'anywhere' }}>{m.title}</h3>
          <span className="muted">{m.organisation}{where ? ` · ${where}` : ''}</span>
        </div>
        {s !== null && (
          <div className="fit" aria-label={`Fit score ${s} out of 100`}>
            <b className="num">{s}</b><span className="small muted">fit</span>
            <span className="fit-bar" aria-hidden="true"><i style={{ width: `${s}%` }} /></span>
          </div>
        )}
      </div>

      <span className={`small${d.urgent ? ' urgent' : ''}`} style={d.urgent ? { color: 'var(--coral-d)', fontWeight: 700 } : undefined}>{d.text}</span>

      {m.why_you_qualify && (
        <div className="match-why">
          <b className="small">Why you qualify</b>
          <p style={{ margin: '2px 0 0' }}>{m.why_you_qualify}</p>
        </div>
      )}
      {m.what_you_are_missing && (
        <div className="match-miss">
          <b className="small">What you’re missing</b>
          <p style={{ margin: '2px 0 0' }}>{m.what_you_are_missing}</p>
        </div>
      )}

      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        {m.apply_url && (
          <a className="btn pri sm" href={m.apply_url} target="_blank" rel="noopener noreferrer">
            Apply<span className="sr-only"> to {m.title} (opens in a new tab)</span> ↗
          </a>
        )}
        {inTracker ? (
          <Link className="chip mint" to="/tracker" style={{ textDecoration: 'none' }}>✓ In your tracker</Link>
        ) : (
          <button type="button" className="btn sm" onClick={onSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Saving…</> : 'Save to tracker'}
          </button>
        )}
      </div>
      {error && (
        <span className="small" role="alert" style={{ color: 'var(--coral-d)' }}>
          {error} {error.includes('Pro') && <Link to="/pricing">See plans</Link>}
        </span>
      )}
    </article>
  )
}
