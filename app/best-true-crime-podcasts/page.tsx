import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { RecommendationEntry } from '@/components/best/recommendation-entry'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { NewsletterLeadMagnet } from '@/components/newsletter/newsletter-lead-magnet'
import { CATEGORIES, COUNTRIES } from '@/lib/types/database'
import { BASE, ogDefaults } from '@/lib/seo/config'
import { buildBestPageGraph } from '@/lib/seo/best-schema'
import { getAffiliateProductsForPage } from '@/lib/affiliates/queries'
import { FurtherReading } from '@/components/affiliates/further-reading'
import { POPULAR_GUIDES } from '@/lib/seo/popular-guides'
import { getPostBySlug } from '@/lib/blog'
import { getAuthor } from '@/lib/authors'
import {
  BEST_PAGE_COLUMNS, BEST_PAGE_UPDATED, BEST_PAGE_YEAR, BEST_SECTIONS, buildBestFaqs, buildSections, computeFacts,
  describeEntry, formatBestPageDate, pickTopPicks, type BestPodcast,
} from '@/lib/best-page'

const PATH = '/best-true-crime-podcasts'
const URL_ = `${BASE}${PATH}`
const YEAR = BEST_PAGE_YEAR
const TITLE = `Best True Crime Podcasts (${YEAR}): Editor's Picks by Genre`
const DESCRIPTION = `The best true crime podcasts of ${YEAR}, picked by our editor with Binge Factor scores, plus top picks for beginners, cold cases, serial killers and the UK.`

export const metadata: Metadata = {
  // Absolute: the site template would append " | ListenTrueCrime" and push this past ~60 characters.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL_,
    ...ogDefaults(`Best True Crime Podcasts (${YEAR})`, "Editor's picks, scored for Binge Factor"),
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  alternates: { canonical: URL_ },
}

export const revalidate = 3600

/** Safe to inline in a <script>: stops "</script>" or "<!--" sequences in data ending the block. */
const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

function NameLink({ p }: { p: BestPodcast }) {
  return <Link href={`/podcasts/${p.slug}`} className="text-crimson hover:underline font-medium">{p.title}</Link>
}

export default async function BestTrueCrimePodcastsPage() {
  const supabase = createAdminClient()

  const curatedSlugs = Array.from(new Set(BEST_SECTIONS.map(s => s.curatedFrom).filter((s): s is string => !!s)))
  const curated: Record<string, string[]> = {}
  for (const slug of curatedSlugs) curated[slug] = getPostBySlug(slug)?.relatedPodcasts ?? []

  const [{ data: rows }, { count: threeRatings }, reading] = await Promise.all([
    supabase.from('podcasts').select(BEST_PAGE_COLUMNS).eq('is_published', true).limit(5000),
    supabase.from('podcast_rating_stats').select('podcast_id', { count: 'exact', head: true }).gte('rating_count', 3),
    // Books placed on this page in /admin/affiliates (page type "Other page")
    getAffiliateProductsForPage('page', 'best-true-crime-podcasts'),
  ])

  const all = (rows ?? []) as unknown as BestPodcast[]
  const { picks: top, total: topTotal } = pickTopPicks(all, 10)
  const sections = buildSections(all, curated, 5)
  const facts = computeFacts(all, threeRatings ?? 0)
  const dateLabel = formatBestPageDate()
  const faqs = buildBestFaqs(top, sections, facts, dateLabel)
  const author = getAuthor('david-stark')
  const section = (id: string) => sections.find(s => s.id === id)

  const topSummaries = top.map(p => ({ podcast: p, summary: describeEntry(p).summary }))
  const graph = buildBestPageGraph({
    url: URL_,
    name: `Best True Crime Podcasts (${YEAR})`,
    description: DESCRIPTION,
    dateModified: BEST_PAGE_UPDATED,
    authorSlug: author.slug,
    topPicks: topSummaries,
    faqs,
    breadcrumb: [{ name: 'Home', url: BASE }, { name: 'Best True Crime Podcasts', url: URL_ }],
  })

  // "Quick answers": the first entry of each section, so a skim reader (or an
  // answer engine) gets the headline pick for each intent without scrolling.
  const quick: { label: string; p: BestPodcast }[] = [
    ...(top[0] ? [{ label: 'Best overall', p: top[0] }] : []),
    ...sections.filter(s => s.id !== 'limited-series' && s.id !== 'episodic' && s.id !== 'apple-podcasts')
      .map(s => ({ label: s.quickLabel, p: s.podcasts[0] })),
  ]

  const jumpLinks = [
    { href: '#how-we-choose', label: 'How we choose' },
    { href: '#top-picks', label: "Editor's top picks" },
    ...sections.map(s => ({ href: `#${s.id}`, label: s.shortLabel })),
    { href: '#faq', label: 'FAQs' },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(graph) }} />
      <Header />

      <main id="main-content" className="pt-24 pb-16">
        {/* Hero + answer-first introduction */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <span className="text-stone-muted">Best True Crime Podcasts</span>
          </nav>
          <h1 className="heading-display text-4xl sm:text-5xl mb-5">Best True Crime Podcasts ({YEAR})</h1>

          {top.length >= 3 && (
            <p className="text-stone text-lg leading-relaxed mb-4">
              The best true crime podcasts of {YEAR}, by our ranking, are <NameLink p={top[0]} />, <NameLink p={top[1]} /> and <NameLink p={top[2]} />.
              All three carry our <strong>Must listen</strong> verdict and a Binge Factor of {Math.min(...top.slice(0, 3).map(p => p.binge_factor ?? 0))} or more out of 10.
              Below are {top.length} editor’s top picks, then the best shows for beginners, cold cases, serial killers, the UK, binge-listening and more, each linked to our full review.
            </p>
          )}
          <p className="text-stone-muted leading-relaxed mb-5">
            Our directory covers {facts.publishedCount} true crime podcasts. Rankings come from our editorial verdict and Binge Factor score, with community ratings shown separately.{' '}
            <Link href="/how-we-review" className="text-crimson hover:underline">See how we review</Link>.
          </p>
          <p className="text-stone-subtle text-sm">
            Edited by <Link href={`/authors/${author.slug}`} className="text-stone-muted hover:text-stone underline underline-offset-2">{author.name}</Link>, {author.role}
            {' · '}Last updated <time dateTime={BEST_PAGE_UPDATED}>{dateLabel}</time>
          </p>
        </section>

        {/* Quick answers */}
        {quick.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-10" aria-labelledby="quick-answers">
            <h2 id="quick-answers" className="font-serif text-xl text-stone mb-3">Quick answers</h2>
            <dl className="card p-5 grid sm:grid-cols-[minmax(0,13rem)_1fr] gap-x-6 gap-y-2 text-sm">
              {quick.map(q => (
                <div key={q.label} className="contents">
                  <dt className="text-stone-subtle">{q.label}</dt>
                  <dd className="text-stone-muted"><NameLink p={q.p} /></dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Jump links */}
        <nav aria-label="On this page" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-14">
          <ul className="flex flex-wrap gap-2">
            {jumpLinks.map(j => (
              <li key={j.href}>
                <a href={j.href} className="inline-block px-3 py-1.5 rounded-full bg-ink-800 border border-white/[0.08] text-xs text-stone-muted hover:text-stone hover:border-white/20 transition-colors">{j.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        {/* How we choose */}
        <section id="how-we-choose" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-14 scroll-mt-24" aria-labelledby="how-we-choose-h">
          <h2 id="how-we-choose-h" className="heading-section text-2xl sm:text-3xl mb-4">How we choose the best true crime podcasts</h2>
          <div className="space-y-4 text-stone-muted leading-relaxed">
            <p>Three things shape the lists on this page, and we keep them separate so you can see which is doing the work.</p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                <strong className="text-stone">Editorial verdict.</strong> Each podcast gets a short verdict from the editor: <em>Must listen</em> for our strongest recommendations, or a line saying who a show suits. Every pick on this page is a Must listen show unless it comes from one of our published guides, and the verdict is always shown beside it.
              </li>
              <li>
                <strong className="text-stone">Binge Factor.</strong> An editorial score from 1 to 10 for how compulsively listenable a show is. It sets the order within each list. {top.length > 0 && <>{topTotal} of the {facts.mustListenCount} Must listen shows score 9 or 10.</>}
              </li>
              <li>
                <strong className="text-stone">Community ratings.</strong> Listeners can rate shows on six dimensions, and those scores appear on each podcast page.{' '}
                {facts.threeRatingCount === 0
                  ? 'No podcast has yet reached three community ratings, so they do not influence the order here.'
                  : `${facts.threeRatingCount} podcasts have three or more ratings; community scores inform, but do not set, the order here.`}
              </li>
            </ol>
            <p>
              Verdicts and Binge Factor scores are the editor’s opinion, informed by public listener and critic reviews. We do not claim to have listened to every episode of every show. Paid promotion is kept separate: buying a placement does not buy a review, a verdict or a place in these lists.{' '}
              <Link href="/how-we-review" className="text-crimson hover:underline">Read the full method</Link>{' · '}
              <Link href="/promote-your-podcast#independence-heading" className="text-crimson hover:underline">Editorial independence</Link>.
            </p>
          </div>
        </section>

        {/* Editor's top picks */}
        <section id="top-picks" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 scroll-mt-24" aria-labelledby="top-picks-h">
          <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Ranked</p>
          <h2 id="top-picks-h" className="heading-section text-2xl sm:text-3xl mb-2">Editor’s top picks</h2>
          <p className="text-stone-muted text-sm mb-6">
            The {top.length} highest-ranked of {topTotal} podcasts that are both Must listen and Binge Factor 9 or 10. Ties are broken by whether the show is featured, then alphabetically.
          </p>
          <ol className="space-y-4">
            {top.map((p, i) => <RecommendationEntry key={p.id} podcast={p} rank={i + 1} priority={i < 2} />)}
          </ol>
          <p className="mt-5 text-sm">
            <Link href="/browse?sort=binge_desc" className="inline-flex items-center gap-1 text-stone-muted hover:text-stone">
              Browse every podcast by Binge Factor <ArrowRight size={14} aria-hidden />
            </Link>
          </p>
        </section>

        {/* Sub-intent sections */}
        {sections.map(s => (
          <section key={s.id} id={s.id} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-14 scroll-mt-24" aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`} className="heading-section text-2xl sm:text-3xl mb-2">{s.heading}</h2>
            <p className="text-stone-muted text-sm leading-relaxed mb-1">{s.blurb}</p>
            <p className="text-stone-subtle text-xs mb-6">
              How these are picked: {s.rule} {s.total > s.podcasts.length ? `Showing ${s.podcasts.length} of ${s.total} shows that meet this rule.` : `Showing ${s.podcasts.length} shows.`}
            </p>
            <ul className="space-y-4">
              {s.podcasts.map(p => <RecommendationEntry key={p.id} podcast={p} platform={s.platform} />)}
            </ul>
            <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {s.more.map(m => (
                <Link key={m.href} href={m.href} className="inline-flex items-center gap-1 text-crimson hover:underline">
                  {m.label} <ArrowRight size={13} aria-hidden />
                </Link>
              ))}
            </p>
          </section>
        ))}

        {/* Guides + browse hubs */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-14" aria-labelledby="guides-h">
          <h2 id="guides-h" className="heading-section text-2xl sm:text-3xl mb-6">More true crime podcast guides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {POPULAR_GUIDES.map(link => (
              <Link key={link.href} href={link.href} className="card-hover p-4 flex items-center text-stone-muted text-sm font-medium hover:text-white transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16" aria-labelledby="browse-cats-h">
          <h2 id="browse-cats-h" className="heading-section text-2xl sm:text-3xl mb-6">Browse true crime podcasts by category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="card-hover group p-5 flex flex-col gap-2">
                <span className="text-2xl" aria-hidden>{cat.emoji}</span>
                <h3 className="text-stone text-sm font-semibold group-hover:text-white transition-colors">{cat.label}</h3>
                <p className="text-stone-subtle text-xs leading-relaxed line-clamp-2">{cat.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16" aria-labelledby="browse-countries-h">
          <h2 id="browse-countries-h" className="heading-section text-2xl sm:text-3xl mb-6">Browse true crime podcasts by country</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(COUNTRIES).map(([code, name]) => (
              <Link
                key={code}
                href={`/country/${code}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ink-800 border border-white/[0.08] text-stone-muted hover:text-stone hover:border-white/20 text-sm transition-colors"
              >
                {name} True Crime <ArrowRight size={13} aria-hidden />
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ: plain headings and paragraphs, always visible, identical to the FAQPage markup */}
        <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 section-divider pt-14 scroll-mt-24" aria-labelledby="faq-h">
          <h2 id="faq-h" className="heading-section text-2xl sm:text-3xl mb-8">Best true crime podcasts: frequently asked questions</h2>
          <div className="space-y-7">
            {faqs.map(f => (
              <div key={f.q}>
                <h3 className="font-serif text-lg text-stone mb-2">{f.q}</h3>
                <p className="text-stone-muted leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-stone-subtle text-xs flex items-center gap-1.5">
            <Star size={11} aria-hidden /> Last updated <time dateTime={BEST_PAGE_UPDATED}>{dateLabel}</time>
          </p>
        </section>

        {/* Newsletter CTA */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 section-divider pt-14 mb-16">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.06] p-8 sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
            <div className="relative z-10 max-w-lg">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-3">Newsletter</p>
              <h2 className="heading-section text-2xl sm:text-3xl mb-3">Get the best picks weekly</h2>
              <p className="text-stone-muted text-sm mb-6 leading-relaxed">
                New reviews, hidden gems, and community favourites, straight to your inbox every week.
              </p>
              <NewsletterForm source="best_page" />
            </div>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <NewsletterLeadMagnet variant="banner" source="best_page_lead_magnet" />
        </section>

        {/* Related reading: only shown once products placed here are live */}
        {reading.products.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <FurtherReading
              products={reading.products}
              placement="best-podcasts-reading"
              heading="More true crime to read"
              headingAs="h2"
              note={reading.note}
            />
          </section>
        )}
      </main>

      <Footer />
    </>
  )
}
