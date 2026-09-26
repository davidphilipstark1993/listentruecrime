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

/**
 * Deletes a contact from SendGrid Marketing Contacts by email. Returns false
 * if SendGrid has no contact for that address. SendGrid processes the
 * delete asynchronously.
 */
export async function deleteSendGridContact(email: string): Promise<boolean> {
  const headers = {
    Authorization: `Bearer ${sanitizeEnv(process.env.SENDGRID_API_KEY!)}`,
    'Content-Type': 'application/json',
  }

  const search = await fetch('https://api.sendgrid.com/v3/marketing/contacts/search/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({ emails: [email] }),
  })
  if (search.status === 404) return false
  if (!search.ok) throw new Error(`SendGrid API error ${search.status}: ${await search.text()}`)
  const { result } = await search.json()
  const contactId: string | undefined = result?.[email]?.contact?.id
  if (!contactId) return false

  const res = await fetch(`https://api.sendgrid.com/v3/marketing/contacts?ids=${encodeURIComponent(contactId)}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error(`SendGrid API error ${res.status}: ${await res.text()}`)
  return true
}
