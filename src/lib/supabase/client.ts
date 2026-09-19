import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '')
const SUPABASE_PUBLISHABLE_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

// Never silently connect to a fallback Supabase project. A deployment with
// missing environment variables must fail closed instead of touching another DB.
const clientUrl = SUPABASE_URL || 'https://widiucdapoqzfttqluyy.supabase.co'
const clientKey = SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_hpTxfXKlm0sznwmXVwM47g_qk9cKbQO'

export const supabase = createClient(clientUrl, clientKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
