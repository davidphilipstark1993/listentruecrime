import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { createAdminClient } from '@/lib/supabase/admin'
import { BASE } from '@/lib/seo/config'
import { BadgeEmbedGenerator } from '@/components/podcasts/badge-embed-generator'

export const metadata: Metadata = {
  title: 'Podcaster Badge Programme — ListenTrueCrime',
  description: 'Show listeners your podcast has been independently reviewed. Embed a ListenTrueCrime badge on your website, show notes, or press kit.',
  alternates: { canonical: `${BASE}/badge` },
}

const TIERS = [
  {
    verdict: 'Must listen',
    colour: 'bg-crimson',
    description: 'Our highest editorial rating. Reserved for podcasts that excel across all six scoring dimensions.',
  },
  {
    verdict: 'Recommended',
    colour: 'bg-blue-700',
    description: 'Solid, well-produced shows we actively recommend to listeners. Strong in most dimensions.',
  },
  {
    verdict: 'Worth a go',
    colour: 'bg-ink-600',
    description: 'Decent podcasts with a clear audience in mind. Good but not exceptional.',
  },
]

async function getPodcastList() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('podcasts')
    .select('slug, title')
    .eq('is_published', true)
    .order('title', { ascending: true })
  return data ?? []
}

export default async function BadgePage() {
  const podcasts = await getPodcastList()

  return (
    <>
      <Header />
      <main className="min-h-screen bg-ink-950 pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-stone-subtle mb-10">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <span className="text-stone-muted">Podcaster Badges</span>
          </nav>

          <h1 className="font-serif text-3xl font-bold text-stone mb-4">
            Podcaster Badge Programme
          </h1>
          <p className="text-stone-muted text-base leading-relaxed mb-10">
            If your podcast has been reviewed on ListenTrueCrime, you can display an independent review badge on your website, show notes, or press kit. The badge updates automatically when your score changes.
          </p>

          {/* Verdict tiers */}
          <h2 className="font-serif text-xl text-stone mb-5">Badge tiers</h2>
          <div className="space-y-4 mb-12">
            {TIERS.map(tier => (
              <div key={tier.verdict} className="flex items-start gap-4 card p-5">
                <div className={`mt-0.5 w-3 h-3 rounded-full shrink-0 ${tier.colour}`} />
                <div>
                  <p className="text-stone font-semibold text-sm mb-1">{tier.verdict}</p>
                  <p className="text-stone-muted text-sm leading-relaxed">{tier.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Embed generator */}
          <h2 className="font-serif text-xl text-stone mb-5">Get your embed code</h2>
          <BadgeEmbedGenerator podcasts={podcasts} />

          {/* Rules */}
          <div className="mt-12 pt-8 border-t border-white/[0.07]">
            <h2 className="font-serif text-lg text-stone mb-4">Badge guidelines</h2>
            <ul className="space-y-2 text-sm text-stone-muted">
              <li>→ You may use the badge only for the specific podcast listed on your review page.</li>
              <li>→ Do not crop, recolour, or modify the badge image.</li>
              <li>→ The badge must link back to your review page on ListenTrueCrime.</li>
              <li>→ Badges for "Avoid" verdicts may not be used for promotional purposes.</li>
              <li>→ We reserve the right to update scores at any time.</li>
            </ul>
            <p className="text-xs text-stone-subtle mt-5">
              Questions?{' '}
              <a href="mailto:info@listentruecrime.com" className="text-stone hover:underline">
                info@listentruecrime.com
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
