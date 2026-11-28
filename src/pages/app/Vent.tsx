// /vent — Vent space: a calm, private chat with Bara about recruitment stress (every plan).
//  - History comes from `vent_messages` (the student's own rows; n8n writes both sides after its safety check).
//  - Sending calls the n8n webhook `vent-message` with { message } (PROPOSED contract, see docs/PAGES.md).
//    Reply: { ok: true, reply, safety_label: 'ok'|'distress'|'crisis', show_helplines }.
//  - A small "not a crisis service" line with Rescue 1122 is always on screen. When n8n says show_helplines
//    (or labels the message 'crisis'), a clear helpline card appears with the reply. Helplines: src/lib/helplines.ts.
//  - "Delete my history" removes all the student's vent messages (allowed by row-level security).
// Reads: vent_messages (own). Writes: deletes own vent_messages. Webhooks: vent-message.
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { callWorkflow, type WorkflowFailure } from '../../lib/callWorkflow'
import { useAuth } from '../../auth/AuthProvider'
import ErrorNotice from '../../components/ErrorNotice'
import BaraPose from '../../components/mascot/BaraPose'
import { EMERGENCY, HELPLINES, type Helpline } from '../../lib/helplines'

const MAX_CHARS = 2000
const LOAD_FAILED = { code: 'load_failed', message: 'We couldn’t load your messages. Please try again.', retryable: true }
const DELETE_FAILED = { code: 'delete_failed', message: 'We couldn’t delete your messages. Please try again.', retryable: true }
const BAD_INPUT = "That message couldn't be sent. Please check it isn't empty or too long and try again."
// Clicking one fills the box; nothing is sent until the student presses Send.
const STARTERS = [
  'I didn’t get shortlisted and I’m feeling low.',
  'I have too many deadlines this week.',
  'Everyone around me seems to have an offer already.',
]

type Msg = { id: string; role: 'user' | 'assistant'; content: string; helplines?: boolean; pending?: boolean }
type Reply = { reply: string; safety_label?: 'ok' | 'distress' | 'crisis'; show_helplines?: boolean }
type Row = { id: string; role: 'user' | 'assistant'; content: string; showed_helplines: boolean }

export default function Vent() {
  const { session } = useAuth()
  const uid = session?.user.id
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState<WorkflowFailure | null>(null)
  const [lastText, setLastText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)
  const [showAllHelp, setShowAllHelp] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    if (!supabase || !uid) return
    setLoading(true)
    setLoadFailed(false)
    const { data, error } = await supabase.from('vent_messages')
      .select('id, role, content, showed_helplines')
      .eq('user_id', uid).order('created_at', { ascending: true }).limit(200)
    if (error) { console.error('Loading vent messages failed', error); setLoadFailed(true) }
    else setMsgs((data as Row[]).map((r) => ({ id: r.id, role: r.role, content: r.content, helplines: r.role === 'assistant' && r.showed_helplines })))
    setLoading(false)
  }, [uid])

  useEffect(() => { void load() }, [load])

  // Keep the newest message in view
  useEffect(() => {
    if (!loading) endRef.current?.scrollIntoView({ block: 'end', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [msgs.length, sending, loading])

  async function send(text: string) {
    const message = text.trim()
    if (!message || message.length > MAX_CHARS || sending) return
    setFailure(null)
    setLastText(message)
    const tempId = `pending-${Date.now()}`
    setMsgs((m) => [...m, { id: tempId, role: 'user', content: message, pending: true }])
    setDraft('')
    setSending(true)
    const r = await callWorkflow<Reply>('vent-message', { message })
    setSending(false)
    if (r.ok) {
      const helplines = Boolean(r.data.show_helplines) || r.data.safety_label === 'crisis'
      setMsgs((m) => [
        ...m.map((x) => (x.id === tempId ? { ...x, pending: false } : x)),
        { id: `reply-${Date.now()}`, role: 'assistant', content: r.data.reply || '…', helplines },
      ])
      return
    }
    // Not sent: take the bubble back out and put the words back in the box, so nothing is lost.
    setMsgs((m) => m.filter((x) => x.id !== tempId))
    setDraft(message)
    setFailure(r.code === 'bad_input' ? { ...r, message: BAD_INPUT, retryable: false } : r)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void send(draft)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter adds a new line (and never while typing with an input method)
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send(draft)
    }
  }

  async function deleteAll() {
    if (!supabase || !uid) return
    setDeleting(true)
    setDeleteFailed(false)
    const { error } = await supabase.from('vent_messages').delete().eq('user_id', uid)
    setDeleting(false)
    if (error) { console.error('Deleting vent messages failed', error); setDeleteFailed(true); return }
    setConfirmDelete(false)
    setFailure(null)
    setMsgs([])
  }

  const over = draft.length > MAX_CHARS
  const crisisShown = msgs.some((m) => m.helplines)

  return (
    <div className="wrap vent-page" style={{ paddingTop: 'clamp(16px,3vw,30px)' }}>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,36px)' }}>Vent space</h1>
          <p className="muted">Rejections, deadlines, pressure from home: say it here. Bara listens and helps you think it through. Take your time.</p>
        </div>
        <BaraPose pose="vent" size={96} label="Bara, sitting calmly" />
      </div>

      <div className="vent-grid">
        <section className="card vent-chat" aria-label="Your conversation with Bara">
          <div className="vent-log" role="log" aria-live="polite" aria-relevant="additions">
            {loading ? (
              <div className="row" role="status"><span className="spinner" /><span className="muted">Loading your messages…</span></div>
            ) : loadFailed ? (
              <ErrorNotice failure={LOAD_FAILED} onRetry={load} />
            ) : msgs.length === 0 && !sending ? (
              <div className="vent-empty stack-m">
                <p style={{ margin: 0 }}><b>Nothing here yet.</b> Write whatever is on your mind. There’s no right way to start.</p>
                <div className="row" style={{ gap: 8 }}>
                  {STARTERS.map((s) => (
                    <button key={s} type="button" className="chip line vent-starter" onClick={() => { setDraft(s); boxRef.current?.focus() }}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              msgs.map((m) => (
                <div key={m.id} className={`vent-msg ${m.role}`}>
                  {m.role === 'assistant' && m.helplines && <HelplineCard />}
                  <div className="vent-row">
                    {m.role === 'assistant' && <BaraPose pose="vent" size={34} motion="none" className="vent-avatar" />}
                    <div className={`vent-bubble${m.pending ? ' pending' : ''}`}>
                      <span className="sr-only">{m.role === 'user' ? 'You said: ' : 'Bara said: '}</span>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="vent-msg assistant" role="status">
                <div className="vent-row">
                  <BaraPose pose="vent" size={34} motion="none" className="vent-avatar" />
                  <div className="vent-bubble typing"><span className="sr-only">Bara is writing a reply</span><i /><i /><i /></div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {failure && (
            <ErrorNotice failure={failure} onRetry={() => void send(lastText)} retrying={sending} onDismiss={() => setFailure(null)} />
          )}

          <form className="vent-compose" onSubmit={onSubmit}>
            <label className="sr-only" htmlFor="vent-box">Your message</label>
            <textarea
              id="vent-box" ref={boxRef} className="inp" rows={3}
              placeholder="Type what’s on your mind…"
              value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKeyDown}
              aria-invalid={over ? 'true' : undefined} aria-describedby="vent-count"
              disabled={loading || loadFailed}
            />
            <div className="row between">
              <span id="vent-count" className="small muted num" style={over ? { color: 'var(--coral-d)' } : undefined}>
                {over ? `${draft.length - MAX_CHARS} characters too long` : `${draft.length} / ${MAX_CHARS}`} · Enter to send, Shift+Enter for a new line
              </span>
              <button type="submit" className="btn pri" disabled={sending || !draft.trim() || over || loading || loadFailed}>
                {sending ? <><span className="spinner" /> Sending…</> : 'Send'}
              </button>
            </div>
          </form>
        </section>

        <aside className="stack-m vent-side">
          <div className="card stack-s vent-help" aria-label="Helplines">
            <b>Not a crisis service</b>
            <p className="small" style={{ margin: 0 }}>
              Bara is an AI, not a counsellor. If you or someone else is in danger, call <a href={`tel:${EMERGENCY.dial}`}><b>{EMERGENCY.number}</b></a> now.
            </p>
            {crisisShown || showAllHelp ? (
              <HelplineList />
            ) : (
              <button type="button" className="btn sm ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setShowAllHelp(true)}>
                Show helplines
              </button>
            )}
          </div>

          <div className="card flat stack-s">
            <b>Your privacy</b>
            <p className="small muted" style={{ margin: 0 }}>
              Only you can read these messages. They’re sent to our AI to write Bara’s replies. Admins see daily counts of safety checks, never your words. You can delete everything at any time.
            </p>
            {!confirmDelete ? (
              <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setConfirmDelete(true)} disabled={msgs.length === 0 || loading}>
                Delete my history
              </button>
            ) : (
              <div className="stack-s vent-confirm" role="alert">
                <span className="small"><b>Delete all your Vent space messages?</b> This can’t be undone.</span>
                <div className="row" style={{ gap: 8 }}>
                  <button type="button" className="btn sm cor" onClick={() => void deleteAll()} disabled={deleting}>
                    {deleting ? <><span className="spinner" /> Deleting…</> : 'Yes, delete everything'}
                  </button>
                  <button type="button" className="btn sm ghost" onClick={() => { setConfirmDelete(false); setDeleteFailed(false) }} disabled={deleting}>Cancel</button>
                </div>
              </div>
            )}
            {deleteFailed && <ErrorNotice failure={DELETE_FAILED} onRetry={() => void deleteAll()} retrying={deleting} />}
          </div>
        </aside>
      </div>
    </div>
  )
}

// Shown right above Bara's reply when the safety check says the student may need more than a chat.
function HelplineCard() {
  return (
    <div className="vent-crisis" role="alert">
      <b>You don’t have to handle this alone.</b>
      <p className="small" style={{ margin: '.25em 0 .5em' }}>Please talk to a person who can help, today. These are free:</p>
      <HelplineList withEmergency />
    </div>
  )
}

function HelplineList({ withEmergency }: { withEmergency?: boolean }) {
  const list: Helpline[] = withEmergency ? [EMERGENCY, ...HELPLINES] : HELPLINES
  return (
    <ul className="vent-lines">
      {list.map((h) => (
        <li key={h.name}>
          <a href={`tel:${h.dial}`}><b>{h.number}</b></a> <span>{h.name}</span>
          <span className="small muted"> · {h.note}</span>
        </li>
      ))}
    </ul>
  )
}
