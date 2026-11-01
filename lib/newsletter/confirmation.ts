import type { SupabaseClient } from '@supabase/supabase-js'
import { sendConfirmationEmail } from '@/lib/email/newsletter-confirm'
import { confirmUrl, newConfirmToken } from './optin'

/**
 * Stores a fresh token hash, then emails the link. A failed send leaves
 * confirm_sent_at null so a retry isn't throttled. Issuing a new token
 * invalidates any link emailed earlier. Returns whether the email went out.
 */
export async function issueConfirmation(
  supabase: SupabaseClient,
  email: string,
  firstName?: string | null,
  opts: { reminder?: boolean } = {}
): Promise<boolean> {
  const { token, hash } = newConfirmToken()
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ confirm_token_hash: hash, confirm_sent_at: null })
    .eq('email', email)
  if (error) {
    console.error('Newsletter token save error:', error.message)
    return false
  }
  try {
    // Awaited: on serverless the function is frozen once the response is sent.
    await sendConfirmationEmail(email, confirmUrl(token), firstName, opts)
    await supabase.from('newsletter_subscribers').update({ confirm_sent_at: new Date().toISOString() }).eq('email', email)
    return true
  } catch (err) {
    console.error('Newsletter confirmation email error:', err)
    return false
  }
}
