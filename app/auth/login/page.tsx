import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { LoginForm } from '@/components/auth/login-form'

// /auth/ is already Disallow'd in robots.ts; the explicit noindex below is
// belt-and-braces for any crawler that reaches this URL via a followed link
// rather than a robots.txt-respecting crawl.
export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirect } = await searchParams
  const redirectTo = redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-ink-950 flex items-center">
        <div className="w-full max-w-sm mx-auto px-4 sm:px-6 py-24">
          <div className="bg-ink-800 border border-white/10 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6">
            <div className="mb-6">
              <h1 className="font-serif text-xl text-stone mb-1">Sign in</h1>
              <p className="text-stone-muted text-sm">
                Sign in to rate podcasts, write reviews, and save favourites.
              </p>
            </div>
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
