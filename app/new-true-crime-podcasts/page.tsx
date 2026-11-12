import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { getAllPosts } from '@/lib/blog'
import { buildBreadcrumbSchema, buildFAQSchema, buildItemListSchema } from '@/lib/seo/content'
import { BASE, ogDefaults } from '@/lib/seo/config'
import { oneLine } from '@/lib/seo/one-line'
import {
  NEW_PAGE_PATH, NEW_PAGE_LIMIT, pickNewPodcasts, formatAddedDate,
  newPageTitle, newPageDescription,
} from '@/lib/seo/new-podcasts'
import type { Podcast } from '@/lib/types/database'

// Owner page for "new true crime podcasts". Fed entirely by the podcasts
// table, newest first, so each show the daily discovery routine adds appears
// here within the hour (ISR) with no code or content change.
export const revalidate = 3600

async function getNewPodcasts(): Promise<Podcast[]> {
  const { data } = await createAdminClient()
    .from('podcasts')
    .select('*')
    .eq('is_published', true)
    .not('binge_factor', 'is', null)
    .order('created_at', { ascending: false })
    .limit(120)
  return pickNewPodcasts((data ?? []) as Podcast[], NEW_PAGE_LIMIT)
}

/** Monthly new-release roundups on the blog (a new one links in automatically when it is published). */
function getMonthlyRoundups() {
  const today = new Date().toISOString().slice(0, 10)
  return getAllPosts()
    .filter(p => p.category === 'New Releases' && (!p.date || p.date <= today))
    .slice(0, 6)
}

export async function generateMetadata(): Promise<Metadata> {
  const shows = await getNewPodcasts()
  const title = newPageTitle(shows[0]?.created_at)
  const description = newPageDescription(shows.map(s => s.title))
  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      url: `${BASE}${NEW_PAGE_PATH}`,
      ...ogDefaults('New True Crime Podcasts', 'The latest shows added, newest first'),
    },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: `${BASE}${NEW_PAGE_PATH}` },
  }
}

export default async function NewTrueCrimePodcastsPage() {
  const shows = await getNewPodcasts()
  const roundups = getMonthlyRoundups()
  const newest = shows[0]
  const newestDate = formatAddedDate(newest?.created_at)

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'New True Crime Podcasts', url: `${BASE}${NEW_PAGE_PATH}` },
  ])
  const itemListSchema = shows.length > 0 ? buildItemListSchema(
    'New True Crime Podcasts',
    'True crime podcasts most recently added to ListenTrueCrime, newest first',
    shows.map(p => ({ name: p.title, url: `${BASE}/podcasts/${p.slug}` })),
  ) : null
  // Answers are generated from the live list, never hand-written claims.
  const faqs = newest ? [
    {
      q: 'What is the newest true crime podcast on ListenTrueCrime?',
      a: `${newest.title}, added on ${newestDate} with a Binge Factor of ${newest.binge_factor}/10. ${shows.length > 2 ? `Before that we added ${shows[1].title} and ${shows[2].title}.` : ''}`.trim(),
    },
    {
      q: 'How often is this list of new true crime podcasts updated?',
      a: `Automatically, whenever we add a reviewed show to the directory. The most recent addition was on ${newestDate}.`,
    },
  ] : []
  const faqSchema = faqs.length ? buildFAQSchema(faqs) : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {itemListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />}
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <Header />

      <main id="main-content" className="pt-24 pb-16">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-6">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <span className="text-stone-muted">New True Crime Podcasts</span>
          </nav>
          <h1 className="heading-display text-4xl sm:text-5xl mb-4">New True Crime Podcasts</h1>
          <p className="text-stone-muted text-base sm:text-lg leading-relaxed">
            The true crime podcasts we have added to ListenTrueCrime most recently, newest first.
            Some are brand-new launches; others are established shows we have only just reviewed.
            Each entry shows the date we added it, our Binge Factor out of 10 and our verdict.
          </p>
          {newestDate && (
            <p className="text-stone-subtle text-sm mt-3">Updated automatically. Latest addition: {newestDate}.</p>
          )}
          <p className="text-stone-muted text-sm mt-4">
            Want proven favourites instead? See the{' '}
            <Link href="/best-true-crime-podcasts" className="text-crimson hover:underline">best true crime podcasts</Link>, ranked.
          </p>
        </section>

        {shows.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16" aria-labelledby="latest-h">
            <h2 id="latest-h" className="heading-section text-2xl mb-6">Latest additions</h2>
            <ol className="space-y-4">
              {shows.map(p => {
                const blurb = p.short_description ? oneLine(p.short_description, 160) : ''
                return (
                  <li key={p.id} className="card p-4 flex gap-4">
                    {p.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={`${p.title} artwork`} width={72} height={72} loading="lazy" className="w-[72px] h-[72px] rounded-lg object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h3 className="text-stone font-semibold">
                        <Link href={`/podcasts/${p.slug}`} className="hover:text-crimson transition-colors">{p.title}</Link>
                      </h3>
                      <p className="text-stone-subtle text-xs mt-0.5">
                        Added {formatAddedDate(p.created_at)}
                        {p.binge_factor ? <> · Binge Factor {p.binge_factor}/10</> : null}
                        {p.country_name ? <> · {p.country_name}</> : null}
                      </p>
                      {blurb && <p className="text-stone-muted text-sm mt-2 leading-relaxed">{blurb}</p>}
                      {p.quick_verdict?.trim() && (
                        <p className="text-stone-muted text-sm mt-1"><strong className="text-stone">Verdict:</strong> {p.quick_verdict.trim()}</p>
                      )}
                      {p.best_episode_to_start?.trim() && (
                        <p className="text-stone-muted text-sm mt-1"><strong className="text-stone">Start with:</strong> {p.best_episode_to_start.trim()}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
            <p className="text-sm text-stone-muted mt-6">
              <Link href="/browse" className="text-crimson hover:underline inline-flex items-center gap-1">Browse all true crime podcasts <ArrowRight size={13} /></Link>
            </p>
          </section>
        )}

        {roundups.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16" aria-labelledby="roundups-h">
            <h2 id="roundups-h" className="heading-section text-2xl mb-4">Monthly new-release roundups</h2>
            <ul className="space-y-2">
              {roundups.map(post => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`} className="text-crimson hover:underline">{post.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {faqs.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16" aria-labelledby="faq-h">
            <h2 id="faq-h" className="heading-section text-2xl mb-4">Frequently asked questions</h2>
            <div className="space-y-4">
              {faqs.map(f => (
                <div key={f.q} className="card p-5">
                  <h3 className="text-stone font-medium text-sm">{f.q}</h3>
                  <p className="text-stone-muted text-sm leading-relaxed mt-2">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-ink-800 border border-white/[0.06] p-8">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-3">Newsletter</p>
            <h2 className="heading-section text-2xl mb-3">Five podcast picks every Sunday</h2>
            <p className="text-stone-muted text-sm mb-6">New finds and favourites, free, once a week.</p>
            <NewsletterForm source="new_podcasts_page" />
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
