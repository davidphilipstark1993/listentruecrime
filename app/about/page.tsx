import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, Search, Users, Shield } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { BASE, organizationSchema } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'About ListenTrueCrime',
  description: 'ListenTrueCrime is the best place to discover, rate, and discuss true crime podcasts. Expert reviews, community ratings, and curated recommendations — built by fans, for fans.',
  alternates: { canonical: `${BASE}/about` },
  openGraph: {
    title: 'About ListenTrueCrime',
    description: 'Expert reviews, community ratings, and curated true crime podcast recommendations.',
    url: `${BASE}/about`,
  },
}

const pillars = [
  {
    icon: Search,
    title: 'Discovery first',
    body: 'No algorithms, no ads, no clickbait. Every podcast is reviewed on storytelling, research quality, host quality, and production — giving you the signal, not the noise.',
  },
  {
    icon: Star,
    title: 'Community ratings',
    body: 'Rate podcasts across 7 dimensions. Our aggregate scores reflect thousands of listens from people who actually care about quality.',
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
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <Header />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20">
          <h1 className="heading-display text-4xl sm:text-5xl mb-6">About ListenTrueCrime</h1>
          <p className="text-stone-muted text-xl leading-relaxed">
            The internet's best destination for discovering, rating, and discussing
            true crime podcasts. Built by fans, for fans.
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
                ListenTrueCrime cuts through that. Every podcast in our database is reviewed
                across consistent dimensions — storytelling, research, host quality, production,
                factual accuracy, and binge-worthiness. We give you a binge factor score,
                a quick verdict, and enough context to know whether a podcast is right for you.
              </p>
              <p>
                Community ratings add another layer. When thousands of real listeners rate the
                same dimensions, patterns emerge that no single reviewer can capture alone.
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

        {/* How ratings work */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 section-divider pt-16">
          <h2 className="heading-section text-2xl sm:text-3xl mb-6">How ratings work</h2>
          <div className="card p-6 sm:p-8 space-y-4 text-stone-muted text-sm leading-relaxed">
            <p>
              Community members rate podcasts across 7 dimensions on a 1–10 scale.
              These are averaged to produce the scores you see on each podcast page.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {['Storytelling', 'Research Quality', 'Host Quality', 'Production / Audio', 'Binge Factor', 'Factual Accuracy', 'Overall Score'].map(dim => (
                <div key={dim} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-crimson flex-shrink-0" />
                  <span className="text-stone text-xs">{dim}</span>
                </div>
              ))}
            </div>
            <p>
              The <strong className="text-stone">Binge Factor</strong> specifically measures how compulsively listenable a podcast is —
              whether you find yourself hitting "next episode" immediately. It's the metric we weight most heavily
              in recommendations.
            </p>
            <p>
              Reviews are moderated before appearing publicly to keep the community constructive and on-topic.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="heading-section text-2xl sm:text-3xl mb-4">Start exploring</h2>
          <p className="text-stone-muted mb-8">
            Over 100 reviewed podcasts. Filters for case type, country, platform, and more.
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
