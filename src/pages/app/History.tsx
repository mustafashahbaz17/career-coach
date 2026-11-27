// /history — everything the student has run so far, newest first:
//  - career-track reports from `interest_results` (written by n8n `onboard-tracks`)
//  - LinkedIn imports from `linkedin_imports` (written by n8n `linkedin-import`)
// Each row opens to show its details. Only the student's own rows (row-level security + user_id filter).
// Reads: interest_results (own), linkedin_imports (own), career_tracks. Writes: nothing. Webhooks: none.
import { Fragment, useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import ErrorNotice from '../../components/ErrorNotice'
import BaraPose from '../../components/mascot/BaraPose'

type TrackRow = { track_key: string; score?: number; reason?: string }
type Item =
  | { kind: 'tracks'; id: string; at: string; tracks: TrackRow[]; confidence: number | null; needs_followup: boolean }
  | { kind: 'import'; id: string; at: string; url: string; status: string; mapped: Record<string, unknown> | null }

const LOAD_FAILED = { code: 'load_failed', message: 'We couldn’t load your history. Please try again.', retryable: true }

const IMPORT_STATUS: Record<string, [string, string]> = {
  success: ['Imported', 'teal'],
  empty: ['Profile empty or private', 'gold'],
  failed: ['Didn’t work', 'coral'],
  pending: ['Didn’t finish', 'line'],
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function History() {
  const { session } = useAuth()
  const uid = session?.user.id
  const [items, setItems] = useState<Item[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !uid) return
    setLoading(true)
    setFailed(false)
    const [ir, li, t] = await Promise.all([
      supabase.from('interest_results').select('id, tracks, confidence, needs_followup, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
      supabase.from('linkedin_imports').select('id, linkedin_url, status, mapped, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
      supabase.from('career_tracks').select('key, name'),
    ])
    if (ir.error || li.error || t.error) {
      console.error('History load failed', ir.error || li.error || t.error)
      setFailed(true)
      setLoading(false)
      return
    }
    setNames(Object.fromEntries(((t.data || []) as { key: string; name: string }[]).map((x) => [x.key, x.name])))
    const all: Item[] = [
      ...(ir.data || []).map((r) => ({ kind: 'tracks' as const, id: r.id, at: r.created_at, tracks: (r.tracks || []) as TrackRow[], confidence: r.confidence, needs_followup: r.needs_followup })),
      ...(li.data || []).map((r) => ({ kind: 'import' as const, id: r.id, at: r.created_at, url: r.linkedin_url, status: r.status, mapped: r.mapped as Record<string, unknown> | null })),
    ].sort((a, b) => b.at.localeCompare(a.at))
    setItems(all)
    setLoading(false)
  }, [uid])

  useEffect(() => { void load() }, [load])

  return (
    <div className="wrap" style={{ paddingTop: 'clamp(16px,3vw,30px)' }}>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,36px)' }}>History</h1>
          <p className="muted">Your career-track reports and LinkedIn imports, newest first. Tap one to see the details.</p>
        </div>
      </div>

      {loading ? (
        <div className="card row" role="status"><span className="spinner" /><span className="muted">Loading your history…</span></div>
      ) : failed ? (
        <ErrorNotice failure={LOAD_FAILED} onRetry={load} />
      ) : items.length === 0 ? (
        <div className="card stack-s" style={{ textAlign: 'center', padding: '28px 18px', alignItems: 'center' }}>
          <BaraPose pose="hello" size={120} className="center" />
          <b>Nothing here yet</b>
          <p className="small muted">When you get your career tracks or import your LinkedIn profile, it’ll be saved here.</p>
          <div><Link className="btn pri sm" to="/onboarding">Get your career tracks</Link></div>
        </div>
      ) : (
        <div className="faq stack-s" style={{ maxWidth: 820 }}>
          {items.map((it) => (
            <details key={`${it.kind}-${it.id}`}>
              <summary>
                <span className="row" style={{ gap: 10 }}>
                  <span className="chip teal">{it.kind === 'tracks' ? 'Career tracks' : 'LinkedIn import'}</span>
                  {it.kind === 'tracks' ? (
                    <span className="small">{it.tracks.slice(0, 3).map((t) => names[t.track_key] || t.track_key).join(' · ') || 'Report'}</span>
                  ) : (
                    <span className={`chip ${IMPORT_STATUS[it.status]?.[1] || 'line'}`}>{IMPORT_STATUS[it.status]?.[0] || it.status}</span>
                  )}
                  <span className="small muted num">{fmt(it.at)}</span>
                </span>
              </summary>
              {it.kind === 'tracks' ? <TracksDetail it={it} names={names} /> : <ImportDetail it={it} />}
            </details>
          ))}
        </div>
      )}
    </div>
  )
}

function TracksDetail({ it, names }: { it: Extract<Item, { kind: 'tracks' }>; names: Record<string, string> }) {
  return (
    <div className="stack-s" style={{ paddingBottom: 16 }}>
      {it.confidence !== null && <span className="small muted num">Confidence {Math.round(Number(it.confidence) * 100)}%{it.needs_followup ? ' · we asked a couple of follow-up questions' : ''}</span>}
      <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>
        {it.tracks.slice(0, 3).map((t) => (
          <li key={t.track_key} style={{ margin: '6px 0' }}>
            <b>{names[t.track_key] || t.track_key}</b>{t.reason ? <> — <span style={{ color: 'var(--ink2)' }}>{t.reason}</span></> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

function ImportDetail({ it }: { it: Extract<Item, { kind: 'import' }> }) {
  const m = it.mapped || {}
  const s = (k: string) => (m[k] === null || m[k] === undefined ? '' : String(m[k]))
  const list = (k: string) => (Array.isArray(m[k]) ? (m[k] as unknown[]) : [])
  const rows: [string, string][] = [
    ['Name', s('full_name')], ['Headline', s('headline')], ['City', s('city')], ['University', s('university')],
    ['Degree', [s('degree'), s('major')].filter(Boolean).join(', ')], ['Graduation year', s('grad_year')],
    ['Skills', list('skills').map(String).join(', ')], ['Roles found', list('experience').length ? String(list('experience').length) : ''],
  ].filter(([, v]) => v) as [string, string][]
  return (
    <div className="stack-s small" style={{ paddingBottom: 16 }}>
      <span className="muted" style={{ wordBreak: 'break-all' }}>{it.url}</span>
      {it.status === 'success' && rows.length ? (
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 14px' }}>
          {rows.map(([k, v]) => <Fragment key={k}><dt className="muted">{k}</dt><dd style={{ margin: 0 }}>{v}</dd></Fragment>)}
        </dl>
      ) : it.status === 'empty' ? (
        <p style={{ margin: 0 }}>We couldn’t read details from that profile — it may be private. You can fill in your details by hand.</p>
      ) : it.status === 'success' ? (
        <p style={{ margin: 0 }}>The import worked but didn’t find any details.</p>
      ) : (
        <p style={{ margin: 0 }}>This import didn’t work. You can try again from <Link to="/onboarding?edit=1">your details</Link> — or just fill them in by hand.</p>
      )}
    </div>
  )
}
