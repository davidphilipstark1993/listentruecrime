import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sanitizeEnv } from '@/lib/utils'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL!),
      sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(`${origin}/auth/error?reason=${encodeURIComponent(error.message)}`)
  }

  const errorParam = searchParams.get('error_description') ?? searchParams.get('error')
  const suffix = errorParam ? `?reason=${encodeURIComponent(errorParam)}` : ''
  return NextResponse.redirect(`${origin}/auth/error${suffix}`)
}
