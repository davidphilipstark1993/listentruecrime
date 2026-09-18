import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Re-checks admin status server-side for an API route, independent of
 * middleware.ts's route-level gate — mirrors the pattern already used in
 * app/api/newsletter-submissions/*.ts. Every artwork-management endpoint
 * calls this before touching anything.
 */
export async function requireAdmin(): Promise<{ error: NextResponse | null }> {
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { error: null }
}
