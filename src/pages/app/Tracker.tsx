// /tracker — Application tracker: every application on one board (no AI).
//  - Columns by status: Saved, Applied, Interview, Offer, Rejected, Withdrawn (applications.status).
//  - Cards come from "Save to tracker" on the Matches page, or students add their own here.
//  - Move a card with its "Move to" menu (works everywhere) or by dragging it to another column (desktop).
//  - Each card has a Reminders switch (applications.remind). n8n's reminder workflow emails 3 days and 1 day
//    before the deadline, only for cards still in Saved, and only if the account's Email reminders switch is on.
//  - Free plan: up to 10 cards (src/lib/tracker.ts). Pro and Premium: unlimited.
// Reads/writes: applications (own), profiles.email_reminders (own). Webhooks: none.
import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../auth/AuthProvider'
import ErrorNotice from '../../components/ErrorNotice'
import EmailRemindersToggle from '../../components/EmailRemindersToggle'
import BaraPose from '../../components/mascot/BaraPose'
import { deadlineText, normaliseUrl, todayPk } from '../../lib/deadlines'
import { addApplication, FREE_TRACKER_LIMIT, TRACKER_FULL } from '../../lib/tracker'

const STATUSES = [
  { key: 'saved', label: 'Saved' },
  { key: 'applied', label: 'Applied' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'withdrawn', label: 'Withdrawn' },
] as const
type Status = (typeof STATUSES)[number]['key']

type App = {
  id: string
  opportunity_id: string | null
  title: string
  organisation: string
  apply_url: string | null
  deadline: string | null
  status: Status
  applied_on: string | null
  remind: boolean
}

const LOAD_FAILED = { code: 'load_failed', message: 'We couldn’t load your tracker. Please try again.', retryable: true }
const SAVE_FAILED = 'We couldn’t save that change. Please try again.'
const EMPTY_FORM = { title: '', organisation: '', deadline: '', link: '' }

export default function Tracker() {
  const { session, profile } = useAuth()
  const uid = session?.user.id
  const plan = (profile?.plan as string | undefined) || 'free'
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState<Status | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({})
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropOn, setDropOn] = useState<Status | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase || !uid) return
    setLoading(true)
    setLoadFailed(false)
    const { data, error } = await supabase.from('applications')
      .select('id, opportunity_id, title, organisation, apply_url, deadline, status, applied_on, remind')
      .order('deadline', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true })
    if (error) { console.error('Loading applications failed', error); setLoadFailed(true) }
    else setApps((data ?? []) as App[])
    setLoading(false)
  }, [uid])

  useEffect(() => { void load() }, [load])

  // Change one card: update the screen straight away, put it back if the database says no.
  async function patch(id: string, changes: Partial<App>) {
    if (!supabase) return
    const before = apps.find((a) => a.id === id)
    if (!before) return
    setNotice('')
    setApps((list) => list.map((a) => (a.id === id ? { ...a, ...changes } : a)))
    const { error } = await supabase.from('applications').update(changes).eq('id', id)
    if (error) {
      console.error('Updating application failed', error)
      setApps((list) => list.map((a) => (a.id === id ? before : a)))
      setNotice(SAVE_FAILED)
    }
  }

  function move(app: App, status: Status) {
    if (app.status === status) return
    const changes: Partial<App> = { status }
    if (status === 'applied' && !app.applied_on) changes.applied_on = todayPk()
    void patch(app.id, changes)
  }

  async function remove(id: string) {
    if (!supabase) return
    const before = apps
    setConfirmDelete(null)
    setApps((list) => list.filter((a) => a.id !== id))
    const { error } = await supabase.from('applications').delete().eq('id', id)
    if (error) { console.error('Deleting application failed', error); setApps(before); setNotice('We couldn’t remove that card. Please try again.') }
  }

  function openForm(status: Status) {
    setAdding(status)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setFormError('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!adding) return
    const errs: typeof formErrors = {}
    if (!form.title.trim()) errs.title = 'Please add a title.'
    if (!form.organisation.trim()) errs.organisation = 'Please add the organisation.'
    const url = form.link.trim() ? normaliseUrl(form.link) : null
    if (form.link.trim() && !url) errs.link = 'That doesn’t look like a web link.'
    setFormErrors(errs)
    if (Object.keys(errs).length) return
    setFormBusy(true)
    setFormError('')
    const r = await addApplication(plan, {
      title: form.title.trim(), organisation: form.organisation.trim(),
      deadline: form.deadline || null, apply_url: url, status: adding,
    })
    setFormBusy(false)
    if (!r.ok) { setFormError(r.reason === 'full' ? TRACKER_FULL : 'We couldn’t add that card. Please try again.'); return }
    setAdding(null)
    await load()
  }

  function onDrop(e: DragEvent, status: Status) {
    e.preventDefault()
    setDropOn(null)
    const app = apps.find((a) => a.id === (dragId ?? e.dataTransfer.getData('text/plain')))
    setDragId(null)
    if (app) move(app, status)
  }

  const isFree = plan === 'free'
  const full = isFree && apps.length >= FREE_TRACKER_LIMIT
  const emailOn = profile?.email_reminders !== false

  return (
    <div className="wrap" style={{ paddingTop: 'clamp(16px,3vw,30px)', paddingBottom: 48 }}>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,36px)' }}>Application tracker</h1>
          <p className="muted">Every application in one place. Move cards as things change, and we’ll remind you before deadlines.</p>
        </div>
        <div className="card flat tracker-settings">
          <EmailRemindersToggle />
        </div>
      </div>

      <div className="row between" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <span className="small muted">
          {isFree ? `${apps.length} of ${FREE_TRACKER_LIMIT} cards on the Free plan` : `${apps.length} card${apps.length === 1 ? '' : 's'}`}
          {' · '}<Link to="/matches">Find more in your matches</Link>
        </span>
        <button type="button" className="btn pri sm" onClick={() => openForm('saved')} disabled={full || loading || loadFailed}>+ Add an application</button>
      </div>
      {full && <div className="card tint small" style={{ marginBottom: 14 }}>{TRACKER_FULL} <Link to="/pricing">See plans</Link></div>}
      {notice && <div className="err small" role="alert" style={{ marginBottom: 14 }}>{notice}</div>}

      {adding && (
        <form className="card stack-m tracker-form" onSubmit={submit} noValidate aria-label="Add an application" style={{ marginBottom: 16 }}>
          <div className="row between"><h3 style={{ margin: 0 }}>Add an application</h3><span className="small muted">Goes into <b>{STATUSES.find((s) => s.key === adding)?.label}</b></span></div>
          <div className="tracker-form-grid">
            <label className="field"><span className="label">Title *</span>
              <input className="inp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Internship" aria-invalid={formErrors.title ? 'true' : undefined} autoFocus />
              {formErrors.title && <span className="small" style={{ color: 'var(--coral-d)' }}>{formErrors.title}</span>}
            </label>
            <label className="field"><span className="label">Organisation *</span>
              <input className="inp" value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} placeholder="e.g. Engro" aria-invalid={formErrors.organisation ? 'true' : undefined} />
              {formErrors.organisation && <span className="small" style={{ color: 'var(--coral-d)' }}>{formErrors.organisation}</span>}
            </label>
            <label className="field"><span className="label">Deadline</span>
              <input className="inp" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </label>
            <label className="field"><span className="label">Link</span>
              <input className="inp" type="url" inputMode="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" aria-invalid={formErrors.link ? 'true' : undefined} />
              {formErrors.link && <span className="small" style={{ color: 'var(--coral-d)' }}>{formErrors.link}</span>}
            </label>
          </div>
          {formError && <span className="small" role="alert" style={{ color: 'var(--coral-d)' }}>{formError}</span>}
          <div className="row" style={{ gap: 8 }}>
            <button type="submit" className="btn pri sm" disabled={formBusy}>{formBusy ? <><span className="spinner" /> Adding…</> : 'Add to tracker'}</button>
            <button type="button" className="btn ghost sm" onClick={() => setAdding(null)} disabled={formBusy}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="row" role="status"><span className="spinner" /><span className="muted">Loading your tracker…</span></div>
      ) : loadFailed ? (
        <ErrorNotice failure={LOAD_FAILED} onRetry={load} />
      ) : (
        <>
          {apps.length === 0 && !adding && (
            <div className="card row" style={{ gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <BaraPose pose="deadline" size={90} />
              <div className="stack-s" style={{ flex: 1, minWidth: 220 }}>
                <b>Your board is empty.</b>
                <span className="small muted">Save openings from your matches, or add ones you found yourself.</span>
                <div className="row" style={{ gap: 8 }}>
                  <Link className="btn pri sm" to="/matches">See my matches</Link>
                  <button type="button" className="btn sm" onClick={() => openForm('saved')}>Add my own</button>
                </div>
              </div>
            </div>
          )}
          <div className="board" role="list" aria-label="Applications by status">
            {STATUSES.map((s) => {
              const col = apps.filter((a) => a.status === s.key)
              return (
                <section
                  key={s.key} role="listitem" aria-label={`${s.label}, ${col.length} card${col.length === 1 ? '' : 's'}`}
                  className={`board-col${dropOn === s.key ? ' drop' : ''}`}
                  onDragOver={(e) => { if (dragId) { e.preventDefault(); setDropOn(s.key) } }}
                  onDragLeave={() => setDropOn((d) => (d === s.key ? null : d))}
                  onDrop={(e) => onDrop(e, s.key)}
                >
                  <header className="row between">
                    <b>{s.label} <span className="count num">{col.length}</span></b>
                    <button type="button" className="btn ghost sm add-here" onClick={() => openForm(s.key)} disabled={full} aria-label={`Add an application to ${s.label}`}>+</button>
                  </header>
                  {col.map((a) => (
                    <TrackerCard
                      key={a.id} app={a} emailOn={emailOn} dragging={dragId === a.id}
                      confirming={confirmDelete === a.id}
                      onDragStart={(e) => { setDragId(a.id); e.dataTransfer.setData('text/plain', a.id); e.dataTransfer.effectAllowed = 'move' }}
                      onDragEnd={() => { setDragId(null); setDropOn(null) }}
                      onMove={(st) => move(a, st)}
                      onRemind={(v) => void patch(a.id, { remind: v })}
                      onAskDelete={() => setConfirmDelete(a.id)}
                      onCancelDelete={() => setConfirmDelete(null)}
                      onDelete={() => void remove(a.id)}
                    />
                  ))}
                  {col.length === 0 && <p className="small muted board-empty">Nothing here</p>}
                </section>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function TrackerCard(props: {
  app: App; emailOn: boolean; dragging: boolean; confirming: boolean
  onDragStart: (e: DragEvent) => void; onDragEnd: () => void
  onMove: (s: Status) => void; onRemind: (v: boolean) => void
  onAskDelete: () => void; onCancelDelete: () => void; onDelete: () => void
}) {
  const { app: a } = props
  const d = deadlineText(a.deadline)
  const remindNote = !a.deadline ? 'Add a deadline to get reminders'
    : a.status !== 'saved' ? 'Reminders only go out while a card is in Saved'
    : !props.emailOn ? 'Email reminders are off for your account'
    : a.remind ? 'Emails 3 days and 1 day before' : ''
  return (
    <article className={`tcard${props.dragging ? ' dragging' : ''}`} draggable onDragStart={props.onDragStart} onDragEnd={props.onDragEnd}>
      <div className="row between" style={{ alignItems: 'flex-start', gap: 6, flexWrap: 'nowrap' }}>
        <b className="tcard-title">{a.title}</b>
        {!props.confirming && <button type="button" className="tcard-x" onClick={props.onAskDelete} aria-label={`Remove ${a.title}`} title="Remove">×</button>}
      </div>
      <span className="small muted">{a.organisation}</span>
      <span className="small" style={d.urgent && a.status === 'saved' ? { color: 'var(--coral-d)', fontWeight: 700 } : { color: '#5F6F70' }}>{d.text}</span>
      {a.apply_url && <a className="small" href={a.apply_url} target="_blank" rel="noopener noreferrer">Open link ↗<span className="sr-only"> for {a.title}</span></a>}

      <label className="switch-row small">
        <button type="button" role="switch" aria-checked={a.remind} className={`switch sm${a.remind ? ' on' : ''}`} onClick={() => props.onRemind(!a.remind)}>
          <span className="knob" />
        </button>
        <span>Reminders{remindNote && <span className="muted"> · {remindNote}</span>}</span>
      </label>

      <label className="sr-only" htmlFor={`move-${a.id}`}>Move {a.title} to</label>
      <select id={`move-${a.id}`} className="inp tcard-move" value={a.status} onChange={(e) => props.onMove(e.target.value as Status)}>
        {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.key === a.status ? `In ${s.label}` : `Move to ${s.label}`}</option>)}
      </select>
      {props.confirming && (
        <div className="row small tcard-confirm" role="alert" style={{ gap: 6, flexWrap: 'wrap' }}>
          <span>Remove this card?</span>
          <button type="button" className="btn sm cor" onClick={props.onDelete}>Remove</button>
          <button type="button" className="btn ghost sm" onClick={props.onCancelDelete}>Keep</button>
        </div>
      )}
    </article>
  )
}
