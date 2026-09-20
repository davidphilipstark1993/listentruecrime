import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BASE } from '@/lib/seo/config'

// [CONFIRM: contact email] — no contact-form backend exists in the codebase,
// so this uses a plain mailto link per the audit brief. If you'd rather have
// a real form, that needs a new API route (e.g. one that emails via the
// SendGrid integration already used for the newsletter).

const CONTACT_EMAIL = '[CONFIRM: contact email]'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the ListenTrueCrime team.',
  alternates: { canonical: `${BASE}/contact` },
  robots: { index: true, follow: true },
}

export default function ContactPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="pt-24 pb-24">
        <section className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-1.5 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <span className="text-stone-muted">Contact</span>
          </nav>

          <h1 className="heading-display text-3xl sm:text-4xl mb-4">Get in touch</h1>
          <p className="text-stone-muted leading-relaxed mb-8">
            Podcast submissions, corrections, review disputes, privacy requests, or anything else —
            we'd like to hear from you.
          </p>

          <div className="card p-8 inline-flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-crimson/10 border border-crimson/20 flex items-center justify-center">
              <Mail size={20} className="text-crimson" />
            </div>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="btn-primary px-6 py-3"
            >
              Email {CONTACT_EMAIL}
            </a>
            <p className="text-stone-subtle text-xs max-w-sm">
              We aim to reply within a few business days. For privacy or data requests, see our{' '}
              <Link href="/privacy" className="text-crimson hover:underline">Privacy Policy</Link> for what to include.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
