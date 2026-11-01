import { sanitizeEnv } from '@/lib/utils'

function authHeaders() {
  const apiKey = process.env.SENDGRID_API_KEY
  // Explicit, because sanitizeEnv(undefined) would throw a cryptic
  // "cannot read properties of undefined" that hides the real cause.
  if (!apiKey) throw new Error('SENDGRID_API_KEY is not set')
  return {
    Authorization: `Bearer ${sanitizeEnv(apiKey)}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Upserts a contact into SendGrid Marketing Contacts. SendGrid's contact
 * upsert is processed asynchronously; the returned job_id is what we can
 * capture synchronously here (not a final contact id). Use
 * findSendGridContactId to confirm the contact actually exists.
 */
export async function subscribeSendGrid(email: string, firstName?: string | null): Promise<string> {
  // sanitizeEnv like every other variable: a stray quote or trailing "\n"
  // pasted into SENDGRID_LIST_ID makes SendGrid reject the whole request.
  const listId = process.env.SENDGRID_LIST_ID ? sanitizeEnv(process.env.SENDGRID_LIST_ID) : ''
  const res = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      list_ids: listId ? [listId] : undefined,
      contacts: [{ email, first_name: firstName || undefined }],
    }),
  })
  if (!res.ok) throw new Error(`SendGrid API error ${res.status}: ${await res.text()}`)
  const { job_id } = await res.json()
  return job_id as string
}

/**
 * Looks a contact up by email in SendGrid Marketing Contacts. Returns its
 * contact id, or null if SendGrid has no such contact (yet). Read-only.
 */
export async function findSendGridContactId(email: string): Promise<string | null> {
  const search = await fetch('https://api.sendgrid.com/v3/marketing/contacts/search/emails', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ emails: [email] }),
  })
  if (search.status === 404) return null
  if (!search.ok) throw new Error(`SendGrid API error ${search.status}: ${await search.text()}`)
  const { result } = await search.json()
  return (result?.[email]?.contact?.id as string | undefined) ?? null
}

/**
 * Deletes a contact from SendGrid Marketing Contacts by email. Returns false
 * if SendGrid has no contact for that address. SendGrid processes the
 * delete asynchronously.
 */
export async function deleteSendGridContact(email: string): Promise<boolean> {
  const contactId = await findSendGridContactId(email)
  if (!contactId) return false

  const res = await fetch(`https://api.sendgrid.com/v3/marketing/contacts?ids=${encodeURIComponent(contactId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`SendGrid API error ${res.status}: ${await res.text()}`)
  return true
}
