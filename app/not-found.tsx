import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

// Next.js serves this for any unmatched route with an HTTP 404 status —
// it must carry its own title/canonical, never inherit the homepage's.
export const metadata: Metadata = {
  // Plain string, not "... | ListenTrueCrime" — the root layout's title
  // template already appends that suffix to whatever <title> we set here.
  title: 'Page Not Found',
  description: "The page you're looking for doesn't exist or has moved.",
  robots: { index: false, follow: true },
  // Explicit overrides, not omissions — the root layout sets a homepage
  // canonical and homepage openGraph as its site-wide default, and a missing
  // URL has no page of its own to canonicalize or represent as an OG object.
  alternates: {},
  openGraph: {
    type: 'website',
    title: 'Page Not Found | ListenTrueCrime',
    description: "The page you're looking for doesn't exist or has moved.",
  },
}

const LINKS = [
  { href: '/blog', label: 'Browse the blog' },
  { href: '/browse', label: 'Browse all podcasts' },
  { href: '/best-true-crime-podcasts', label: 'Best true crime podcasts' },
  { href: '/how-we-review', label: 'How we review podcasts' },
]

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main-content" className="min-h-[70vh] bg-ink-950 flex items-center">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-crimson/10 border border-crimson/20 flex items-center justify-center mx-auto mb-6">
            <SearchX size={22} className="text-crimson" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone mb-3">
            Page not found
          </h1>
          <p className="text-stone-muted text-sm leading-relaxed mb-8">
            We couldn&apos;t find the page you were looking for. It may have been moved,
            renamed, or never existed. Try one of these instead:
          </p>
          <div className="flex flex-col gap-2.5">
            {LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="btn-outline w-full justify-center"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
