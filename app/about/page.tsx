import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, Search, Users, Shield } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { BASE, ORG_ID, WEBSITE_ID, personId, ogDefaults } from '@/lib/seo/config'
import { buildBreadcrumbSchema } from '@/lib/seo/content'
import { getAuthor } from '@/lib/authors'

const ABOUT_TITLE = 'About ListenTrueCrime — Independent True Crime Podcast Guide'
const ABOUT_DESCRIPTION = 'ListenTrueCrime is an independent true crime podcast guide run by editor David Stark: editorial verdicts, Binge Factor scores and separate community ratings.'

export const metadata: Metadata = {
  title: { absolute: ABOUT_TITLE },
  alternates: { canonical: `${BASE}/about` },
  description: ABOUT_DESCRIPTION,
  openGraph: { title: ABOUT_TITLE, description: ABOUT_DESCRIPTION, url: `${BASE}/about`, ...ogDefaults('About ListenTrueCrime', 'Independent true crime podcast guide') },
  twitter: { card: 'summary_large_image', title: ABOUT_TITLE, description: ABOUT_DESCRIPTION },
}

const pillars = [
  {
    icon: Search,
    title: 'Discovery first',
    body: 'Picks are made by an editor, not an algorithm. Every podcast in the directory carries an editorial verdict and a Binge Factor score, so you get a clear signal rather than a wall of listings.',
  },
  {
    icon: Star,
    title: 'Community ratings',
    body: 'Rate podcasts across six dimensions plus an overall score. Community ratings are shown separately from our editorial verdict, so neither replaces the other.',
  },
  {
    icon: Users,
    title: 'For true crime fans',
    body: "We built this because every other podcast directory treats true crime as a genre checkbox. We're here for the obsessives, the binge-watchers, the armchair investigators.",
  },
  {
    icon: Shield,
    title: 'Ethics matter',
    body: "We note warnings about victim sensitivity, graphic content, and exploitative storytelling. Great true crime respects victims — we recognise that in our reviews.",
  },
]

export default function AboutPage() {
  const editor = getAuthor('david-stark')
  const aboutSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${BASE}/about#webpage`,
        url: `${BASE}/about`,
        name: ABOUT_TITLE,
        description: ABOUT_DESCRIPTION,
        inLanguage: 'en-GB',
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': ORG_ID },
        mainEntity: { '@id': ORG_ID },
        breadcrumb: { '@id': `${BASE}/about#breadcrumb` },
      },
      { ...buildBreadcrumbSchema([{ name: 'Home', url: BASE }, { name: 'About', url: `${BASE}/about` }]), '@id': `${BASE}/about#breadcrumb` },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema).replace(/</g, '\\u003c') }} />
      <Header />
      <main id="main-content" className="pt-24 pb-16">
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
          <h1 className="heading-display text-4xl sm:text-5xl mb-6">About ListenTrueCrime</h1>
          <p className="text-stone-muted text-xl leading-relaxed">
            ListenTrueCrime is an independent guide to true crime podcasts: editorial verdicts,
            Binge Factor scores and community ratings, all in one directory. Built by fans, for fans.
          </p>
        </section>

        {/* Mission */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="card p-8 sm:p-12">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-4">Our mission</p>
            <h2 className="heading-section text-2xl sm:text-3xl mb-4">
              Help you find your next obsession
            </h2>
            <div className="space-y-4 text-stone-muted leading-relaxed">
              <p>
                There are thousands of true crime podcasts. Most aren't worth your time.
                Finding the good ones means wading through inconsistent Apple Podcast ratings,
                Reddit threads, and algorithmic recommendations that prioritise engagement over quality.
              </p>
              <p>
                ListenTrueCrime cuts through that. Every podcast in our database gets an editorial verdict and a Binge Factor
                score, plus enough context to know whether it is right for you.
              </p>
              <p>
                Community ratings add another layer. Registered listeners can rate each podcast on six dimensions
                (storytelling, research, host quality, production, binge factor and factual accuracy),
                which adds a second perspective alongside our own.
              </p>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="grid sm:grid-cols-2 gap-6">
            {pillars.map(p => (
              <div key={p.title} className="card p-6">
                <div className="w-10 h-10 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center mb-4">
                  <p.icon size={18} className="text-crimson" />
                </div>
                <h3 className="font-serif text-lg text-stone mb-2">{p.title}</h3>
                <p className="text-stone-muted text-sm leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who runs it */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20" aria-labelledby="who-runs-it">
          <div className="card p-8 sm:p-10">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-4">Who runs ListenTrueCrime</p>
            <h2 id="who-runs-it" className="heading-section text-2xl sm:text-3xl mb-4">Edited by {editor.name}</h2>
            <div className="space-y-4 text-stone-muted leading-relaxed">
              <p>
                <Link href={`/authors/${editor.slug}`} className="text-crimson hover:underline">{editor.name}</Link> is the {editor.role} of ListenTrueCrime.
                {' '}{editor.bio}
              </p>
              <p>
                Editorial verdicts and Binge Factor scores are the editor&apos;s opinion, informed by what listeners and critics say in public reviews.
                We do not claim to have listened to every episode of every show in the directory.
              </p>
            </div>
          </div>
        </section>

        {/* How ratings work */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 section-divider pt-16">
          <h2 className="heading-section text-2xl sm:text-3xl mb-6">How ratings work</h2>
          <div className="card p-6 sm:p-8 space-y-4 text-stone-muted text-sm leading-relaxed">
            <p>
              Community members rate podcasts across six dimensions on a 1–10 scale, plus an overall score.
              These are averaged to produce the community scores you see on each podcast page.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {['Storytelling', 'Research Quality', 'Host Quality', 'Production / Audio', 'Binge Factor', 'Factual Accuracy'].map(dim => (
                <div key={dim} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-crimson flex-shrink-0" />
                  <span className="text-stone text-xs">{dim}</span>
                </div>
              ))}
            </div>
            <p>
              The <strong className="text-stone">Binge Factor</strong> specifically measures how compulsively listenable a podcast is —
              whether you find yourself hitting "next episode" immediately. It is also the one score we assign editorially to every podcast.
            </p>
            <p>
              Reviews are moderated before appearing publicly to keep the community constructive and on-topic.
            </p>
            <Link href="/how-we-review" className="inline-flex items-center gap-1.5 text-crimson text-sm hover:underline">
              Read our full review methodology →
            </Link>
          </div>
        </section>

        {/* Funding and independence */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 section-divider pt-16" aria-labelledby="independence">
          <h2 id="independence" className="heading-section text-2xl sm:text-3xl mb-6">How the site is funded</h2>
          <div className="card p-6 sm:p-8 space-y-4 text-stone-muted text-sm leading-relaxed">
            <p>
              ListenTrueCrime may earn from affiliate links (for example to books and audiobooks through the Amazon EU Associates Programme)
              and from paid podcast promotion. Pages with affiliate links say so, and paid placements are always labelled as promoted or sponsored.
            </p>
            <p>
              Commissions never decide which podcasts we review or how we rate them, and buying a placement does not buy a review, a rating or a verdict.
              See our <Link href="/terms#affiliate-links" className="text-crimson hover:underline">terms</Link> and
              our <Link href="/promote-your-podcast#independence-heading" className="text-crimson hover:underline">editorial independence statement</Link>.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="heading-section text-2xl sm:text-3xl mb-4">Start exploring</h2>
          <p className="text-stone-muted mb-8">
            Hundreds of podcasts. Filters for case type, country, platform, and more.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Link href="/browse" className="btn-primary px-6 py-3">Browse all podcasts</Link>
            <Link href="/best-true-crime-podcasts" className="btn-outline px-6 py-3">See our top picks</Link>
          </div>
          <div className="card p-6 max-w-md mx-auto">
            <p className="text-stone text-sm font-medium mb-1">Join the newsletter</p>
            <p className="text-stone-subtle text-xs mb-4">Weekly picks. No spam. Unsubscribe any time.</p>
            <NewsletterForm source="about_page" variant="minimal" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
