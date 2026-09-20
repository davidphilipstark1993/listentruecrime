import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BASE } from '@/lib/seo/config'

// DRAFT — pending legal review, not final legal advice. [CONFIRM: ...]
// markers stand in for facts only the site owner can supply.

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'The terms that govern your use of ListenTrueCrime.',
  alternates: { canonical: `${BASE}/terms` },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="pt-24 pb-16">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <span className="text-stone-muted">Terms of Use</span>
          </nav>

          <h1 className="heading-display text-3xl sm:text-4xl mb-3">Terms of Use</h1>
          <p className="text-stone-subtle text-sm mb-10">Last updated: [CONFIRM: date this policy goes live]</p>

          <div className="space-y-10 text-stone-muted text-sm leading-relaxed">
            <section>
              <h2 className="heading-section text-xl text-stone mb-3">1. Acceptance of these terms</h2>
              <p>
                By using ListenTrueCrime (listentruecrime.com), you agree to these terms. If you don't agree, please
                don't use the site. See our <Link href="/privacy" className="text-crimson hover:underline">Privacy
                Policy</Link> for how we handle your data.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">2. What ListenTrueCrime is</h2>
              <p>
                ListenTrueCrime is an independent podcast review and discovery site. We are not affiliated with,
                endorsed by, or officially connected to any podcast, host, network, or platform we review or link to,
                unless we say otherwise.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">3. Content and intellectual property</h2>
              <p>
                Our reviews, ratings summaries, articles, and editorial content are owned by ListenTrueCrime (or
                licensed to us) and are provided for your personal, non-commercial use. You may share links to our
                pages freely, but please don't republish, scrape, or redistribute our content in bulk without asking
                first.
              </p>
              <p className="mt-3">
                Podcast artwork, names, and descriptions belong to their respective owners and are used here for
                identification and review purposes.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">4. Your contributions</h2>
              <p>
                If you submit a rating, review, or other content, you're confirming it's your own genuine opinion,
                that it isn't defamatory, abusive, or misleading, and you're giving us permission to display it on
                the site. Reviews are moderated before they appear publicly, and we may remove or edit any
                contribution that breaches these terms.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">5. Accounts</h2>
              <p>
                Creating an account (via email magic link or Google sign-in) is optional and only needed to rate or
                review podcasts under your own identity. You're responsible for keeping access to your email or
                Google account secure, since that's how you sign in.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">6. Affiliate links and advertising</h2>
              <p>
                We don't currently run any affiliate links or paid placements on the site. If that changes, this
                section will be updated and any sponsored or affiliate content will be clearly labelled.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">7. No warranties</h2>
              <p>
                Our reviews and ratings reflect editorial opinion and community input at a point in time — they're
                not a guarantee of any podcast's content, accuracy, or suitability for you. True crime content can
                include descriptions of violence and other sensitive subject matter; listener discretion is advised.
                We provide the site "as is" without warranties of any kind, to the extent permitted by law.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">8. External links</h2>
              <p>
                We link to third-party podcast platforms, episodes, and websites for your convenience. We don't
                control and aren't responsible for the content, availability, or practices of any external site.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">9. Limitation of liability</h2>
              <p>
                To the fullest extent permitted by law, ListenTrueCrime isn't liable for any indirect or
                consequential loss arising from your use of the site, or from content on any third-party site we
                link to.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">10. Changes to these terms</h2>
              <p>We may update these terms from time to time. Continued use of the site after a change means you accept the updated terms.</p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">11. Governing law</h2>
              <p>These terms are governed by the laws of [CONFIRM: governing jurisdiction, e.g. England and Wales].</p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">12. Contact</h2>
              <p>
                Questions about these terms? Get in touch via our <Link href="/contact" className="text-crimson hover:underline">Contact page</Link>.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
