import { sendNewsletterCampaignViaSendGrid } from './sendgrid-campaign'
import { sendNewsletterCampaignViaResend } from './resend-campaign'
import type { Newsletter } from '@/lib/types/database'

interface Recipient {
  email: string
}

/**
 * Picks whichever email provider is actually configured — mirrors the
 * sendgrid/resend fallback already used for subscribe-time emails in
 * app/api/newsletter/route.ts, so the bulk "send issue to everyone" path
 * doesn't silently require a provider that isn't set up.
 */
export async function sendNewsletterCampaign(
  newsletter: Pick<Newsletter, 'id' | 'title' | 'html_content' | 'plain_text_content'>,
  recipients: Recipient[]
): Promise<{ campaignId: string; sentCount: number }> {
  if (process.env.SENDGRID_API_KEY) return sendNewsletterCampaignViaSendGrid(newsletter, recipients)
  if (process.env.RESEND_API_KEY) return sendNewsletterCampaignViaResend(newsletter, recipients)
  throw new Error('No email provider configured — set SENDGRID_API_KEY or RESEND_API_KEY')
}
