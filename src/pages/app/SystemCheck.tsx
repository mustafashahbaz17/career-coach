// /system-check — a team-only test page (not linked anywhere). Sign-in required.
// It calls an n8n path that doesn't exist, to prove that a broken or missing workflow shows a polite
// message with "Try again" instead of crashing. Useful for Step 9 ("break it on purpose") and demo rehearsal.
// Reads / writes: nothing. Webhooks: calls a made-up path on purpose.
import { useState } from 'react'
import { callWorkflow, type WorkflowFailure } from '../../lib/callWorkflow'
import ErrorNotice from '../../components/ErrorNotice'

export default function SystemCheck() {
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<WorkflowFailure | null>(null)
  const [okText, setOkText] = useState('')
  const base = (import.meta.env.VITE_N8N_BASE_URL as string | undefined) || '(not set)'

  async function run() {
    setBusy(true)
    setFailure(null)
    setOkText('')
    const r = await callWorkflow('system-check-path-that-does-not-exist', { test: true }, { timeoutMs: 15000 })
    setBusy(false)
    if (r.ok) setOkText('n8n replied OK (unexpected for a made-up path).')
    else setFailure(r)
  }

  return (
    <div className="wrap">
      <div className="placeholder card stack-m" style={{ textAlign: 'left', maxWidth: 640 }}>
        <span className="chip line">Team only</span>
        <h1 style={{ fontSize: 'clamp(24px,3vw,30px)' }}>System check</h1>
        <p className="muted small">
          n8n base URL: <span className="kbd">{base}</span>
        </p>
        <p className="small">This calls an n8n workflow that doesn’t exist. You should see the polite “Our AI is having a moment” message with a Try again button — not a crash or an endless spinner.</p>
        <button className="btn pri" onClick={run} disabled={busy}>
          {busy ? <><span className="spinner" /> Calling n8n…</> : 'Call a missing workflow'}
        </button>
        {failure && <ErrorNotice failure={failure} onRetry={run} retrying={busy} />}
        {okText && <div className="okbox">{okText}</div>}
      </div>
    </div>
  )
}
