import { createClient } from '@supabase/supabase-js'
import { sanitizeEnv } from '@/lib/utils'

// Service-role client — use only in API routes / server actions
// NEVER expose to the browser
export function createAdminClient() {
  return createClient(
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    sanitizeEnv(process.env.SUPABASE_SERVICE_ROLE_KEY!),
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
