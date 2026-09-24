import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/admin-auth'

/**
 * Public podcast pages are ISR-cached (revalidate = 3600), and the admin
 * podcast form writes straight to Supabase from the browser — so without
 * this, an edit (e.g. a new image_url) doesn't show on the live site for up
 * to an hour. The form calls this after every successful save.
 *
 * Revalidates the whole layout rather than a hand-picked list of paths: a
 * podcast appears on its own page, the homepage, browse, category, country
 * and platform listings, and missing one of those is exactly the "I saved
 * but nothing changed" bug. Pages only regenerate on their next visit.
 */
export async function POST() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  revalidatePath('/', 'layout')
  return NextResponse.json({ ok: true })
}
