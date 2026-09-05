import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewsletterCampaign } from '@/lib/email/newsletter-campaign'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, { params }: Props) {
  const { id } = await params
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: newsletter } = await admin.from('newsletters').select('*').eq('id', id).single()
  if (!newsletter) return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
  if (newsletter.status !== 'approved') {
    return NextResponse.json({ error: 'Newsletter must be approved before sending' }, { status: 400 })
  }
  if (!newsletter.html_content) {
    return NextResponse.json({ error: 'Newsletter has no generated content — approve it again' }, { status: 400 })
  }

  const { data: subscribers } = await admin
    .from('newsletter_subscribers')
    .select('email')
    .eq('status', 'active')

  if (!subscribers?.length) {
    return NextResponse.json({ error: 'No active subscribers to send to' }, { status: 400 })
  }

  try {
    const { campaignId, sentCount } = await sendNewsletterCampaign(newsletter, subscribers)

    await admin
      .from('newsletters')
      .update({ status: 'sent', sent_at: new Date().toISOString(), sendgrid_campaign_id: campaignId })
      .eq('id', id)

    return NextResponse.json({ ok: true, sentCount })
  } catch (err) {
    console.error('Newsletter send error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Send failed' }, { status: 500 })
  }
}
