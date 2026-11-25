// Onboarding results: the student's top 3 career tracks.
//  - Straight away it shows the top 3 from `quiz_track_scores` (a database view that adds up the quiz weights, no AI).
//  - Then it calls the n8n webhook `onboard-tracks`, which returns exactly 3 tracks with an AI-written `reason`, a
//    confidence, and (if unsure) up to 2 follow-up questions. n8n saves that to `interest_results`.
//  - If the AI call fails, the quiz-score tracks stay on screen with the error message and "Try again".
//  - Coming back later shows the saved `interest_results` without calling the AI again (so it doesn't use up the limit).
// Reads: career_tracks, quiz_track_scores (own), interest_results (own). Writes: profiles.onboarding_step (only for
// "Update my answers"). Webhooks: onboard-tracks.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { callWorkflow, type WorkflowFailure } from '../../lib/callWorkflow'
import { useAuth } from '../../auth/AuthProvider'
import ErrorNotice from '../../components/ErrorNotice'

type TrackInfo = { key: string; name: string; description: string }
type Shown = { key: string; name: string; description: string; score: number; reason?: string }
type AiReply = {
  tracks: { track_key: string; name?: string; score: number; reason: string }[]
  confidence?: number
  needs_followup?: boolean
  followup_questions?: string[]
}

const LOAD_FAILED = { code: 'load_failed', message: 'We couldn’t load your results. Please try again.', retryable: true }

export default function Results({ justFinished, onRedoQuiz }: { justFinished: boolean; onRedoQuiz: () => void }) {
  const { session, refreshProfile } = useAuth()
  const uid = session?.user.id
  const [info, setInfo] = useState<Record<string, TrackInfo>>({})
  const [quizTop, setQuizTop] = useState<Shown[]>([])
  const [ai, setAi] = useState<{ tracks: Shown[]; confidence?: number; followups: string[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [asking, setAsking] = useState(false)
  const [failure, setFailure] = useState<WorkflowFailure | null>(null)
  const startedAi = useRef(false)

  const toShown = useCallback(
    (t: { track_key: string; name?: string; score: number; reason?: string }, map: Record<string, TrackInfo>): Shown => ({
      key: t.track_key,
      name: map[t.track_key]?.name || t.name || t.track_key,
      description: map[t.track_key]?.description || '',
      score: Number(t.score) || 0,
      reason: t.reason,
    }),
    [],
  )

  // Replaces the brief's placeholder fetchAiTrackReasons(): asks n8n for the AI-written tracks.
  const askAi = useCallback(async (map: Record<string, TrackInfo>) => {
    setAsking(true)
    setFailure(null)
    const r = await callWorkflow<AiReply>('onboard-tracks', {})
    setAsking(false)
    if (!r.ok) { setFailure(r); return }
    const tracks = (r.data.tracks || []).slice(0, 3).map((t) => toShown(t, map))
    if (!tracks.length) { setFailure({ ok: false, code: 'ai_unavailable', message: 'Our AI is having a moment. Your work is saved; please try again.', retryable: true }); return }
    setAi({ tracks, confidence: r.data.confidence, followups: r.data.needs_followup ? (r.data.followup_questions || []).slice(0, 2) : [] })
  }, [toShown])

  const load = useCallback(async () => {
    if (!supabase || !uid) return
    setLoading(true)
    setLoadFailed(false)
    const [t, s, ir] = await Promise.all([
      supabase.from('career_tracks').select('key, name, description'),
      supabase.from('quiz_track_scores').select('track_key, score').eq('user_id', uid).order('score', { ascending: false }).limit(3),
      supabase.from('interest_results').select('tracks, confidence, needs_followup, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(1),
    ])
    if (t.error || s.error) {
      console.error('Loading results failed', t.error || s.error)
      setLoadFailed(true)
      setLoading(false)
      return
    }
    const map: Record<string, TrackInfo> = Object.fromEntries(((t.data || []) as TrackInfo[]).map((x) => [x.key, x]))
    setInfo(map)
    setQuizTop(((s.data || []) as { track_key: string; score: number }[]).map((x) => toShown(x, map)))

    const saved = !ir.error && ir.data?.[0]
    if (saved && !justFinished) {
      const tracks = ((saved.tracks || []) as AiReply['tracks']).slice(0, 3).map((x) => toShown(x, map))
      if (tracks.length) setAi({ tracks, confidence: saved.confidence ?? undefined, followups: [] })
    }
    setLoading(false)

    // Call the AI once: right after finishing the quiz, or if there's no saved result yet.
    if (!startedAi.current && (justFinished || !saved)) {
      startedAi.current = true
      void askAi(map)
    }
  }, [uid, justFinished, toShown, askAi])

  useEffect(() => { void load() }, [load])

  async function redo() {
    if (!supabase || !uid) return
    await supabase.from('profiles').update({ onboarding_step: 'quiz' }).eq('id', uid)
    await refreshProfile()
    onRedoQuiz()
  }

  if (loading) return <div className="card row" role="status"><span className="spinner" /><span className="muted">Loading your results…</span></div>
  if (loadFailed) return <ErrorNotice failure={LOAD_FAILED} onRetry={load} />

  const shown = ai?.tracks.length ? ai.tracks : quizTop
  const max = Math.max(...shown.map((x) => x.score), 0.0001)

  return (
    <div className="stack-m" style={{ maxWidth: 860 }}>
      <div className="row between">
        <div>
          <h2>Your top career tracks</h2>
          <p className="small muted">From your quiz answers and your details — not from gender, city or background.</p>
        </div>
        {ai?.confidence !== undefined && ai.confidence !== null && (
          <span className="chip teal num">Confidence {Math.round(Number(ai.confidence) * 100)}%</span>
        )}
      </div>

      {asking && (
        <div className="okbox row small" role="status"><span className="spinner" />Adding personal explanations to your tracks… (up to a minute)</div>
      )}
      {failure && (
        <>
          <ErrorNotice failure={failure} onRetry={() => void askAi(info)} retrying={asking} onDismiss={() => setFailure(null)} />
          {quizTop.length > 0 && <p className="small muted">Meanwhile, here are your tracks based on your quiz answers alone.</p>}
        </>
      )}

      {shown.length === 0 ? (
        <div className="card"><b>No tracks yet.</b><p className="small muted">Answer the quiz questions to see your tracks.</p><button className="btn sm" onClick={redo}>Go to the quiz</button></div>
      ) : (
        <div className="grid g3">
          {shown.map((t, i) => (
            <article key={t.key} className="card stack-s view">
              <div className="row between"><span className="chip teal num">#{i + 1}</span></div>
              <h3>{t.name}</h3>
              {t.description && <p className="small muted">{t.description}</p>}
              <div className="bar" style={{ marginTop: 4 }} aria-label={`Relative score ${Math.round((t.score / max) * 100)} out of 100`}>
                <i style={{ width: `${Math.max(8, Math.round((t.score / max) * 100))}%` }} />
              </div>
              {t.reason ? <p className="small" style={{ color: 'var(--ink2)' }}><b>Why:</b> {t.reason}</p>
                : asking ? <p className="small muted">Writing your explanation…</p> : null}
            </article>
          ))}
        </div>
      )}

      {ai && ai.followups.length > 0 && (
        <div className="card gold stack-s">
          <h3>Help us get this right</h3>
          <p className="small">Your answers pointed in a few directions. Have a think about these, then update your answers if you like:</p>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{ai.followups.map((q) => <li key={q}>{q}</li>)}</ul>
          <div><button className="btn sm" onClick={redo}>Update my quiz answers</button></div>
        </div>
      )}

      <div className="card tint row between">
        <span className="small"><b>Your full report with matched opportunities is coming next.</b></span>
        <Link className="btn pri" to="/dashboard">Go to my dashboard</Link>
      </div>
    </div>
  )
}
