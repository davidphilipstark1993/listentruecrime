import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { BASE, breadcrumbSchema } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'True Crime Podcast Newsletter — Join the Waitlist',
  description: 'Join the ListenTrueCrime newsletter waitlist. Weekly true crime podcast recommendations, new reviews, hidden gems, and community picks. No spam.',
  alternates: { canonical: `${BASE}/newsletter` },
  openGraph: {
    title: 'True Crime Podcast Newsletter | ListenTrueCrime',
    description: 'Weekly true crime podcast recommendations, new reviews, and community picks. Join the waitlist.',
    url: `${BASE}/newsletter`,
  },
}

const breadcrumbs = breadcrumbSchema([
  { name: 'Home', url: BASE },
  { name: 'Newsletter', url: `${BASE}/newsletter` },
])

export default function NewsletterPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <Header />
      <main className="pt-24 pb-16">
        <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-stone-subtle mb-8">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <ChevronRight size={12} />
            <span className="text-stone-muted">Newsletter</span>
          </nav>

          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-crimson/10 border border-crimson/20 flex items-center justify-center mx-auto mb-6">
              <Mail size={28} className="text-crimson" />
            </div>
            <h1 className="heading-display text-4xl sm:text-5xl mb-4">
              Your weekly true crime briefing
            </h1>
            <p className="text-stone-muted text-lg leading-relaxed">
              We're building a weekly newsletter for true crime podcast fans. New reviews, hidden gems,
              community picks, and the cases everyone's talking about.
            </p>
          </div>

          <div className="card p-8 sm:p-10 mb-8">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-4">Join the waitlist</p>
            <h2 className="font-serif text-2xl text-stone mb-2">Be first to know when we launch</h2>
            <p className="text-stone-muted text-sm mb-6 leading-relaxed">
              Leave your email and you'll get early access when the newsletter launches. No spam, no ads —
              just honest true crime podcast recommendations from people who actually listen.
            </p>
            <NewsletterForm source="newsletter_page" />
          </div>

          {/* What to expect */}
          <div className="card p-6 mb-6">
            <h3 className="font-serif text-lg text-stone mb-4">What you'll get</h3>
            <ul className="space-y-3">
              {[
                { title: 'New podcast reviews', body: 'Full reviews of the podcasts worth your time — and honest verdicts on the ones that aren\'t.' },
                { title: 'Community picks', body: 'The podcasts getting the highest community ratings this week.' },
                { title: 'Hidden gems', body: 'Lesser-known shows that deserve more listeners.' },
                { title: 'Case updates', body: 'When podcasts cover cases in the news, we\'ll connect the dots.' },
              ].map(item => (
                <li key={item.title} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-crimson mt-2 shrink-0" />
                  <div>
                    <p className="text-stone text-sm font-medium">{item.title}</p>
                    <p className="text-stone-muted text-xs leading-relaxed">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-stone-subtle text-xs">
            No spam. Unsubscribe any time.{' '}
            <Link href="/browse" className="hover:text-stone transition-colors underline underline-offset-2">
              Browse podcasts while you wait.
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
