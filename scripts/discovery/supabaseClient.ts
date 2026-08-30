import { createClient } from '@supabase/supabase-js'

// Standalone Supabase client for scripts run outside the Next.js request
// lifecycle (this GitHub Action script, not Vercel). Do not import
// lib/supabase/{admin,server,client}.ts here — those depend on next/headers
// and browser globals that don't exist in a plain Node/tsx process.
export function createDiscoveryClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}
