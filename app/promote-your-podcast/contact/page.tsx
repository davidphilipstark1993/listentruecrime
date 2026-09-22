import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PromotionEnquiryForm } from '@/components/promotion/enquiry-form'
import { PromotionPageView } from '@/components/promotion/analytics'
import { BASE } from '@/lib/seo/config'
import { PROMOTE_CONTACT_PATH, PROMOTE_PATH, PROMOTION_INTEREST_VALUES, type PromotionInterest } from '@/lib/promotion/packages'

export const metadata: Metadata = {
  title: 'Podcast Promotion Enquiry',
  description: 'Submit your true crime podcast for a free listing or ask about featured, newsletter and promotion package opportunities on ListenTrueCrime.',
  alternates: { canonical: `${BASE}${PROMOTE_CONTACT_PATH}` },
  // A form page — keep the main /promote-your-podcast page as the one that ranks.
  robots: { index: false, follow: true },
}

interface Props {
  searchParams: { package?: string }
}

export default function PromoteContactPage({ searchParams }: Props) {
  const requested = searchParams.package
  const initialInterest = (PROMOTION_INTEREST_VALUES as string[]).includes(requested ?? '')
    ? (requested as PromotionInterest)
    : undefined
  const isFreeListing = initialInterest === 'free_listing'

  return (
    <>
      <PromotionPageView page="promote_contact" />
      <Header />
      <main id="main-content" className="pt-24 pb-24">
        <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <Link href={PROMOTE_PATH} className="hover:text-stone transition-colors">Promote Your Podcast</Link>
            <span>/</span>
            <span className="text-stone-muted">Enquiry</span>
          </nav>

          <h1 className="heading-display text-3xl sm:text-4xl mb-4">
            {isFreeListing ? 'Submit your podcast' : 'Promote your podcast'}
          </h1>
          <p className="text-stone-muted leading-relaxed mb-8">
            {isFreeListing
              ? 'Tell us about your podcast and we’ll consider it for the ListenTrueCrime database. Free listings are reviewed by us before anything is published.'
              : 'Tell us about your podcast and what you’re interested in. We’ll reply personally with availability and options — there’s no obligation.'}{' '}
            Paid promotion is always labelled and kept separate from our{' '}
            <Link href="/how-we-review" className="text-crimson hover:underline">independent reviews</Link>.
          </p>

          <PromotionEnquiryForm initialInterest={initialInterest} />

          <p className="text-stone-subtle text-xs mt-6">
            Prefer email? Write to{' '}
            <a href="mailto:info@listentruecrime.com" className="text-stone hover:underline">info@listentruecrime.com</a>.
          </p>
        </section>
      </main>
      <Footer />
    </>
  )
}
