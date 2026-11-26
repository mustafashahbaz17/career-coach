// /dashboard — where a student lands after onboarding.
//  - Greets them by first name and shows their plan.
//  - Profile summary (university, major, graduation year) with "Edit details" → /onboarding?edit=1.
//  - Their latest AI career tracks from `interest_results` (with reasons), or — if there are none yet —
//    the top 3 from `quiz_track_scores`.
//  - "Coming soon" cards for the features still being built.
// Reads: profiles (own, via useAuth), interest_results (own), quiz_track_scores (own), career_tracks. Writes: nothing. Webhooks: none.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import ErrorNotice from '../../components/ErrorNotice'
import Icon, { type IconName } from '../../components/Icon'
import TrackCards, { toShownTrack, type ShownTrack } from '../../components/TrackCards'

const LOAD_FAILED = { code: 'load_failed', message: 'We couldn’t load your tracks. Please try again.', retryable: true }
const PLAN_LABEL: Record<string, string> = { free: 'Free plan', pro: 'Pro plan', premium: 'Premium plan' }
const YEAR_LABEL: Record<string, string> = { '1st': '1st year', '2nd': '2nd year', '3rd': '3rd year', '4th': '4th year', '5th': '5th year', graduated: 'Graduated' }

const COMING: { title: string; text: string; icon: IconName; premium?: boolean }[] = [
  { title: 'Opportunity matches', text: 'Programmes you’re eligible for, with why you qualify and what you’re missing.', icon: 'search' },
  { title: 'Tracker', text: 'Every application on one board, with deadline reminders.', icon: 'board' },
  { title: 'CV studio', text: 'Tailor your CV to each role — you accept or reject every change.', icon: 'cv' },
  { title: 'Interview practice', text: 'Timed mock interviews with scored feedback.', icon: 'mic', premium: true },
  { title: 'Vent space', text: 'A calm, private place to talk through recruitment stress.', icon: 'shield' },
]

export default function Dashboard() {
  const { session, profile } = useAuth()
  const uid = session?.user.id
  const [tracks, setTracks] = useState<ShownTrack[]>([])
  const [source, setSource] = useState<'ai' | 'quiz' | null>(null)
  const [when, setWhen] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !uid) return
    setLoading(true)
    setFailed(false)
    const [t, ir, qs] = await Promise.all([
      supabase.from('career_tracks').select('key, name, description'),
      supabase.from('interest_results').select('tracks, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(1),
      supabase.from('quiz_track_scores').select('track_key, score').eq('user_id', uid).order('score', { ascending: false }).limit(3),
    ])
    if (t.error || ir.error || qs.error) {
      console.error('Dashboard load failed', t.error || ir.error || qs.error)
      setFailed(true)
      setLoading(false)
      return
    }
    const info = Object.fromEntries(((t.data || []) as { key: string; name: string; description: string }[]).map((x) => [x.key, x]))
    const latest = ir.data?.[0]
    const aiTracks = latest ? ((latest.tracks || []) as { track_key: string; score: number; reason?: string }[]).slice(0, 3).map((x) => toShownTrack(x, info)) : []
    if (aiTracks.length) {
      setTracks(aiTracks)
      setSource('ai')
      setWhen(new Date(latest!.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))
    } else {
      setTracks(((qs.data || []) as { track_key: string; score: number }[]).map((x) => toShownTrack(x, info)))
      setSource(qs.data?.length ? 'quiz' : null)
    }
    setLoading(false)
  }, [uid])

  useEffect(() => { void load() }, [load])

  const firstName = String(profile?.full_name || session?.user.user_metadata?.full_name || '').split(' ')[0]
  const plan = String(profile?.plan || 'free')
  const onboarded = profile?.onboarding_step === 'done'
  const summary = [
    profile?.university as string | undefined,
    [profile?.degree, profile?.major].filter(Boolean).join(' '),
    profile?.study_year ? YEAR_LABEL[String(profile.study_year)] : '',
    profile?.grad_year ? `Graduating ${profile.grad_year}` : '',
  ].filter(Boolean) as string[]

  return (
    <div className="wrap" style={{ paddingTop: 'clamp(16px,3vw,30px)' }}>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,36px)' }}>Hi{firstName ? `, ${firstName}` : ''} 👋</h1>
          <p className="muted">Here’s your recruitment season at a glance.</p>
        </div>
        <Link to="/pricing" className={`chip ${plan === 'premium' ? 'gold' : plan === 'pro' ? 'teal' : 'line'}`} title="See plans">
          {PLAN_LABEL[plan] || plan}
        </Link>
      </div>

      {!onboarded && (
        <div className="card warn row between" style={{ marginBottom: 18 }}>
          <span><b>Finish setting up</b> — it takes about 3 minutes and unlocks your career tracks.</span>
          <Link className="btn pri sm" to="/onboarding">Continue</Link>
        </div>
      )}

      <div className="stack-l">
        {/* Profile summary */}
        <section className="card row between" aria-label="Your profile">
          <div className="stack-s">
            <span className="label">Your profile</span>
            {summary.length ? (
              <div className="row" style={{ gap: 8 }}>{summary.map((s) => <span key={s} className="chip" style={{ whiteSpace: 'normal', maxWidth: '100%' }}>{s}</span>)}</div>
            ) : (
              <span className="small muted">No details yet.</span>
            )}
          </div>
          <Link className="btn sm" to={onboarded ? '/onboarding?edit=1' : '/onboarding'}>Edit details</Link>
        </section>

        {/* Career tracks */}
        <section className="stack-m" aria-label="Your career tracks">
          <div className="sec-title">
            <div>
              <h2>Your career tracks</h2>
              {source === 'ai' && <p className="small muted">With personal explanations · {when}</p>}
              {source === 'quiz' && <p className="small muted">Based on your quiz answers. Personal explanations will appear once our AI has looked at your answers.</p>}
            </div>
            {onboarded && <Link className="btn sm ghost" to="/history">See history</Link>}
          </div>
          {loading ? (
            <div className="card row" role="status"><span className="spinner" /><span className="muted">Loading your tracks…</span></div>
          ) : failed ? (
            <ErrorNotice failure={LOAD_FAILED} onRetry={load} />
          ) : tracks.length ? (
            <TrackCards tracks={tracks} />
          ) : (
            <div className="card stack-s" style={{ textAlign: 'center', padding: '28px 18px' }}>
              <b>No career tracks yet</b>
              <p className="small muted">Take the 3-minute interest quiz and your top 3 tracks will show up here.</p>
              <div><Link className="btn pri sm" to="/onboarding">Take the quiz</Link></div>
            </div>
          )}
        </section>

        {/* Coming soon */}
        <section className="stack-m" aria-label="Coming soon">
          <h2>Coming soon</h2>
          <div className="grid g3">
            {COMING.map((c) => (
              <div key={c.title} className="card flat stack-s" aria-disabled="true">
                <div className="row between">
                  <span className="row" style={{ gap: 8, color: 'var(--teal-d)' }}><Icon name={c.icon} /><b style={{ color: 'var(--ink)' }}>{c.title}</b></span>
                  <span className="chip line" style={{ fontSize: 11 }}>Coming soon</span>
                </div>
                <p className="small muted">{c.text}</p>
                {c.premium && <span className="chip gold" style={{ alignSelf: 'flex-start', fontSize: 11 }}>Premium</span>}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
