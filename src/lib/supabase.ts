// Connects the website to our Supabase project (sign-in + database).
// Uses ONLY the public URL and the publishable/anon key, set in Vercel as environment variables.
// The secret / service_role key is never used here — it lives only in n8n.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// True when both settings exist. If they're missing, pages show a clear message instead of crashing.
export const supabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!.trim().replace(/\/+$/, ''), anonKey!.trim())
  : null
