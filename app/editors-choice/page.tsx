export const revalidate = 3600

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Star, ArrowRight, Headphones } from 'lucide-react'
import { supabasePublic } from '@/lib/supabase/public'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { BASE, breadcrumbSchema } from '@/lib/seo'
import { cn, countryFlag, scoreBg } from '@/lib/utils'
import type { Podcast, RatingStats } from '@/lib/types/database'

// ── Editor's picks — order = rank ─────────────────────────────────────────────
const PICKS = [
  {
    slug: 'the-teachers-pet',
    blurb:
      'The benchmark. Hedley Thomas spent years on this investigation into Lynette Dawson\'s 1982 disappearance, and the podcast helped put her husband Chris Dawson behind bars in 2022. That\'s not just great journalism — it\'s a case study in what the format can actually achieve. Start at Episode 1 and clear your schedule.',
  },
  {
    slug: 'casefile-true-crime',
    blurb:
      'No host personality, no banter, no filler. Just clean, cold, rigorous storytelling on cases you\'ve probably never heard of — and a handful you have, told better than anywhere else. Casefile is what I\'d recommend to someone who says they don\'t really like true crime podcasts. It might change their mind.',
  },
  {
    slug: 'i-could-murder-a-podcast',
    blurb:
      'The first British true crime podcast that made me actually laugh — and immediately feel guilty about it. Kieran and Ben have found the exact frequency between dark and funny that most comedy-adjacent shows miss completely. Dry, self-deprecating, and surprisingly thoughtful about the cases it covers.',
  },
  {
    slug: 'monster-dc-sniper',
    blurb:
      'Three weeks in October 2002 that paralysed an entire region. The DC Sniper case was all over the news at the time, but nobody quite explained how badly the investigation went sideways before it ended. Monster: DC Sniper finally makes sense of the chaos, the wrong turns, and the politics.',
  },
  {
    slug: 'the-lady-vanishes',
    blurb:
      'A journalist and a daughter, still looking for Marion Barter 25+ years after she vanished. This is what true crime podcasting looks like when it refuses to give up — the investigation genuinely pressured NSW Police to reopen the case. One of the most moving listens in the genre.',
  },
]

export const metadata: Metadata = {
  title: "Editor's Choice | ListenTrueCrime",
  description:
    "Five personal picks from the ListenTrueCrime editor — the true crime podcasts that set the standard for the genre.",
  alternates: { canonical: `${BASE}/editors-choice` },
  openGraph: {
    title: "Editor's Choice — ListenTrueCrime",
    description:
      "Five essential true crime podcasts, personally chosen by the ListenTrueCrime editor.",
    url: `${BASE}/editors-choice`,
  },
}

export default async function EditorsChoicePage() {
  const slugs = PICKS.map(p => p.slug)

  const { data } = await supabasePublic
    .from('podcasts')
    .select('*, rating_stats:podcast_rating_stats(*)')
    .in('slug', slugs)
    .eq('is_published', true)

  type PodcastWithStats = Podcast & { rating_stats: RatingStats | null }
  const podcastMap = new Map((data ?? []).map((p: any) => [p.slug, p as PodcastWithStats]))

  const picks = PICKS.map(pick => ({
    ...pick,
    podcast: podcastMap.get(pick.slug) ?? null,
  })).filter(p => p.podcast !== null) as Array<{
    slug: string
    blurb: string
    podcast: PodcastWithStats
  }>

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: "Editor's Choice — ListenTrueCrime",
    description: "Five personally chosen true crime podcasts from the ListenTrueCrime editor.",
    url: `${BASE}/editors-choice`,
    numberOfItems: picks.length,
    itemListElement: picks.map(({ podcast }, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: podcast.title,
      url: `${BASE}/podcasts/${podcast.slug}`,
    })),
  }

  const breadcrumbs = breadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: "Editor's Choice", url: `${BASE}/editors-choice` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <Header />

      <main className="pt-24 pb-16">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crimson/10 border border-crimson/20 text-crimson text-xs font-semibold uppercase tracking-widest mb-6">
            <Star size={11} fill="currentColor" />
            Editor's Choice
          </div>
          <h1 className="heading-display text-4xl sm:text-5xl mb-5">
            Five podcasts that set the standard
          </h1>
          <p className="text-stone-muted text-lg leading-relaxed max-w-2xl mx-auto">
            These aren't the highest-rated by the numbers — though most of them are. These are the
            shows that made me understand what this genre is capable of at its best. Each one does
            something the others don't.
          </p>
        </section>

        {/* ── Picks ────────────────────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {picks.map(({ slug, blurb, podcast }, index) => {
            const rank = index + 1
            const stats = podcast.rating_stats
            const score = stats?.avg_overall

            const ratingItems = stats ? [
              { label: 'Research',    value: stats.avg_research },
              { label: 'Host',        value: stats.avg_host_quality },
              { label: 'Production',  value: stats.avg_production },
              { label: 'Binge factor',value: stats.avg_binge_factor },
            ] : []

            return (
              <article key={slug} className="group relative">
                {/* Hover glow */}
                <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-crimson/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative card overflow-hidden">
                  <div className="flex flex-col sm:flex-row">

                    {/* ── Cover art + rank number ─────────────────────────── */}
                    <div className="relative sm:w-44 sm:shrink-0">
                      {/* Rank overlay */}
                      <div className="absolute top-3 left-3 z-10 leading-none">
                        <span className="font-serif text-5xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                          {String(rank).padStart(2, '0')}
                        </span>
                      </div>

                      {/* Image — square container so artwork never crops */}
                      <div className="relative aspect-square bg-ink-700">
                        {podcast.image_url ? (
                          <Image
                            src={podcast.image_url}
                            alt={`${podcast.title} podcast cover`}
                            fill
                            sizes="(max-width: 640px) 100vw, 176px"
                            className="object-cover"
                            priority={rank <= 2}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Headphones size={36} className="text-ink-500" />
                          </div>
                        )}
                        {/* Subtle dark overlay so rank number is always readable */}
                        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-ink-950/20" />
                      </div>
                    </div>

                    {/* ── Content ─────────────────────────────────────────── */}
                    <div className="flex-1 p-5 sm:p-6 flex flex-col gap-4">

                      {/* Title row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {/* Country + case type tags */}
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            {podcast.country && (
                              <span className="text-stone-subtle text-xs">{countryFlag(podcast.country)}</span>
                            )}
                            {podcast.case_types?.slice(0, 2).map(t => (
                              <span key={t} className="tag">{t}</span>
                            ))}
                          </div>

                          <h2 className="font-serif text-xl sm:text-2xl text-stone font-semibold leading-tight group-hover:text-white transition-colors">
                            {podcast.title}
                          </h2>
                        </div>

                        {/* Score + verdict */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {score != null && (
                            <span className={cn('score-badge text-sm', scoreBg(score))}>
                              {score.toFixed(1)}
                            </span>
                          )}
                          {podcast.quick_verdict && (
                            <span className={cn(
                              'text-2xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap',
                              podcast.quick_verdict === 'Must listen'
                                ? 'bg-crimson/15 text-crimson border border-crimson/20'
                                : 'bg-ink-700 text-stone-muted border border-white/[0.06]'
                            )}>
                              {podcast.quick_verdict}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Editor's blurb */}
                      <blockquote className="border-l-2 border-crimson/50 pl-4">
                        <p className="text-stone-muted text-sm leading-relaxed italic">
                          {blurb}
                        </p>
                      </blockquote>

                      {/* Newsletter summary (from DB) */}
                      {podcast.newsletter_worthy_summary && (
                        <p className="text-stone-subtle text-sm leading-relaxed">
                          {podcast.newsletter_worthy_summary}
                        </p>
                      )}

                      {/* Rating mini-bars */}
                      {ratingItems.some(r => r.value != null) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {ratingItems.map(({ label, value }) => value != null ? (
                            <div key={label} className="bg-ink-700/60 rounded-md p-2.5">
                              <p className="text-stone-subtle text-2xs mb-1.5 uppercase tracking-wide">{label}</p>
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1 bg-ink-600 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-crimson to-gold-DEFAULT rounded-full"
                                    style={{ width: `${(value / 10) * 100}%` }}
                                  />
                                </div>
                                <span className="text-stone-muted text-2xs tabular-nums font-medium">
                                  {value.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          ) : null)}
                        </div>
                      )}

                      {/* CTA */}
                      <div>
                        <Link
                          href={`/podcasts/${podcast.slug}`}
                          className="inline-flex items-center gap-1.5 text-sm text-crimson hover:text-crimson-hover transition-colors font-medium"
                        >
                          Read full review <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {/* ── Newsletter CTA ────────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 section-divider pt-16">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.06] p-8 sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
            <div className="relative z-10 max-w-lg">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-3">Newsletter</p>
              <h2 className="heading-section text-2xl sm:text-3xl mb-3">More picks, every week</h2>
              <p className="text-stone-muted text-sm mb-6 leading-relaxed">
                New reviews, hidden gems, and editor recommendations — straight to your inbox.
              </p>
              <NewsletterForm source="editors_choice" />
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
