import type { Metadata } from 'next'
import Link from 'next/link'
import { Search, FileText, Megaphone, Mail, Check, ChevronDown, ChevronUp, Scale, ArrowRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PromotionPageView, TrackedLink } from '@/components/promotion/analytics'
import { BASE } from '@/lib/seo/config'
import { buildBreadcrumbSchema, buildFAQSchema } from '@/lib/seo/content'
import { cn } from '@/lib/utils'
import { enquiryHref, promotionPackages, PROMOTE_PATH } from '@/lib/promotion/packages'

const PAGE_URL = `${BASE}${PROMOTE_PATH}`
const TITLE = 'Promote Your True Crime Podcast'
const DESCRIPTION =
  'Promote your true crime podcast on ListenTrueCrime. List your show for free or ask about featured podcast, newsletter and promotional opportunities.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    title: `${TITLE} | ListenTrueCrime`,
    description: DESCRIPTION,
    url: PAGE_URL,
    images: [{
      url: `${BASE}/og?${new URLSearchParams({ title: TITLE, sub: 'Listings, featured placements & newsletter promotion' }).toString()}`,
      width: 1200,
      height: 630,
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | ListenTrueCrime`,
    description: DESCRIPTION,
  },
}

const benefits = [
  {
    icon: Search,
    title: 'Podcast discovery',
    body: 'Help people searching for their next true crime podcast find your show — by case type, country, platform and format.',
  },
  {
    icon: FileText,
    title: 'Podcast profile',
    body: 'A dedicated page for your podcast with its description, artwork, hosts, format and the platforms it’s available on.',
  },
  {
    icon: Megaphone,
    title: 'Featured promotion',
    body: 'Increase your visibility with clearly labelled promotional placements in relevant areas of the site.',
  },
  {
    icon: Mail,
    title: 'Newsletter opportunities',
    body: 'Where space allows, reach readers of our weekly newsletter. Placements are subject to availability and editorial suitability.',
  },
]

const freeListingIncludes = [
  'A podcast listing in the ListenTrueCrime database',
  'Your podcast description',
  'Artwork',
  'Hosts',
  'Format',
  'Listening platforms',
  'Website and social links where appropriate',
]

const steps = [
  { title: 'Tell us about your podcast', body: 'Send a short enquiry with your podcast details and what you’re interested in.' },
  { title: 'We reply personally', body: 'We’ll confirm suitability, availability and pricing, and suggest what fits your goals.' },
  { title: 'Agree a campaign', body: 'Placements, dates and wording are agreed in advance. Nothing runs until you’ve confirmed.' },
]

const faqs = [
  {
    q: 'Can I list my podcast for free?',
    a: 'Yes. You can submit any true crime podcast for consideration in the ListenTrueCrime database at no cost. We review every submission ourselves, and listing is at our discretion — we don’t list every show we receive.',
  },
  {
    q: 'How does featured promotion work?',
    a: 'Featured promotion gives your podcast extra visibility in relevant areas of the site, such as discovery pages and podcast lists, alongside an enhanced profile. Featured placements are always labelled as promoted so listeners can tell them apart from our editorial picks.',
  },
  {
    q: 'Does paid promotion affect your editorial ratings?',
    a: 'No. Paid promotion is entirely separate from our independent editorial coverage. Buying a placement does not buy a review, a rating, a verdict or a place in our editorial recommendations, and it has no influence on the scores we publish.',
  },
  {
    q: 'Can I promote a podcast that isn’t already listed?',
    a: 'Yes. Include the podcast’s website or RSS feed in your enquiry and we’ll look at adding it to the database first. A podcast needs a listing before it can be promoted, and it has to meet our usual listing requirements.',
  },
  {
    q: 'Can I advertise in the newsletter?',
    a: 'Newsletter promotion may be available, depending on space in upcoming issues and whether your podcast is a good fit for our readers. Sponsored newsletter placements are always clearly labelled.',
  },
  {
    q: 'How long does promotion last?',
    a: 'It depends on the package you agree. Featured placements run monthly, newsletter placements appear in a specific issue, and promotion packages run for a campaign period agreed in advance.',
  },
  {
    q: 'Can I promote a new podcast?',
    a: 'Yes, as long as the podcast meets our listing and content requirements. New shows are welcome — tell us when it launched and how many episodes are out so we can suggest the right timing.',
  },
  {
    q: 'Do you guarantee listeners or downloads?',
    a: 'No. We can’t guarantee traffic, downloads, rankings or listener numbers, and we’d be wary of anyone who does. Where it’s technically available, we’ll share basic reporting on how your placement performed.',
  },
]

const exploreLinks = [
  { href: '/browse', label: 'Browse the podcast directory' },
  { href: '/best-true-crime-podcasts', label: 'Best true crime podcasts' },
  { href: '/editors-choice', label: 'Editor’s choice' },
  { href: '/how-we-review', label: 'How we review podcasts' },
  { href: '/newsletter', label: 'The weekly newsletter' },
  { href: '/blog/ethics-of-true-crime-podcasting', label: 'The ethics of true crime podcasting' },
]

export default function PromoteYourPodcastPage() {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'True crime podcast promotion',
    serviceType: 'Podcast promotion',
    description: DESCRIPTION,
    url: PAGE_URL,
    areaServed: 'Worldwide',
    provider: { '@type': 'Organization', name: 'ListenTrueCrime', url: BASE },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Podcast promotion options',
      itemListElement: promotionPackages.map(pkg => ({
        '@type': 'Offer',
        name: pkg.name,
        description: pkg.summary,
        url: `${BASE}${enquiryHref(pkg.id)}`,
        priceSpecification: {
          '@type': pkg.schemaPrice.unit ? 'UnitPriceSpecification' : 'PriceSpecification',
          priceCurrency: 'GBP',
          ...(pkg.schemaPrice.from ? { minPrice: pkg.schemaPrice.amount } : { price: pkg.schemaPrice.amount }),
          ...(pkg.schemaPrice.unit ? { unitCode: 'MON', unitText: 'month' } : {}),
        },
      })),
    },
  }
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Promote Your Podcast', url: PAGE_URL },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFAQSchema(faqs)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <PromotionPageView page="promote" />
      <Header />
      <main id="main-content" className="pt-24 pb-16">

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-1.5 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <span className="text-stone-muted">Promote Your Podcast</span>
          </nav>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crimson/10 border border-crimson/20 text-crimson text-xs font-medium mb-6">
            <Megaphone size={11} />
            For podcast creators
          </div>
          <h1 className="heading-display text-4xl sm:text-5xl mb-5">Promote your true crime podcast</h1>
          <p className="font-serif text-stone text-xl sm:text-2xl leading-snug mb-5">
            Get your podcast discovered by people looking for their next listen.
          </p>
          <p className="text-stone-muted text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            List your podcast on ListenTrueCrime and reach listeners who come here to find true crime
            podcasts — through reviews, recommendations and guides to what to listen to next.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <TrackedLink
              href={enquiryHref()}
              event="promote_cta_click"
              params={{ location: 'hero' }}
              className="btn-primary px-6 py-3 justify-center"
            >
              Promote Your Podcast
            </TrackedLink>
            <TrackedLink
              href="#free-listing"
              event="promote_free_listing_click"
              params={{ location: 'hero' }}
              className="btn-outline px-6 py-3 justify-center"
            >
              List Your Podcast Free
            </TrackedLink>
          </div>
        </section>

        {/* What LTC offers */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20" aria-labelledby="audience-heading">
          <div className="max-w-3xl mb-8">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">Why ListenTrueCrime</p>
            <h2 id="audience-heading" className="heading-section text-2xl sm:text-3xl mb-3">
              Put your podcast in front of the right audience
            </h2>
            <p className="text-stone-muted leading-relaxed">
              ListenTrueCrime is a discovery site dedicated to true crime podcasts — independent{' '}
              <Link href="/how-we-review" className="text-crimson hover:underline">reviews</Link>,{' '}
              <Link href="/best-true-crime-podcasts" className="text-crimson hover:underline">recommendations</Link>, a searchable{' '}
              <Link href="/browse" className="text-crimson hover:underline">podcast directory</Link> and guides to cases and genres.
              People arrive here already looking for something new to listen to, which makes it a natural place
              to get your podcast discovered.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map(b => (
              <div key={b.title} className="card p-6">
                <div className="w-10 h-10 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center mb-4">
                  <b.icon size={18} className="text-crimson" aria-hidden="true" />
                </div>
                <h3 className="font-serif text-lg text-stone mb-2">{b.title}</h3>
                <p className="text-stone-muted text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Free listing */}
        <section id="free-listing" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 scroll-mt-24" aria-labelledby="free-listing-heading">
          <div className="card p-6 sm:p-10">
            <div className="grid md:grid-cols-[1fr_auto] gap-8 md:gap-12">
              <div>
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">Free</p>
                <h2 id="free-listing-heading" className="heading-section text-2xl sm:text-3xl mb-3">List your podcast for free</h2>
                <p className="text-stone-muted leading-relaxed mb-6">
                  Submit your podcast for consideration in the ListenTrueCrime database. There’s no charge and no
                  obligation to buy anything. We look at every submission ourselves before deciding whether to list it.
                </p>
                <TrackedLink
                  href={enquiryHref('free_listing')}
                  event="promote_free_listing_click"
                  params={{ location: 'free_listing_section' }}
                  className="btn-primary px-6 py-3 w-full sm:w-auto justify-center"
                >
                  Submit Your Podcast
                </TrackedLink>
              </div>
              <div>
                <p className="text-stone text-xs font-semibold uppercase tracking-widest mb-4">A listing can include</p>
                <ul className="space-y-2.5">
                  {freeListingIncludes.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-stone-muted text-sm">
                      <Check size={15} className="text-crimson mt-0.5 shrink-0" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Paid promotion */}
        <section id="packages" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 section-divider pt-16 scroll-mt-24" aria-labelledby="packages-heading">
          <div className="max-w-3xl mb-10">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">Paid promotion</p>
            <h2 id="packages-heading" className="heading-section text-2xl sm:text-3xl mb-3">Promote your podcast</h2>
            <p className="text-stone-muted leading-relaxed">
              If you’d like more exposure than a standard listing, you can pay for promotional placements across
              the site and newsletter. Every paid placement is labelled as promoted — it’s advertising, not an
              editorial endorsement.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {promotionPackages.map(pkg => (
              <article
                key={pkg.id}
                className={cn('card p-6 sm:p-8 flex flex-col', pkg.highlighted && 'border-crimson/30')}
                aria-labelledby={`package-${pkg.id}`}
              >
                <h3 id={`package-${pkg.id}`} className="font-serif text-xl text-stone mb-1">{pkg.name}</h3>
                <p className="text-stone text-2xl font-semibold tabular-nums mb-3">{pkg.price}</p>
                <p className="text-stone-muted text-sm leading-relaxed mb-5">{pkg.summary}</p>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {pkg.includes.map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-stone-muted text-sm leading-relaxed">
                      <Check size={15} className="text-crimson mt-0.5 shrink-0" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                {pkg.note && <p className="text-stone-subtle text-xs leading-relaxed mb-5">{pkg.note}</p>}
                <TrackedLink
                  href={enquiryHref(pkg.id)}
                  event="promote_cta_click"
                  params={{ location: 'package_card', package: pkg.id }}
                  className={cn(pkg.highlighted ? 'btn-primary' : 'btn-outline', 'w-full justify-center py-3')}
                >
                  {pkg.cta}
                </TrackedLink>
              </article>
            ))}
          </div>
          <p className="text-stone-subtle text-xs mt-6 max-w-3xl">
            Prices are a starting point — we’ll confirm the final price and dates with you before anything
            is booked. We don’t take payment online.
          </p>
        </section>

        {/* Editorial independence */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-20" aria-labelledby="independence-heading">
          <div className="card p-6 sm:p-8 flex flex-col sm:flex-row gap-5">
            <div className="w-10 h-10 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center shrink-0">
              <Scale size={18} className="text-crimson" aria-hidden="true" />
            </div>
            <div>
              <h2 id="independence-heading" className="font-serif text-xl text-stone mb-3">Editorial independence</h2>
              <div className="space-y-3 text-stone-muted text-sm leading-relaxed">
                <p>
                  ListenTrueCrime keeps paid promotion separate from independent editorial coverage. Buying
                  promotional exposure doesn’t guarantee a review, a particular rating or a place in our
                  recommendations, and it has no influence on the scores we publish.
                </p>
                <p>
                  Promoted placements are always labelled, so listeners can trust that our verdicts are ours
                  alone. That trust is what makes a recommendation here worth having.
                </p>
              </div>
              <Link href="/how-we-review" className="inline-flex items-center gap-1.5 text-crimson text-sm hover:underline mt-4">
                Read our review methodology <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20" aria-labelledby="process-heading">
          <h2 id="process-heading" className="heading-section text-2xl sm:text-3xl mb-8">How it works</h2>
          <ol className="grid sm:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <li key={step.title} className="border-t border-white/[0.08] pt-5">
                <p className="text-crimson font-serif text-lg mb-2 tabular-nums">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="text-stone font-medium text-sm mb-1.5">{step.title}</h3>
                <p className="text-stone-muted text-sm leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-20" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="heading-section text-2xl sm:text-3xl mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map(faq => (
              <details key={faq.q} className="card p-5 group">
                <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                  <span className="text-stone font-medium text-sm">{faq.q}</span>
                  <ChevronDown size={16} className="text-stone-subtle shrink-0 group-open:hidden" aria-hidden="true" />
                  <ChevronUp size={16} className="text-stone-subtle shrink-0 hidden group-open:block" aria-hidden="true" />
                </summary>
                <p className="text-stone-muted text-sm leading-relaxed mt-3 pt-3 border-t border-white/[0.06]">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Explore */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-20" aria-labelledby="explore-heading">
          <h2 id="explore-heading" className="font-serif text-lg text-stone mb-4">See how listeners use ListenTrueCrime</h2>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {exploreLinks.map(link => (
              <li key={link.href}>
                <Link href={link.href} className="text-stone-muted hover:text-stone text-sm transition-colors">
                  → {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Closing CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center section-divider pt-16">
          <h2 className="heading-section text-2xl sm:text-3xl mb-4">Ready to promote your podcast?</h2>
          <p className="text-stone-muted mb-8 max-w-xl mx-auto">
            Tell us about your show and what you’re looking for. We’ll reply personally — no obligation.
          </p>
          <TrackedLink
            href={enquiryHref()}
            event="promote_cta_click"
            params={{ location: 'closing' }}
            className="btn-primary px-6 py-3 w-full sm:w-auto justify-center"
          >
            Start an Enquiry
          </TrackedLink>
        </section>
      </main>
      <Footer />
    </>
  )
}
