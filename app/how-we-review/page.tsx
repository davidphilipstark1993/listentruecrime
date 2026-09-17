import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, Search, Mic, Volume2, Zap, Shield, BarChart3, CheckCircle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BASE } from '@/lib/seo/config'

export const metadata: Metadata = {
  title: 'How We Review True Crime Podcasts — Our Editorial Methodology',
  description: 'Every podcast on ListenTrueCrime is reviewed across 6 dimensions. Learn how our editorial team scores storytelling, research, host quality, production, binge factor, and factual accuracy.',
  alternates: { canonical: `${BASE}/how-we-review` },
  openGraph: {
    type: 'website',
    title: 'How We Review True Crime Podcasts | ListenTrueCrime',
    description: 'Our editorial methodology: 6 dimensions, 1–10 scoring, and what earns a "Must Listen" verdict.',
    url: `${BASE}/how-we-review`,
    images: [{
      url: `${BASE}/og?${new URLSearchParams({ title: 'How We Review', sub: 'Our Editorial Methodology' }).toString()}`,
      width: 1200,
      height: 630,
    }],
  },
}

const dimensions = [
  {
    icon: Star,
    name: 'Storytelling',
    score: '1–10',
    description: 'How well the case is structured and narrated. We assess pacing, tension, clarity, and whether the story holds together across episodes. A 10 is a show that makes you forget you\'re listening to a podcast.',
    what_high: 'Cinematic pacing, well-signposted structure, no filler episodes, clear timeline management',
    what_low: 'Rambling episodes, unclear case structure, excessive tangents, repetition between episodes',
  },
  {
    icon: Search,
    name: 'Research Quality',
    score: '1–10',
    description: 'Depth and rigour of sourcing. We consider use of primary documents (court records, police files, FOIA requests), original interviews with key figures, and whether the show goes beyond news reports.',
    what_high: 'Court documents, original interviews, FOIA requests, on-the-ground reporting',
    what_low: 'Reliance on Wikipedia and news articles, no original sourcing, unverified claims',
  },
  {
    icon: Mic,
    name: 'Host Quality',
    score: '1–10',
    description: 'The presenter\'s authority, warmth, and trustworthiness. We assess whether the host clearly understands the case, maintains appropriate tone, and builds a genuine connection with the listener.',
    what_high: 'Expert command of case details, appropriate emotional register, natural delivery',
    what_low: 'Mispronounced names, cavalier treatment of victims, stilted or over-scripted delivery',
  },
  {
    icon: Volume2,
    name: 'Production / Audio',
    score: '1–10',
    description: 'Sound quality, editing, and professional finish. Clean audio is the baseline; high scores go to shows with thoughtful sound design, consistent levels, and seamless editing.',
    what_high: 'Studio-quality audio, professional editing, subtle sound design that enhances atmosphere',
    what_low: 'Background noise, inconsistent levels, excessive ad breaks, jarring cuts',
  },
  {
    icon: Zap,
    name: 'Binge Factor',
    score: '1–10',
    description: 'How compulsively listenable the show is — the metric we weight most heavily in recommendations. A 10 means you will automatically hit "next episode" every time. This captures something the other dimensions miss: the overall pull of the show.',
    what_high: '9–10: You lose track of time. 7–8: Strong "one more episode" pull. 5–6: Enjoyable but easy to pause.',
    what_low: '1–4: Easy to stop mid-series without feeling compelled to finish',
  },
  {
    icon: Shield,
    name: 'Factual Accuracy',
    score: '1–10',
    description: 'Accuracy of claims and responsible use of evidence. We note errors we can verify, speculation presented as fact, and how the show handles contested evidence. High-binge shows with factual issues are flagged clearly.',
    what_high: 'Corrects errors publicly, clearly labels speculation, distinguishes confirmed facts from theories',
    what_low: 'Presents speculation as confirmed, known errors uncorrected, conflates different cases',
  },
]

const verdicts = [
  {
    label: 'Must Listen',
    color: 'text-crimson',
    bg: 'bg-crimson/10 border-crimson/20',
    description: 'Reserved for podcasts that score exceptionally across all six dimensions AND have a binge factor of 8 or above. Less than 10% of podcasts in our database earn this rating.',
  },
  {
    label: 'Worth a Listen',
    color: 'text-gold-light',
    bg: 'bg-gold-DEFAULT/10 border-gold-DEFAULT/20',
    description: 'Solid shows with meaningful strengths in most dimensions. These are recommended to listeners whose interests align with the show\'s case types and format.',
  },
  {
    label: 'Approach with Caution',
    color: 'text-stone-muted',
    bg: 'bg-ink-700 border-white/10',
    description: 'Shows with notable weaknesses in factual accuracy, host quality, or production that listeners should be aware of before committing to a series.',
  },
]

export default function HowWeReviewPage() {
  const methodologySchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How We Review True Crime Podcasts — Our Editorial Methodology',
    description: 'A full explanation of the ListenTrueCrime editorial scoring system, covering all six review dimensions and how verdicts are assigned.',
    author: {
      '@type': 'Organization',
      name: 'ListenTrueCrime',
      url: BASE,
    },
    publisher: {
      '@type': 'Organization',
      name: 'ListenTrueCrime',
      url: BASE,
    },
    url: `${BASE}/how-we-review`,
    mainEntityOfPage: `${BASE}/how-we-review`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(methodologySchema) }} />
      <Header />
      <main className="pt-24 pb-16">

        {/* Hero */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-1.5 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <Link href="/about" className="hover:text-stone transition-colors">About</Link>
            <span>/</span>
            <span className="text-stone-muted">How We Review</span>
          </nav>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crimson/10 border border-crimson/20 text-crimson text-xs font-medium mb-6">
            <BarChart3 size={11} />
            Editorial methodology
          </div>
          <h1 className="heading-display text-4xl sm:text-5xl mb-4">How we review true crime podcasts</h1>
          <p className="text-stone-muted text-lg max-w-2xl mx-auto leading-relaxed">
            Every podcast in our database is scored across six dimensions on a 1–10 scale.
            Here's exactly what each dimension measures and how we arrive at a final verdict.
          </p>
        </section>

        {/* Principles */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="card p-6 sm:p-8">
            <h2 className="font-serif text-xl text-stone mb-4">Our editorial principles</h2>
            <ul className="space-y-3">
              {[
                'We score every podcast ourselves — we do not rely on listener submissions for editorial scores',
                'We listen to a minimum of three full episodes (or two full seasons for serialised shows) before publishing a score',
                'We separate our editorial verdict from community ratings — both are shown, neither replaces the other',
                'We update scores when shows improve, decline, or if we receive compelling evidence of errors in our assessment',
                'Victim sensitivity is always a factor — shows that exploit grief or trauma will have that noted explicitly',
              ].map((p, i) => (
                <li key={i} className="flex items-start gap-3 text-stone-muted text-sm leading-relaxed">
                  <CheckCircle size={16} className="text-crimson mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The six dimensions */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="mb-8">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">The six dimensions</p>
            <h2 className="heading-section text-2xl sm:text-3xl">What we score and why</h2>
            <p className="text-stone-muted text-sm mt-2 max-w-2xl">
              Each dimension is scored independently on a 1–10 scale. These scores are also open to community rating
              from registered listeners.
            </p>
          </div>
          <div className="space-y-5">
            {dimensions.map((dim, i) => (
              <div key={dim.name} className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-crimson/10 border border-crimson/20 flex items-center justify-center shrink-0 mt-0.5">
                    <dim.icon size={18} className="text-crimson" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-serif text-lg text-stone">{dim.name}</h3>
                      <span className="text-stone-subtle text-xs bg-ink-700 px-2 py-0.5 rounded">Score: {dim.score}</span>
                    </div>
                    <p className="text-stone-muted text-sm leading-relaxed mb-4">{dim.description}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-emerald-950/30 border border-emerald-900/30 rounded-lg p-3">
                        <p className="text-emerald-400 text-2xs font-semibold uppercase tracking-wider mb-1">High scores</p>
                        <p className="text-stone-muted text-xs leading-relaxed">{dim.what_high}</p>
                      </div>
                      <div className="bg-ink-800 border border-white/[0.06] rounded-lg p-3">
                        <p className="text-stone-subtle text-2xs font-semibold uppercase tracking-wider mb-1">Low scores</p>
                        <p className="text-stone-muted text-xs leading-relaxed">{dim.what_low}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Verdicts */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-16">
          <h2 className="heading-section text-2xl sm:text-3xl mb-6">Editorial verdicts</h2>
          <div className="space-y-4">
            {verdicts.map(v => (
              <div key={v.label} className={`card p-5 border ${v.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`font-semibold text-sm ${v.color}`}>{v.label}</span>
                </div>
                <p className="text-stone-muted text-sm leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Community ratings */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-16">
          <h2 className="heading-section text-2xl sm:text-3xl mb-4">Community ratings</h2>
          <div className="card p-6 space-y-4 text-stone-muted text-sm leading-relaxed">
            <p>
              Registered listeners can rate any podcast across the same six dimensions. These community scores are
              averaged and displayed separately from our editorial scores.
            </p>
            <p>
              Community ratings appear on podcast pages once there is at least one verified submission.
              We do not emit aggregated community scores in search engine structured data until there
              is a meaningful sample (minimum: 1 verified rating).
            </p>
            <p>
              Reviews are moderated before appearing publicly. We remove reviews that are off-topic, contain
              personal attacks, or appear to be coordinated manipulation.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center section-divider pt-16">
          <h2 className="heading-section text-xl sm:text-2xl mb-4">Ready to explore?</h2>
          <p className="text-stone-muted text-sm mb-6">
            Browse our full database of reviewed and rated true crime podcasts.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/browse" className="btn-primary px-6 py-3">Browse all podcasts</Link>
            <Link href="/best-true-crime-podcasts" className="btn-outline px-6 py-3">See our top picks</Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
