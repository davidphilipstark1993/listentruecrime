import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BASE } from '@/lib/seo/config'
import { activateSubscriber } from '@/lib/newsletter/activate'
import { hashToken, isTokenExpired } from '@/lib/newsletter/optin'

function done(status: 'ok' | 'invalid' | 'expired') {
  return NextResponse.redirect(`${BASE}/newsletter/confirmed?status=${status}`, 303)
}

// GET so the emailed link works with one click. Confirming is idempotent: a
// mail scanner that pre-fetches the link and then the real click both end at "ok".
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  if (!/^[0-9a-f]{64}$/.test(token)) return done('invalid')

  const supabase = createAdminClient()
  const { data: sub } = await supabase
    .from('newsletter_subscribers')
    .select('email, first_name, status, confirm_sent_at')
    .eq('confirm_token_hash', hashToken(token))
    .maybeSingle()

  if (!sub) return done('invalid')
  if (sub.status === 'active') return done('ok')
  if (sub.status !== 'pending') return done('invalid') // unsubscribed / bounced / suppressed stay that way
  if (isTokenExpired(sub.confirm_sent_at)) return done('expired')

  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ status: 'active', confirmed_at: new Date().toISOString() })
    .eq('email', sub.email)
    .eq('status', 'pending')
  if (error) {
    console.error('Newsletter confirm error:', error.message)
    return done('invalid')
  }

  await activateSubscriber(supabase, sub.email, sub.first_name)
  return done('ok')
}
