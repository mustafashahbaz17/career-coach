// Onboarding step 2: the interest quiz, loaded FROM THE DATABASE (nothing hard-coded).
//  - Reads `quiz_questions` (active, by position) and `quiz_options` (by position), plus the student's saved `quiz_responses`.
//  - One question per screen. Kinds: single (pick one), multi (pick up to max_choices), text (up to 400 characters).
//  - On Next: delete the student's rows for that question in `quiz_responses`, then insert the new ones
//    (one row per chosen option, or one row with text_answer). So a refresh resumes at the first unanswered question.
//  - After the last question: sets `profiles.onboarding_step = 'done'` and hands over to the results screen.
// Reads: quiz_questions, quiz_options, quiz_responses (own). Writes: quiz_responses (own), profiles.onboarding_step. Webhooks: none.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import ErrorNotice from '../../components/ErrorNotice'

type Question = { id: string; position: number; kind: 'single' | 'multi' | 'text'; prompt: string; help: string | null; max_choices: number | null; required: boolean }
type Option = { question_id: string; key: string; label: string; position: number }
type Answer = { keys: string[]; text: string }

const SAVE_FAILED = { code: 'save_failed', message: 'Something went wrong saving that. Please try again.', retryable: true }
const LOAD_FAILED = { code: 'load_failed', message: 'We couldn’t load the quiz. Please try again.', retryable: true }
const TEXT_MAX = 400

const empty = (): Answer => ({ keys: [], text: '' })
const same = (a: Answer, b: Answer) => a.text.trim() === b.text.trim() && a.keys.length === b.keys.length && a.keys.every((k) => b.keys.includes(k))
const isAnswered = (a: Answer | undefined) => Boolean(a && (a.keys.length || a.text.trim()))

export default function Quiz({ onBackToDetails, onFinished }: { onBackToDetails: () => void; onFinished: () => void }) {
  const { session, refreshProfile } = useAuth()
  const uid = session?.user.id
  const [questions, setQuestions] = useState<Question[]>([])
  const [options, setOptions] = useState<Record<string, Option[]>>({})
  const [saved, setSaved] = useState<Record<string, Answer>>({}) // what's in the database
  const [answers, setAnswers] = useState<Record<string, Answer>>({}) // what's on screen
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [hint, setHint] = useState('')

  const load = useCallback(async () => {
    if (!supabase || !uid) return
    setLoading(true)
    setLoadFailed(false)
    const [q, o, r] = await Promise.all([
      supabase.from('quiz_questions').select('id, position, kind, prompt, help, max_choices, required').eq('active', true).order('position'),
      supabase.from('quiz_options').select('question_id, key, label, position').order('position'),
      supabase.from('quiz_responses').select('question_id, option_key, text_answer').eq('user_id', uid),
    ])
    if (q.error || o.error || r.error) {
      console.error('Loading quiz failed', q.error || o.error || r.error)
      setLoadFailed(true)
      setLoading(false)
      return
    }
    const qs = (q.data || []) as Question[]
    const byQ: Record<string, Option[]> = {}
    for (const opt of (o.data || []) as Option[]) (byQ[opt.question_id] ||= []).push(opt)
    const sv: Record<string, Answer> = {}
    for (const row of (r.data || []) as { question_id: string; option_key: string | null; text_answer: string | null }[]) {
      const a = (sv[row.question_id] ||= empty())
      if (row.option_key) a.keys.push(row.option_key)
      if (row.text_answer) a.text = row.text_answer
    }
    setQuestions(qs)
    setOptions(byQ)
    setSaved(sv)
    setAnswers(Object.fromEntries(Object.entries(sv).map(([k, v]) => [k, { keys: [...v.keys], text: v.text }])))
    // Resume at the first unanswered question.
    const first = qs.findIndex((x) => !isAnswered(sv[x.id]))
    setIndex(first === -1 ? Math.max(qs.length - 1, 0) : first)
    setLoading(false)
  }, [uid])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="card row" role="status"><span className="spinner" /><span className="muted">Loading the quiz…</span></div>
  if (loadFailed) return <ErrorNotice failure={LOAD_FAILED} onRetry={load} />
  if (!questions.length) return <div className="card"><b>The quiz isn’t ready yet.</b><p className="muted small">We’re setting up the questions. Please check back soon.</p></div>

  const q = questions[index]
  const opts = options[q.id] || []
  const a = answers[q.id] || empty()
  const last = index === questions.length - 1
  const setA = (next: Answer) => { setAnswers((s) => ({ ...s, [q.id]: next })); setHint(''); setSaveFailed(false) }

  function toggle(key: string) {
    if (q.kind === 'single') return setA({ keys: [key], text: '' })
    const on = a.keys.includes(key)
    if (on) return setA({ ...a, keys: a.keys.filter((k) => k !== key) })
    if (q.max_choices && a.keys.length >= q.max_choices) return setHint(`You can pick up to ${q.max_choices}. Untick one to choose another.`)
    setA({ ...a, keys: [...a.keys, key] })
  }

  async function save(answer: Answer): Promise<boolean> {
    if (!supabase || !uid) return false
    if (saved[q.id] && same(saved[q.id], answer)) return true // nothing changed
    const del = await supabase.from('quiz_responses').delete().eq('user_id', uid).eq('question_id', q.id)
    if (del.error) { console.error(del.error); return false }
    const rows: { user_id: string; question_id: string; option_key?: string; text_answer?: string }[] = q.kind === 'text'
      ? (answer.text.trim() ? [{ user_id: uid, question_id: q.id, text_answer: answer.text.trim().slice(0, TEXT_MAX) }] : [])
      : answer.keys.map((k) => ({ user_id: uid, question_id: q.id, option_key: k }))
    if (rows.length) {
      const ins = await supabase.from('quiz_responses').insert(rows)
      if (ins.error) { console.error(ins.error); return false }
    }
    setSaved((s) => ({ ...s, [q.id]: answer }))
    return true
  }

  async function next(skip = false) {
    const answer = skip ? empty() : a
    if (!skip) {
      if (q.kind !== 'text' && q.required && !answer.keys.length) return setHint(q.kind === 'single' ? 'Pick one to continue.' : 'Pick at least one to continue.')
      if (q.kind === 'text' && q.required && !answer.text.trim()) return setHint('Write a line or two to continue.')
    }
    setSaving(true)
    setSaveFailed(false)
    const ok = await save(answer)
    if (!ok) { setSaving(false); setSaveFailed(true); return }
    if (skip) setAnswers((s) => ({ ...s, [q.id]: empty() }))
    if (!last) { setSaving(false); setIndex(index + 1); window.scrollTo(0, 0); return }
    await finish()
  }

  async function finish() {
    if (!supabase || !uid) return
    setFinishing(true)
    const { error } = await supabase.from('profiles').update({ onboarding_step: 'done' }).eq('id', uid)
    if (error) { console.error(error); setFinishing(false); setSaving(false); setSaveFailed(true); return }
    await refreshProfile()
    onFinished()
  }

  async function back() {
    if (index > 0) { setIndex(index - 1); setHint(''); setSaveFailed(false); return }
    // From question 1, go back to the About-you form.
    if (!supabase || !uid) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ onboarding_step: 'basic_info' }).eq('id', uid)
    setSaving(false)
    if (error) { setSaveFailed(true); return }
    await refreshProfile()
    onBackToDetails()
  }

  if (finishing)
    return (
      <div className="card stack-m" role="status" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto', width: 28, height: 28 }} />
        <h3>Working out your career tracks…</h3>
        <p className="muted small">This usually takes a few seconds.</p>
      </div>
    )

  const atMax = q.kind === 'multi' && q.max_choices ? a.keys.length >= q.max_choices : false
  const pct = Math.round(((index + (isAnswered(a) ? 1 : 0)) / questions.length) * 100)

  return (
    <div className="stack-m" style={{ maxWidth: 720 }}>
      <div>
        <div className="row between small"><b className="num">Question {index + 1} of {questions.length}</b><span className="muted num">{pct}%</span></div>
        <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${pct}%`, animation: 'none', transition: 'width .25s ease-out' }} /></div>
      </div>

      <fieldset key={q.id} className="card stack-m view" style={{ border: '1px solid var(--line)' }}>
        <legend style={{ position: 'absolute', left: -9999 }}>{q.prompt}</legend>
        <h2 style={{ fontSize: 'clamp(20px,2.4vw,24px)' }} aria-hidden="true">{q.prompt}</h2>
        {q.help && <p className="small muted" style={{ marginTop: -6 }}>{q.help}{q.kind === 'multi' && q.max_choices ? <> · <span className="num">{a.keys.length}/{q.max_choices}</span> chosen</> : null}</p>}

        {q.kind === 'text' ? (
          <div className="stack-s">
            <textarea className="inp" style={{ minHeight: 120 }} maxLength={TEXT_MAX} value={a.text} aria-label={q.prompt} onChange={(e) => setA({ keys: [], text: e.target.value })} />
            <span className="small muted num" style={{ textAlign: 'right' }}>{a.text.length} / {TEXT_MAX}</span>
          </div>
        ) : (
          <div className="grid g2" style={{ gap: 8 }}>
            {opts.map((o) => {
              const on = a.keys.includes(o.key)
              return (
                <label key={o.key} className="opt" style={!on && atMax ? { opacity: 0.55 } : undefined}>
                  <input
                    type={q.kind === 'single' ? 'radio' : 'checkbox'}
                    name={q.id}
                    checked={on}
                    onChange={() => toggle(o.key)}
                  />
                  {o.label}
                </label>
              )
            })}
          </div>
        )}

        {hint && <p className="small" role="alert" style={{ color: 'var(--coral-d)', margin: 0 }}>{hint}</p>}
        {saveFailed && <ErrorNotice failure={SAVE_FAILED} onRetry={() => next()} retrying={saving} />}

        <div className="row between">
          <button type="button" className="btn" onClick={back} disabled={saving}>{index === 0 ? '← Your details' : '← Back'}</button>
          <div className="row">
            {q.kind === 'text' && !q.required && <button type="button" className="btn ghost" onClick={() => next(true)} disabled={saving}>Skip</button>}
            <button type="button" className="btn pri" onClick={() => next()} disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : last ? 'See my tracks' : 'Next →'}
            </button>
          </div>
        </div>
      </fieldset>
    </div>
  )
}
