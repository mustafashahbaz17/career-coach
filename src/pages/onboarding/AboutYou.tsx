// Onboarding step 1: "About you".
//  - Optional LinkedIn import at the top → calls the n8n webhook `linkedin-import` (90 s timeout) and pre-fills
//    ONLY empty fields, tagging them "from LinkedIn". The form always works without it.
//  - The form saves to the student's own `profiles` row on Continue, and moves them on to the quiz
//    (`onboarding_step = 'quiz'`). A refresh keeps everything because the form is filled from `profiles`.
// Reads: profiles (own row). Writes: profiles (own row). Webhooks: linkedin-import.
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { callWorkflow, messageFor, type WorkflowFailure } from '../../lib/callWorkflow'
import { useAuth } from '../../auth/AuthProvider'
import ErrorNotice from '../../components/ErrorNotice'
import {
  CITIES, DEGREES, GENDERS, LANGUAGES, LINKEDIN_RE, MAX_SKILLS, NATIONALITIES, STUDY_YEARS, UNIVERSITIES,
  applyImport, formFromProfile, profileUpdate, validate,
  type AboutForm, type Errors, type ExperienceRow, type FieldKey, type Mapped,
} from './aboutYouData'

const SAVE_FAILED = { code: 'save_failed', message: 'Something went wrong saving that. Please try again.', retryable: true }

export default function AboutYou({ editing, onSaved }: { editing: boolean; onSaved: () => void }) {
  const { session, profile, refreshProfile } = useAuth()
  const [form, setForm] = useState<AboutForm>(() => {
    const f = formFromProfile(profile)
    if (!f.full_name) f.full_name = (session?.user.user_metadata?.full_name as string | undefined) || ''
    return f
  })
  const [errors, setErrors] = useState<Errors>({})
  const [fromLinkedIn, setFromLinkedIn] = useState<Set<FieldKey>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  // LinkedIn import state
  const [liError, setLiError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importFailure, setImportFailure] = useState<WorkflowFailure | null>(null)
  const [importDone, setImportDone] = useState('')

  function set<K extends FieldKey>(key: K, value: AboutForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
    if (fromLinkedIn.has(key)) setFromLinkedIn((s) => { const n = new Set(s); n.delete(key); return n })
  }

  async function runImport() {
    setLiError('')
    setImportFailure(null)
    setImportDone('')
    const url = form.linkedin_url.trim()
    if (!LINKEDIN_RE.test(url)) {
      setLiError(messageFor('bad_url'))
      return
    }
    setImporting(true)
    const r = await callWorkflow<{ mapped: Mapped }>('linkedin-import', { linkedin_url: url }, { timeoutMs: 90000 })
    setImporting(false)
    // Keep the link on their profile whatever happened (best effort).
    if (supabase && session) void supabase.from('profiles').update({ linkedin_url: url }).eq('id', session.user.id)

    if (r.ok) {
      const { form: next, filled } = applyImport(form, r.data.mapped || {})
      setForm(next)
      setFromLinkedIn((s) => new Set([...s, ...filled]))
      setImportDone(filled.length ? `We filled in ${filled.length} field${filled.length === 1 ? '' : 's'} from LinkedIn. Check them below.` : 'We read your profile, but your form already had those details, so nothing was changed.')
      return
    }
    // The import prompt's rules: bad_url / profile_empty / limit messages as-is, anything else = "isn't working right now".
    if (['bad_url', 'profile_empty', 'limit_reached', 'not_signed_in'].includes(r.code)) setImportFailure(r)
    else setImportFailure({ ...r, code: 'import_failed', message: messageFor('import_failed'), retryable: true })
  }

  async function onContinue() {
    const e = validate(form)
    setErrors(e)
    if (Object.keys(e).length) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0)
      return
    }
    if (!supabase || !session) return
    setSaving(true)
    setSaveFailed(false)
    const next = profile?.onboarding_step === 'done' ? 'done' : 'quiz' // editing later never sends them back to the quiz
    const { error } = await supabase.from('profiles').update({ ...profileUpdate(form), onboarding_step: next }).eq('id', session.user.id)
    if (error) {
      console.error('Saving profile failed', error)
      setSaving(false)
      setSaveFailed(true)
      return
    }
    await refreshProfile()
    setSaving(false)
    window.scrollTo(0, 0)
    onSaved()
  }

  const errCount = Object.values(errors).filter(Boolean).length

  return (
    <div className="stack-l" ref={topRef}>
      {/* 1a. Optional LinkedIn import */}
      {!editing && (
        <section className="card tint stack-m">
          <div>
            <h3>Import from LinkedIn <span className="muted small" style={{ fontWeight: 600 }}>(optional)</span></h3>
            <p className="small muted">We read your public profile and fill in what we can. You check everything before saving.</p>
          </div>
          <label className="field">
            <span className="label">Your LinkedIn profile link (optional)</span>
            <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'stretch' }}>
              <input
                className="inp grow" type="url" inputMode="url" autoComplete="url"
                placeholder="https://www.linkedin.com/in/your-name"
                value={form.linkedin_url}
                onChange={(e) => { set('linkedin_url', e.target.value); setLiError('') }}
                aria-invalid={liError ? 'true' : undefined}
                disabled={importing}
              />
            </div>
            {liError && <span className="small" style={{ color: 'var(--coral-d)' }}>{liError}</span>}
          </label>
          <div className="row">
            <button type="button" className="btn pri" onClick={runImport} disabled={importing || !form.linkedin_url.trim()}>
              {importing ? <><span className="spinner" /> Importing…</> : 'Import my details'}
            </button>
            <span className="small muted">Or skip this and fill in the form below.</span>
          </div>
          {importing && <div className="okbox row small" role="status"><span className="spinner" />Reading your public profile, this can take up to a minute...</div>}
          {importDone && <div className="okbox small" role="status">{importDone}</div>}
          {importFailure && <ErrorNotice failure={importFailure} onRetry={runImport} retrying={importing} onDismiss={() => setImportFailure(null)} />}
        </section>
      )}

      {/* 1b. The form */}
      <section className="card stack-l">
        {errCount > 0 && (
          <div className="err" role="alert"><b>Please fix the {errCount === 1 ? 'highlighted field' : `${errCount} highlighted fields`} below.</b></div>
        )}

        <Group title="You">
          <div className="grid g2">
            <Field label="Full name" required error={errors.full_name} li={fromLinkedIn.has('full_name')}>
              <input className="inp" autoComplete="name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} aria-invalid={errors.full_name ? 'true' : undefined} />
            </Field>
            <Field label="City" required error={errors.city} li={fromLinkedIn.has('city')}>
              <select className="inp" value={form.city} onChange={(e) => set('city', e.target.value)} aria-invalid={errors.city ? 'true' : undefined}>
                <option value="">Choose…</option>
                {CITIES.map((c) => <option key={c}>{c}</option>)}
                <option value="Other">Other</option>
              </select>
            </Field>
            {form.city === 'Other' && (
              <Field label="Your city" required error={errors.cityOther}>
                <input className="inp" value={form.cityOther} onChange={(e) => set('cityOther', e.target.value)} aria-invalid={errors.cityOther ? 'true' : undefined} />
              </Field>
            )}
            <Field label="Year of birth" error={errors.birth_year} hint="Optional">
              <input className="inp" inputMode="numeric" placeholder="e.g. 2003" value={form.birth_year} onChange={(e) => set('birth_year', e.target.value.replace(/\D/g, '').slice(0, 4))} aria-invalid={errors.birth_year ? 'true' : undefined} />
            </Field>
          </div>
        </Group>

        <Group title="Education">
          <div className="grid g2">
            <Field label="University" required error={errors.university} li={fromLinkedIn.has('university')} wide hint="Start typing to search, or type your own">
              <input className="inp" list="universities" value={form.university} onChange={(e) => set('university', e.target.value)} aria-invalid={errors.university ? 'true' : undefined} />
              <datalist id="universities">{UNIVERSITIES.map((u) => <option key={u} value={u} />)}</datalist>
            </Field>
            <Field label="Degree" required error={errors.degree} li={fromLinkedIn.has('degree')}>
              <select className="inp" value={form.degree} onChange={(e) => set('degree', e.target.value)} aria-invalid={errors.degree ? 'true' : undefined}>
                <option value="">Choose…</option>
                {DEGREES.map((d) => <option key={d}>{d}</option>)}
                <option value="Other">Other</option>
              </select>
            </Field>
            {form.degree === 'Other' && (
              <Field label="Your degree" required error={errors.degreeOther}>
                <input className="inp" value={form.degreeOther} onChange={(e) => set('degreeOther', e.target.value)} aria-invalid={errors.degreeOther ? 'true' : undefined} />
              </Field>
            )}
            <Field label="Major / field of study" required error={errors.major} li={fromLinkedIn.has('major')}>
              <input className="inp" placeholder="e.g. Accounting and Finance" value={form.major} onChange={(e) => set('major', e.target.value)} aria-invalid={errors.major ? 'true' : undefined} />
            </Field>
            <Field label="Current year" required error={errors.study_year}>
              <select className="inp" value={form.study_year} onChange={(e) => set('study_year', e.target.value)} aria-invalid={errors.study_year ? 'true' : undefined}>
                <option value="">Choose…</option>
                {STUDY_YEARS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Expected graduation year" required error={errors.grad_year} li={fromLinkedIn.has('grad_year')}>
              <input className="inp" inputMode="numeric" placeholder="e.g. 2027" value={form.grad_year} onChange={(e) => set('grad_year', e.target.value.replace(/\D/g, '').slice(0, 4))} aria-invalid={errors.grad_year ? 'true' : undefined} />
            </Field>
            <Field label="CGPA" error={errors.cgpa} hint="Optional — e.g. 3.25">
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input className="inp grow" inputMode="decimal" placeholder="3.25" value={form.cgpa} onChange={(e) => set('cgpa', e.target.value.replace(/[^\d.]/g, '').slice(0, 4))} aria-invalid={errors.cgpa ? 'true' : undefined} aria-label="CGPA" />
                <span className="small muted">out of</span>
                <select className="inp" style={{ width: 'auto' }} value={form.cgpa_scale} onChange={(e) => { set('cgpa_scale', e.target.value as '4.0' | '5.0'); setErrors((x) => ({ ...x, cgpa: undefined })) }} aria-label="CGPA scale">
                  <option>4.0</option>
                  <option>5.0</option>
                </select>
              </div>
            </Field>
          </div>
        </Group>

        <Group title="Skills and experience">
          <Field label={`Skills (up to ${MAX_SKILLS})`} error={errors.skills} li={fromLinkedIn.has('skills')} wide group hint="Type a skill and press Enter or comma">
            <TagInput values={form.skills} onChange={(v) => set('skills', v)} max={MAX_SKILLS} />
          </Field>
          <Field label="Languages" li={fromLinkedIn.has('languages')} wide group>
            <div className="row" style={{ gap: 8 }}>
              {LANGUAGES.map((l) => {
                const on = form.languages.includes(l)
                return (
                  <button key={l} type="button" className="chip" aria-pressed={on} onClick={() => set('languages', on ? form.languages.filter((x) => x !== l) : [...form.languages, l])}>
                    {on ? '✓ ' : ''}{l}
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label="Experience" li={fromLinkedIn.has('experience')} wide group hint="Internships, part-time jobs and society roles all count.">
            <ExperienceList rows={form.experience} onChange={(rows) => set('experience', rows)} />
          </Field>
        </Group>

        <details className="card flat" style={{ padding: '4px 16px' }} open={Boolean(form.gender || form.nationality)}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, padding: '12px 0', minHeight: 44 }}>Optional, used only to check eligibility</summary>
          <p className="note small" style={{ marginTop: 0 }}>
            Some programmes and scholarships are limited to women or to Pakistani nationals. We use these only to check rules like that, never to decide what careers to suggest. You can skip them.
          </p>
          <div className="grid g2" style={{ margin: '12px 0 14px' }}>
            <Field label="Gender">
              <select className="inp" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Skip</option>
                {GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Nationality">
              <select className="inp" value={form.nationality} onChange={(e) => set('nationality', e.target.value)}>
                <option value="">Skip</option>
                {NATIONALITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
        </details>

        {saveFailed && <ErrorNotice failure={SAVE_FAILED} onRetry={onContinue} retrying={saving} />}

        <div className="row between">
          <span className="small muted"><span style={{ color: 'var(--coral-d)' }}>*</span> Required</span>
          <button type="button" className="btn pri" onClick={onContinue} disabled={saving || importing}>
            {saving ? <><span className="spinner" /> Saving…</> : editing ? 'Save changes' : 'Continue to the quiz'}
          </button>
        </div>
      </section>
    </div>
  )
}

// --- small building blocks ---

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset style={{ border: 0, padding: 0, marginInline: 0, marginBottom: 0, minWidth: 0 }} className="stack-m">
      <legend style={{ padding: 0, marginBottom: 12 }}><h3>{title}</h3></legend>
      {children}
    </fieldset>
  )
}

// group = several controls inside (tags, language chips, experience rows): use a plain box, not a <label>,
// so clicking the title doesn't press the first button inside.
function Field({ label, required, error, hint, li, wide, group, children }: {
  label: string; required?: boolean; error?: string; hint?: string; li?: boolean; wide?: boolean; group?: boolean; children: ReactNode
}) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className="field" style={wide ? { gridColumn: '1 / -1' } : undefined} {...(group ? { role: 'group', 'aria-label': label } : {})}>
      <span className="label">
        {label}{required && <span style={{ color: 'var(--coral-d)' }}> *</span>}{' '}
        {li && <span className="chip teal" style={{ fontSize: 11, padding: '1px 7px' }}>from LinkedIn</span>}
      </span>
      {children}
      {error ? <span className="small" style={{ color: 'var(--coral-d)' }}>{error}</span> : hint ? <span className="small muted">{hint}</span> : null}
    </Tag>
  )
}

function TagInput({ values, onChange, max }: { values: string[]; onChange: (v: string[]) => void; max: number }) {
  const [text, setText] = useState('')
  const full = values.length >= max
  function add(raw: string) {
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (!parts.length) return
    const next = [...values]
    for (const p of parts) if (next.length < max && !next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 40))
    onChange(next)
    setText('')
  }
  return (
    <div className="stack-s">
      {values.length > 0 && (
        <div className="row" style={{ gap: 6 }}>
          {values.map((v) => (
            <span key={v} className="chip teal">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} style={{ border: 0, background: 'none', cursor: 'pointer', padding: '0 0 0 4px', fontSize: 15, lineHeight: 1, color: 'inherit' }}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input
          className="inp grow" value={text} disabled={full}
          placeholder={full ? `That's ${max} — remove one to add another` : 'e.g. Excel, Python, Public speaking'}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(text) } else if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1)) }}
          onBlur={() => add(text)}
        />
        <button type="button" className="btn sm" onClick={() => add(text)} disabled={full || !text.trim()}>Add</button>
      </div>
      <span className="small muted num">{values.length} / {max}</span>
    </div>
  )
}

const EMPTY_ROW: ExperienceRow = { title: '', org: '', start: '', end: '', description: '' }

function ExperienceList({ rows, onChange }: { rows: ExperienceRow[]; onChange: (r: ExperienceRow[]) => void }) {
  const list = useMemo(() => rows, [rows])
  const upd = (i: number, k: keyof ExperienceRow, v: string) => onChange(list.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  return (
    <div className="stack-m">
      {list.map((r, i) => (
        <div key={i} className="card flat stack-s" style={{ padding: 12 }}>
          <div className="row between"><b className="small">Role {i + 1}</b><button type="button" className="btn xs ghost" onClick={() => onChange(list.filter((_, j) => j !== i))}>Remove</button></div>
          <div className="grid g2" style={{ gap: 10 }}>
            <input className="inp" aria-label={`Role ${i + 1} title`} placeholder="Title, e.g. Marketing Intern" value={r.title} onChange={(e) => upd(i, 'title', e.target.value)} />
            <input className="inp" aria-label={`Role ${i + 1} organisation`} placeholder="Organisation" value={r.org} onChange={(e) => upd(i, 'org', e.target.value)} />
            <input className="inp" aria-label={`Role ${i + 1} start`} placeholder="Start, e.g. Jun 2025" value={r.start} onChange={(e) => upd(i, 'start', e.target.value)} />
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input className="inp grow" aria-label={`Role ${i + 1} end`} placeholder="End, e.g. Aug 2025" value={r.end === 'Present' ? '' : r.end} disabled={r.end === 'Present'} onChange={(e) => upd(i, 'end', e.target.value)} />
              <label className="check small" style={{ whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={r.end === 'Present'} onChange={(e) => upd(i, 'end', e.target.checked ? 'Present' : '')} />Present
              </label>
            </div>
          </div>
          <input className="inp" aria-label={`Role ${i + 1} description`} placeholder="One line on what you did" maxLength={200} value={r.description} onChange={(e) => upd(i, 'description', e.target.value)} />
        </div>
      ))}
      <button type="button" className="btn sm" onClick={() => onChange([...list, { ...EMPTY_ROW }])} disabled={list.length >= 10} style={{ alignSelf: 'flex-start' }}>
        + Add {list.length ? 'another role' : 'a role'}
      </button>
    </div>
  )
}
