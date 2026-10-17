import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'

export const metadata: Metadata = {
  title: 'Subscription confirmation',
  robots: { index: false, follow: false },
}

const COPY = {
  ok: {
    title: "You're subscribed",
    body: 'Thanks for confirming. Your first issue arrives on the next Sunday send: five true crime podcasts worth your time.',
  },
  expired: {
    title: 'That link has expired',
    body: 'Confirmation links last 7 days. Enter your email below and we will send you a new one.',
  },
  invalid: {
    title: "We couldn't confirm that link",
    body: 'It may have been mistyped or already replaced by a newer email. Enter your email below to get a fresh link.',
  },
} as const

export default function ConfirmedPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status === 'ok' || searchParams.status === 'expired' ? searchParams.status : 'invalid'
  const copy = COPY[status]
  return (
    <>
      <Header />
      <main id="main-content" className="pt-24 pb-16">
        <section className="max-w-xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="heading-display text-3xl sm:text-4xl mb-4">{copy.title}</h1>
          <p className="text-stone-muted leading-relaxed mb-8">{copy.body}</p>
          {status === 'ok' ? (
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/best-true-crime-podcasts" className="btn-primary px-6 py-3">See our top picks</Link>
              <Link href="/browse" className="btn-outline px-6 py-3">Browse all podcasts</Link>
            </div>
          ) : (
            <div className="card p-6 max-w-md mx-auto text-left">
              <NewsletterForm source="confirm_retry" variant="minimal" />
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  )
}
