import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { deleteSendGridContact } from '@/lib/email/sendgrid-contacts'

interface Props {
  params: Promise<{ id: string }>
}

// DELETE: admin permanently removes a subscriber from the list. Weekly sends
// go to active rows in newsletter_subscribers, so once the row is gone they
// get nothing further. Also removes the SendGrid Marketing contact (best effort).
export async function DELETE(_req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const admin = createAdminClient()

  const { data: subscriber, error } = await admin
    .from('newsletter_subscribers')
    .delete()
    .eq('id', id)
    .select('email')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subscriber) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })

  if (process.env.SENDGRID_API_KEY) {
    try {
      await deleteSendGridContact(subscriber.email)
    } catch (err) {
      // The subscriber is already removed here, which is what stops sends.
      console.error('SendGrid contact delete error:', err)
    }
  }

  return NextResponse.json({ ok: true })
}
