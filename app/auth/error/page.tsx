import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams

  return (
    <>
      <Header />
      <main className="min-h-screen bg-ink-950 flex items-center">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-2xl font-serif font-bold text-stone mb-3">
            Sign-in link didn&apos;t work
          </h1>
          <p className="text-stone-muted text-sm leading-relaxed mb-2">
            That link may have expired, already been used, or been opened in a different
            browser than the one you requested it from. Magic links only work once, in the
            same browser session that asked for them.
          </p>
          {reason && (
            <p className="text-stone-subtle text-xs font-mono mb-6 break-words">
              {reason}
            </p>
          )}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crimson text-white text-sm font-medium hover:bg-crimson/90 transition-colors"
          >
            Back to homepage — request a new link
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
