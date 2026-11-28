// Shared by the Matches page ("Save to tracker") and the Tracker page ("Add a card").
// The Free plan tracks up to 10 applications (see the plan cards on the landing page); Pro and Premium are unlimited.
// The database doesn't enforce this, so the website counts before adding (as agreed in supabase/04_core_features.sql).
import { supabase } from './supabase'

export const FREE_TRACKER_LIMIT = 10
export const TRACKER_FULL = `The Free plan tracks up to ${FREE_TRACKER_LIMIT} applications. Remove one you no longer need, or see Pro for an unlimited tracker.`

export type NewApplication = {
  title: string
  organisation: string
  deadline: string | null
  apply_url: string | null
  opportunity_id?: string | null
  status?: string
}

export type AddResult = { ok: true; id: string | null } | { ok: false; reason: 'full' | 'duplicate' | 'failed' }

export async function addApplication(plan: string | null | undefined, app: NewApplication): Promise<AddResult> {
  if (!supabase) return { ok: false, reason: 'failed' }
  if (!plan || plan === 'free') {
    const { count, error } = await supabase.from('applications').select('id', { count: 'exact', head: true })
    if (error) { console.error('Counting applications failed', error); return { ok: false, reason: 'failed' } }
    if ((count ?? 0) >= FREE_TRACKER_LIMIT) return { ok: false, reason: 'full' }
  }
  const { data, error } = await supabase.from('applications')
    .insert({ status: 'saved', ...app }).select('id').single()
  if (error) {
    // 23505 = this opportunity is already on the student's board (one card per opportunity)
    if (error.code === '23505') return { ok: false, reason: 'duplicate' }
    console.error('Adding application failed', error)
    return { ok: false, reason: 'failed' }
  }
  return { ok: true, id: (data as { id: string } | null)?.id ?? null }
}
