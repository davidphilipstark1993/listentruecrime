import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { issueConfirmation } from '@/lib/newsletter/confirmation'
import {
  CONSENT_TEXT,
  MAX_SIGNUPS_PER_IP_PER_HOUR,
  canResendConfirmation,
  clientIp,
  hashIp,
} from '@/lib/newsletter/optin'

// Double opt-in: this endpoint only records a *pending* subscriber and emails a
// confirmation link. The subscriber becomes 'active' (and is synced to the
// provider / welcomed) in /api/newsletter/confirm.
//
// The response is identical whatever happens to the address (new, pending,
// already subscribed, unsubscribed, throttled), so the form can't be used to
// probe the list, and an existing unsubscribed/bounced/suppressed row is never
// reactivated by someone typing the address into a form.
export async function POST(req: Request) {
  const { email: rawEmail, first_name, source, consent } = await req.json()
  const email = typeof rawEmail === 'string' ? rawEmail.toLowerCase().trim() : ''

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  if (consent !== true) {
    return NextResponse.json({ error: 'Consent is required to subscribe' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const ok = NextResponse.json({ ok: true, confirmation_required: true })

  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id, status, confirm_sent_at')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    // A pending subscriber who didn't get / lost the email can ask again, with a cooldown.
    if (existing.status === 'pending' && canResendConfirmation(existing.confirm_sent_at)) {
      await issueConfirmation(supabase, email, first_name)
    }
    return ok
  }

  // Per-IP throttle so the form can't be used to mass-mail confirmation requests.
  const ipHash = hashIp(clientIp(req.headers))
  const { count: recent } = await supabase
    .from('newsletter_subscribers')
    .select('id', { count: 'exact', head: true })
    .eq('consent_ip_hash', ipHash)
    .gte('consent_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
  if ((recent ?? 0) >= MAX_SIGNUPS_PER_IP_PER_HOUR) return ok

  const { error: insertError } = await supabase.from('newsletter_subscribers').insert({
    email,
    first_name: first_name || null,
    source: source ?? 'unknown',
    consent: true,
    status: 'pending',
    consent_method: 'double_opt_in',
    consent_at: new Date().toISOString(),
    consent_text: CONSENT_TEXT,
    consent_ip_hash: ipHash,
  })
  if (insertError) {
    // 23505 = lost a race with a concurrent identical signup; nothing more to do.
    if (insertError.code !== '23505') {
      console.error('Newsletter insert error:', insertError.message)
      return NextResponse.json({ error: 'Subscription failed' }, { status: 500 })
    }
    return ok
  }

  await issueConfirmation(supabase, email, first_name)
  return ok
}
