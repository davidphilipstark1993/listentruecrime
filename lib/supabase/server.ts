import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sanitizeEnv } from '@/lib/utils'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    }
  )
}
