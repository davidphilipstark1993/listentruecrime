import { sanitizeEnv } from '@/lib/utils'

/**
 * Upserts a contact into SendGrid Marketing Contacts. SendGrid's contact
 * upsert is processed asynchronously; the returned job_id is what we can
 * capture synchronously here (not a final contact id).
 */
export async function subscribeSendGrid(email: string, firstName?: string | null): Promise<string> {
  const res = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${sanitizeEnv(process.env.SENDGRID_API_KEY!)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      list_ids: process.env.SENDGRID_LIST_ID ? [process.env.SENDGRID_LIST_ID] : undefined,
      contacts: [{ email, first_name: firstName || undefined }],
    }),
  })
  if (!res.ok) throw new Error(`SendGrid API error ${res.status}: ${await res.text()}`)
  const { job_id } = await res.json()
  return job_id as string
}
