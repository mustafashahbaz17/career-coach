// The ONE helper every page uses to call our n8n backend (see "Website ⇄ n8n webhook contract" in the briefs).
//
// What it does, in order:
//   1. Builds the address: VITE_N8N_BASE_URL + '/' + path   (e.g. https://n8n.devplusops.com/webhook/onboard-tracks)
//   2. Sends POST with a JSON body and the header  Authorization: Bearer <the student's Supabase access token>
//      — n8n uses that token to check who is calling.
//   3. Gives up after options.timeoutMs (default 60 s; linkedin-import uses 90 s).
//   4. Always returns  { ok: true, data }  or  { ok: false, code, message, retryable, used?, limit? }.  It never throws,
//      so a page can never crash because n8n is down.
//
// Rules:
//   HTTP 401                        → code 'not_signed_in' (we sign the student out; the page sends them to sign-in)
//   JSON reply with ok: false       → use the code n8n sent
//   timeout / network / bad JSON / any other HTTP error → code 'ai_unavailable'
import { supabase } from './supabase'

export type WorkflowCode =
  | 'not_signed_in'
  | 'bad_input'
  | 'bad_url'
  | 'profile_empty'
  | 'import_failed'
  | 'limit_reached'
  | 'ai_unavailable'

export type WorkflowFailure = {
  ok: false
  code: WorkflowCode | string
  message: string
  retryable: boolean
  used?: number
  limit?: number
}

export type WorkflowResult<T> = { ok: true; data: T } | WorkflowFailure

export type CallOptions = { timeoutMs?: number }

// The exact messages from the Shared contracts.
export function messageFor(code: string, limit?: number): string {
  switch (code) {
    case 'not_signed_in':
      return 'Please sign in again.'
    case 'bad_input':
      return "Something in the form isn't right. Please check it and try again."
    case 'bad_url':
      return "That doesn't look like a LinkedIn profile link."
    case 'profile_empty':
      return "We couldn't read details from that profile (it may be private). Please fill in the form below."
    case 'import_failed':
      return "LinkedIn import isn't working right now. You can try again or fill in the form below."
    case 'limit_reached':
      return limit === 0
        ? 'This is part of the Premium plan.'
        : `You've used all ${limit ?? 'of these'} this month. They reset on the 1st, or you can upgrade.`
    case 'ai_unavailable':
    default:
      return 'Our AI is having a moment. Your work is saved; please try again.'
  }
}

// Which codes are worth a "Try again" button if n8n doesn't say.
const RETRYABLE_BY_DEFAULT = new Set(['ai_unavailable', 'import_failed'])

function failure(code: string, extra: Partial<WorkflowFailure> = {}): WorkflowFailure {
  return {
    ok: false,
    code,
    message: messageFor(code, extra.limit),
    retryable: extra.retryable ?? RETRYABLE_BY_DEFAULT.has(code),
    ...(extra.used !== undefined ? { used: extra.used } : {}),
    ...(extra.limit !== undefined ? { limit: extra.limit } : {}),
  }
}

// The core, without Supabase, so it can be tested on its own.
export async function callWorkflowWith<T = Record<string, unknown>>(
  baseUrl: string | undefined,
  accessToken: string | undefined,
  path: string,
  body: unknown = {},
  options: CallOptions = {},
  fetchImpl: typeof fetch = fetch,
): Promise<WorkflowResult<T>> {
  if (!accessToken) return failure('not_signed_in')
  if (!baseUrl) {
    console.error('VITE_N8N_BASE_URL is not set')
    return failure('ai_unavailable')
  }

  const url = `${baseUrl.trim().replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 60000)

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    })

    if (res.status === 401) return failure('not_signed_in')

    let json: unknown
    try {
      json = await res.json()
    } catch {
      console.error(`n8n ${path}: reply was not JSON (HTTP ${res.status})`)
      return failure('ai_unavailable')
    }

    if (json && typeof json === 'object' && (json as { ok?: unknown }).ok === false) {
      const j = json as { code?: string; retryable?: boolean; used?: number; limit?: number }
      return failure(j.code || 'ai_unavailable', { retryable: j.retryable, used: j.used, limit: j.limit })
    }

    if (!res.ok || !json || typeof json !== 'object' || (json as { ok?: unknown }).ok !== true) {
      console.error(`n8n ${path}: unexpected reply (HTTP ${res.status})`, json)
      return failure('ai_unavailable')
    }

    const { ok: _ok, ...data } = json as Record<string, unknown>
    void _ok
    return { ok: true, data: data as T }
  } catch (err) {
    // Timeout (abort), network down, CORS blocked, n8n offline…
    console.error(`n8n ${path}: request failed`, err)
    return failure('ai_unavailable')
  } finally {
    clearTimeout(timer)
  }
}

// What pages call:  const r = await callWorkflow('onboard-tracks', {})
export async function callWorkflow<T = Record<string, unknown>>(
  path: string,
  body: unknown = {},
  options: CallOptions = {},
): Promise<WorkflowResult<T>> {
  let token: string | undefined
  try {
    token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined
  } catch {
    token = undefined
  }

  const result = await callWorkflowWith<T>(import.meta.env.VITE_N8N_BASE_URL as string | undefined, token, path, body, options)

  // Not signed in any more: sign out here. The app notices and private pages send the student to /signin.
  if (!result.ok && result.code === 'not_signed_in' && supabase) {
    await supabase.auth.signOut().catch(() => undefined)
  }
  return result
}
