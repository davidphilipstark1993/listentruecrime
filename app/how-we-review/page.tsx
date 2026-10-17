import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, Search, Mic, Volume2, Zap, Shield, BarChart3, CheckCircle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BASE } from '@/lib/seo/config'

export const metadata: Metadata = {
  title: 'How We Review True Crime Podcasts',
  description: 'How ListenTrueCrime rates true crime podcasts: an editorial verdict and Binge Factor score for every show, plus community ratings across six dimensions.',
  alternates: { canonical: `${BASE}/how-we-review` },
  openGraph: {
    type: 'website',
    title: 'How We Review True Crime Podcasts | ListenTrueCrime',
    description: 'Our methodology: editorial verdicts, the Binge Factor score, and six-dimension community ratings.',
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
    description: 'How well the case is structured and told: pacing, tension, clarity, and whether the story holds together across episodes.',
    what_high: 'Well-signposted structure, no filler episodes, clear timeline management',
    what_low: 'Rambling episodes, unclear case structure, excessive tangents, repetition between episodes',
  },
  {
    icon: Search,
    name: 'Research Quality',
    score: '1–10',
    description: 'Depth and rigour of sourcing: primary documents, original interviews, and whether the show goes beyond news reports.',
    what_high: 'Court documents, original interviews, FOIA requests, on-the-ground reporting',
    what_low: 'Reliance on Wikipedia and news articles, no original sourcing, unverified claims',
  },
  {
    icon: Mic,
    name: 'Host Quality',
    score: '1–10',
    description: 'The presenter\'s authority, warmth, and trustworthiness, and whether the tone suits the subject.',
    what_high: 'Command of case details, appropriate emotional register, natural delivery',
    what_low: 'Mispronounced names, cavalier treatment of victims, stilted or over-scripted delivery',
  },
  {
    icon: Volume2,
    name: 'Production / Audio',
    score: '1–10',
    description: 'Sound quality, editing, and professional finish.',
    what_high: 'Clean audio, professional editing, sound design that supports the story',
    what_low: 'Background noise, inconsistent levels, excessive ad breaks, jarring cuts',
  },
  {
    icon: Zap,
    name: 'Binge Factor',
    score: '1–10',
    description: 'How compulsively listenable the show is. This is the one dimension we also score editorially for every podcast, and it drives our "binge-worthy" listings.',
    what_high: '9–10: you lose track of time. 7–8: strong "one more episode" pull.',
    what_low: '1–4: easy to stop mid-series without feeling compelled to finish',
  },
  {
    icon: Shield,
    name: 'Factual Accuracy',
    score: '1–10',
    description: 'Accuracy of claims and responsible use of evidence, including how a show handles contested evidence and speculation.',
    what_high: 'Corrects errors publicly, labels speculation, separates confirmed facts from theories',
    what_low: 'Presents speculation as confirmed, known errors uncorrected, conflates different cases',
  },
]

const verdicts = [
  {
    label: 'Must listen',
    color: 'text-crimson',
    bg: 'bg-crimson/10 border-crimson/20',
    description: 'Our strongest recommendation. Reserved for shows we would recommend to almost any true crime listener.',
  },
  {
    label: 'Worth a listen',
    color: 'text-gold-light',
    bg: 'bg-gold-DEFAULT/10 border-gold-DEFAULT/20',
    description: 'A solid show with clear strengths, recommended to listeners whose interests match its format and cases.',
  },
  {
    label: 'Audience-fit verdicts',
    color: 'text-stone-muted',
    bg: 'bg-ink-700 border-white/10',
    description: 'Many shows get a verdict that says who they suit, for example "Good if UK true crime interests you". These are not warnings; they tell you whether the show\'s focus matches yours.',
  },
]

export default function HowWeReviewPage() {
  const methodologySchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How We Review True Crime Podcasts — Our Editorial Methodology',
    description: 'A full explanation of the ListenTrueCrime editorial scoring system, covering editorial verdicts, the Binge Factor score and the six community rating dimensions.',
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
      <main id="main-content" className="pt-24 pb-16">

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
            Every podcast carries two kinds of rating, kept separate: our editorial verdict and Binge Factor score,
            and community ratings on six dimensions. Here is what each one means.
          </p>
        </section>

        {/* Principles */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <div className="card p-6 sm:p-8">
            <h2 className="font-serif text-xl text-stone mb-4">Our editorial principles</h2>
            <ul className="space-y-3">
              {[
                'Editorial verdicts and Binge Factor scores are our own opinion, set by the editor and informed by what listeners and critics say about each show in public reviews',
                'We do not claim to have listened to every episode of every show in the directory',
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
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">The six community dimensions</p>
            <h2 className="heading-section text-2xl sm:text-3xl">What we score and why</h2>
            <p className="text-stone-muted text-sm mt-2 max-w-2xl">
              Registered listeners score each dimension independently on a 1–10 scale. Binge Factor is the only
              dimension that also has an editorial score.
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
              Any listener can rate a podcast across these six dimensions plus an overall score, signed in or not
              (one rating per browser per podcast). Community scores are averaged and displayed separately from our
              editorial verdict.
            </p>
            <p>
              Community ratings appear on podcast pages as soon as a podcast has one. Submissions are not identity-verified,
              so we only include aggregated community scores in search engine structured data once a podcast has at
              least three ratings.
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
