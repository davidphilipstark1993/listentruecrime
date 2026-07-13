import { createClient } from '@supabase/supabase-js'

// Service-role client — use only in API routes / server actions
// NEVER expose to the browser
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
