import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Local dev only — generates an admin magic link without sending an email
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email') ?? 'listentruecrime@outlook.com'

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/implicit`,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const link = data.properties?.action_link
  return NextResponse.json({ link })
}
