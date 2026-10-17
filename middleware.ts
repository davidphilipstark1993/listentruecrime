import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { sanitizeEnv } from '@/lib/utils'
import { canonicalHubPath } from '@/lib/seo/hub-paths'

export async function middleware(request: NextRequest) {
  // Hub URLs are lowercase (/country/us, /platform/spotify). Send legacy
  // mixed-case and space-encoded versions to the canonical path with a 301
  // before doing any auth work.
  const canonicalPath = canonicalHubPath(request.nextUrl.pathname)
  if (canonicalPath) {
    const target = request.nextUrl.clone()
    target.pathname = canonicalPath
    return NextResponse.redirect(target, 301)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      // Redirect to the noindexed, robots-disallowed /auth/login rather than
      // an indexable marketing URL — an unauthenticated crawl of /admin must
      // never resolve to homepage content at a distinct, indexable address.
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|auth/error|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
