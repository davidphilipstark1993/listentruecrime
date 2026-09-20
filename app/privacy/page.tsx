import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BASE } from '@/lib/seo/config'

// DRAFT — pending legal review. Content describes only what the codebase
// actually does (see the audit that produced this page); [CONFIRM: ...]
// markers stand in for facts (controller identity, contact address,
// jurisdiction) that only the site owner can supply. Do not treat this as
// final legal advice or a completed policy until those are resolved.

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How ListenTrueCrime collects, uses, and protects your personal data.',
  alternates: { canonical: `${BASE}/privacy` },
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="pt-24 pb-16">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <span className="text-stone-muted">Privacy Policy</span>
          </nav>

          <h1 className="heading-display text-3xl sm:text-4xl mb-3">Privacy Policy</h1>
          <p className="text-stone-subtle text-sm mb-10">Last updated: [CONFIRM: date this policy goes live]</p>

          <div className="space-y-10 text-stone-muted text-sm leading-relaxed">
            <section>
              <h2 className="heading-section text-xl text-stone mb-3">Who we are</h2>
              <p>
                ListenTrueCrime (listentruecrime.com) is a true crime podcast review and discovery site. This
                policy explains what personal data we collect, why, and what rights you have over it, in line with
                UK GDPR and the Data Protection Act 2018.
              </p>
              <p className="mt-3">
                The data controller is <strong className="text-stone">[CONFIRM: controller/company legal name]</strong>,
                <strong className="text-stone"> [CONFIRM: registered address, if applicable]</strong>. For any
                privacy question or request, contact <strong className="text-stone">[CONFIRM: privacy contact email]</strong> or
                see our <Link href="/contact" className="text-crimson hover:underline">Contact page</Link>.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">What we collect</h2>
              <ul className="space-y-3 list-disc pl-5">
                <li>
                  <strong className="text-stone">Newsletter sign-ups</strong> — your email address and, optionally, first
                  name, plus which form you signed up through and your consent status. Collected via the sign-up forms in
                  the footer and elsewhere on the site.
                </li>
                <li>
                  <strong className="text-stone">Account sign-in</strong> — if you sign in to rate or review podcasts, we
                  collect your email address (for passwordless "magic link" sign-in) or, if you choose "Continue with
                  Google", the name, email address, and profile picture Google shares with us.
                </li>
                <li>
                  <strong className="text-stone">Ratings, reviews, and favourites</strong> — content you submit, linked to
                  your account if you're signed in. If you rate a podcast without signing in, your rating is stored only
                  in your browser (local storage) and is not sent to us or linked to you personally.
                </li>
                <li>
                  <strong className="text-stone">Usage and analytics data</strong> — standard web analytics (pages viewed,
                  approximate location derived from IP address, device and browser type) via Google Analytics.
                </li>
              </ul>
              <p className="mt-3">
                We do not run any affiliate or advertising tracking on the site today. We do not collect payment
                information — the site has no paid features.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">Why we collect it, and our lawful basis</h2>
              <ul className="space-y-3 list-disc pl-5">
                <li><strong className="text-stone">Newsletter emails</strong> — with your consent (UK GDPR Art. 6(1)(a)), which you give explicitly when you submit a sign-up form. You can withdraw this consent at any time.</li>
                <li><strong className="text-stone">Account, ratings, and reviews</strong> — to provide the functionality you've asked for (Art. 6(1)(b), necessary to perform our end of that relationship).</li>
                <li><strong className="text-stone">Analytics</strong> — our legitimate interest in understanding how the site is used and improving it (Art. 6(1)(f)), balanced against your privacy — see "Cookies" below for how to opt out.</li>
              </ul>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">Cookies and local storage</h2>
              <p>We use:</p>
              <ul className="space-y-2 list-disc pl-5 mt-3">
                <li><strong className="text-stone">Essential cookies</strong> set by Supabase to keep you signed in.</li>
                <li><strong className="text-stone">Analytics cookies</strong> set by Google Analytics to measure site usage. You can opt out using your browser's cookie settings or an extension such as Google's Analytics opt-out add-on.</li>
                <li><strong className="text-stone">Local storage (not a cookie, stays on your device)</strong> for a couple of small preferences: whether you've dismissed the "before you go" pop-up, and, if you rate a podcast without signing in, that rating.</li>
              </ul>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">Who we share data with</h2>
              <p>We don't sell your personal data. We use the following processors to run the site:</p>
              <ul className="space-y-2 list-disc pl-5 mt-3">
                <li><strong className="text-stone">Supabase</strong> — our database and authentication provider, which stores your account, ratings, and newsletter subscriber records.</li>
                <li><strong className="text-stone">SendGrid (Twilio)</strong> — sends our newsletter and account emails.</li>
                <li><strong className="text-stone">Google</strong> — provides Google Analytics, and Google Sign-In if you choose to use it.</li>
                <li><strong className="text-stone">Vercel</strong> — hosts the website itself.</li>
              </ul>
              <p className="mt-3">
                Some of these providers may process data outside the UK/EEA. [CONFIRM: confirm each provider's data
                region and, if outside the UK/EEA, the safeguard relied on — e.g. UK IDTA or SCCs.]
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">How long we keep your data</h2>
              <p>
                We keep newsletter subscriber records for as long as you remain subscribed, and account data for as
                long as your account is active. If you unsubscribe or ask us to delete your data, we'll remove or
                anonymise it within a reasonable time, except where we need to keep limited records to comply with a
                legal obligation.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">Your rights</h2>
              <p>Under UK GDPR, you have the right to:</p>
              <ul className="space-y-1.5 list-disc pl-5 mt-3">
                <li>Access the personal data we hold about you</li>
                <li>Ask us to correct inaccurate data</li>
                <li>Ask us to delete your data</li>
                <li>Restrict or object to certain processing</li>
                <li>Receive your data in a portable format</li>
                <li>Withdraw consent at any time (for the newsletter, use the unsubscribe link in any email, or contact us)</li>
                <li>Complain to the UK Information Commissioner's Office (ico.org.uk) if you think we've mishandled your data</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, contact <strong className="text-stone">[CONFIRM: privacy contact email]</strong> or
                use our <Link href="/contact" className="text-crimson hover:underline">Contact page</Link>.
              </p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">Children</h2>
              <p>ListenTrueCrime is not directed at children, and we don't knowingly collect data from anyone under 13.</p>
            </section>

            <section>
              <h2 className="heading-section text-xl text-stone mb-3">Changes to this policy</h2>
              <p>We may update this policy from time to time. Material changes will be reflected by updating the date at the top of this page.</p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
