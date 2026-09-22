import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { CAMPAIGN_TIMING_VALUES, PROMOTION_INTEREST_VALUES } from '@/lib/promotion/packages'
import { sendPromotionEnquiryAdminEmail, sendPromotionEnquiryConfirmationEmail } from '@/lib/email/promotion-enquiry'

// Public endpoint for /promote-your-podcast/contact. Saves the enquiry
// first, then sends the internal notification and the enquirer's
// confirmation. A database failure still notifies admins (flagged as
// unsaved) so a lead is never silently lost.

const MIN_FILL_MS = 3000 // real people don't complete this form in under 3s
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform(v => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .refine(v => !v || z.string().url().safeParse(v).success, 'Enter a valid URL')
  .transform(v => v || null)

const enquirySchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  podcast_name: z.string().trim().min(1, 'Enter your podcast name').max(200),
  podcast_website: optionalUrl,
  rss_feed: optionalUrl,
  package_interest: z.enum(PROMOTION_INTEREST_VALUES, { errorMap: () => ({ message: 'Choose what you are interested in' }) }),
  campaign_timing: z.enum(CAMPAIGN_TIMING_VALUES).nullable().optional().transform(v => v ?? null),
  message: z.string().trim().max(3000).optional().transform(v => v || null),
  newsletter_opt_in: z.boolean().optional().default(false),
  consent: z.literal(true, { errorMap: () => ({ message: 'Please confirm we can use these details to reply' }) }),
  // Spam protection — see the enquiry form
  website_url_confirm: z.string().optional(),
  started_at: z.number().optional(),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = enquirySchema.safeParse(body)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return NextResponse.json({ error: 'Please check the highlighted fields', fieldErrors }, { status: 400 })
  }

  const { consent: _consent, website_url_confirm, started_at, ...enquiry } = parsed.data

  // Honeypot filled or impossibly fast submission — pretend success so bots
  // get no signal, but store and send nothing.
  if (website_url_confirm || (started_at && Date.now() - started_at < MIN_FILL_MS)) {
    return NextResponse.json({ ok: true })
  }

  const supabase = createAdminClient()

  // Double-click / resubmit guard: an identical enquiry in the last few
  // minutes is treated as already received.
  const { data: recent } = await supabase
    .from('podcast_promotion_enquiries')
    .select('id')
    .eq('email', enquiry.email)
    .eq('podcast_name', enquiry.podcast_name)
    .gte('created_at', new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString())
    .limit(1)
  if (recent?.length) return NextResponse.json({ ok: true })

  const { data: saved, error: insertError } = await supabase
    .from('podcast_promotion_enquiries')
    .insert(enquiry)
    .select('id')
    .single()

  if (insertError) console.error('Promotion enquiry insert error:', insertError.message)

  const record = { ...enquiry, id: saved?.id ?? '' }
  const [adminSent] = await Promise.all([
    sendPromotionEnquiryAdminEmail(record, !insertError),
    sendPromotionEnquiryConfirmationEmail(record),
  ])

  if (insertError && !adminSent) {
    return NextResponse.json(
      { error: 'Sorry, we could not send your enquiry. Please try again or email info@listentruecrime.com.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
