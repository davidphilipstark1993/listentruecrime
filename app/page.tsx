import Link from 'next/link'
import type { Metadata } from 'next'
import { Search, ArrowRight, TrendingUp, Star, Zap, BookOpen } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { AdSlot } from '@/components/ads/ad-slot'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CATEGORIES } from '@/lib/types/database'
import type { Podcast, RatingStats } from '@/lib/types/database'
import { getPodcastCount, roundedPodcastCount } from '@/lib/podcast-count'
import { getPostBySlug } from '@/lib/blog'
import { POPULAR_GUIDES } from '@/lib/seo/popular-guides'
import { stripHtml } from '@/lib/utils'
import { shopEnabled } from '@/lib/shop/config'
import { BASE, CURRENT_YEAR } from '@/lib/seo/config'
import { HomepageShopPromo } from '@/components/shop/homepage-promo'

// The homepage owns the head term "true crime podcasts"; /best-true-crime-podcasts
// owns "best" (and "top"/"good"), /new-true-crime-podcasts owns "new".
const HOME_TITLE = 'True Crime Podcasts: Reviews & Ratings | ListenTrueCrime'
const HOME_DESCRIPTION = 'Honest reviews of true crime podcasts: expert verdicts, a Binge Factor score out of 10 and community ratings. Browse by case type, country or what\'s new.'
export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  // Full objects: a page-level openGraph/twitter replaces the layout's, it does not merge.
  openGraph: { type: 'website', locale: 'en_GB', url: BASE, siteName: 'ListenTrueCrime', title: HOME_TITLE, description: HOME_DESCRIPTION, images: [{ url: '/og', width: 1200, height: 630, alt: 'ListenTrueCrime' }] },
  twitter: { card: 'summary_large_image', title: HOME_TITLE, description: HOME_DESCRIPTION, images: ['/og'] },
  alternates: { canonical: BASE },
}

export const revalidate = 3600

// Homepage discovery modules must only ever surface complete records — an
// import mid-way through enrichment (no binge score, no host, no real
// description) reads as broken to a visitor and is exactly the kind of thin
// content Google penalises on a page it crawls this often. is_featured alone
// used to be enough to appear here; it no longer is.
function isCompleteRecord(p: Podcast): boolean {
  const hasVerdict = Boolean(p.binge_factor) || Boolean(p.quick_verdict)
  const hasHost = Boolean(p.host_name?.trim())
  const hasDescription = Boolean(stripHtml(p.short_description ?? p.description).length > 0)
  return hasVerdict && hasHost && hasDescription
}

const TRENDING_COUNT = 5

// Trending shows exactly TRENDING_COUNT featured podcasts. Fully complete
// records come first; if there aren't enough (many featured shows have no
// host_name yet), it tops up from the remaining featured podcasts that still
// have a binge score and a description — never from unfeatured or thin ones.
async function getFeaturedPodcasts() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('podcasts')
    .select(`
      *,
      rating_stats:podcast_rating_stats(*)
    `)
    .eq('is_featured', true)
    .eq('is_published', true)
    .not('binge_factor', 'is', null)
    .order('binge_factor', { ascending: false })
    .limit(50)

  const candidates = (data ?? []).filter(p => stripHtml(p.short_description ?? p.description).length > 0)
  const complete = candidates.filter(isCompleteRecord)
  const topUp = candidates.filter(p => !isCompleteRecord(p))
  return [...complete, ...topUp].slice(0, TRENDING_COUNT)
}

async function getTopRated() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('podcasts')
    .select(`
      *,
      rating_stats:podcast_rating_stats(*)
    `)
    .eq('is_published', true)
    .not('binge_factor', 'is', null)
    .not('host_name', 'is', null)
    .order('binge_factor', { ascending: false })
    .limit(12)

  return (data ?? []).filter(isCompleteRecord).slice(0, 6)
}

async function getNewest() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('podcasts')
    .select(`
      *,
      rating_stats:podcast_rating_stats(*)
    `)
    .eq('is_published', true)
    .not('binge_factor', 'is', null)
    .not('host_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  return (data ?? []).filter(isCompleteRecord).slice(0, 4)
}

async function getRecentReviews() {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('reviews')
    .select(`
      *,
      profile:profiles(username, avatar_url),
      podcast:podcasts(title, slug)
    `)
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(4)

  return data ?? []
}

export default async function HomePage() {
  const [featured, topRated, newest, recentReviews, podcastCount] = await Promise.all([
    getFeaturedPodcasts(),
    getTopRated(),
    getNewest(),
    getRecentReviews(),
    getPodcastCount(),
  ])
  const podcastCountLabel = roundedPodcastCount(podcastCount)

  // Optional guides that don't exist yet (still with the editorial team) —
  // this list picks them up automatically once they're published, with no
  // further code change needed.
  const guideLinks = [
    ...POPULAR_GUIDES,
    { href: '/blog/best-british-true-crime-podcasts', label: 'Best British True Crime Podcasts' },
    { href: '/blog/best-bbc-true-crime-podcasts', label: 'Best BBC True Crime Podcasts' },
    ...(getPostBySlug('true-crime-podcasts-with-no-banter')
      ? [{ href: '/blog/true-crime-podcasts-with-no-banter', label: 'True Crime Podcasts With No Banter' }]
      : []),
    ...(getPostBySlug('best-true-crime-podcasts-on-bbc-sounds')
      ? [{ href: '/blog/best-true-crime-podcasts-on-bbc-sounds', label: 'Best True Crime Podcasts on BBC Sounds' }]
      : []),
    { href: '/how-we-review', label: 'How We Review Podcasts' },
    { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    { href: '/new-true-crime-podcasts', label: 'New True Crime Podcasts' },
  ]

  return (
    <>
      <Header />

      <main id="main-content">
        {/* ═══════════════ HERO ═══════════════ */}
        {/* Full-viewport hero from sm up; on phones it's content-height so the
            first podcasts appear within a short scroll of the headline. */}
        <section className="relative sm:min-h-[80vh] flex flex-col items-center justify-center px-4 pt-24 pb-10 sm:pb-16 overflow-hidden">
          {/* Background layers */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(190,18,60,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_100%,rgba(190,18,60,0.06),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crimson/10 border border-crimson/20 text-crimson text-xs font-medium mb-5 sm:mb-8">
              <Zap size={11} fill="currentColor" aria-hidden="true" />
              {podcastCountLabel} podcasts reviewed and rated
            </div>

            <h1 className="heading-display text-[2.5rem] sm:text-6xl lg:text-7xl mb-4 sm:mb-6 leading-[1.05]">
              Find your next{' '}
              <em className="text-crimson not-italic">true crime</em>{' '}
              podcast
            </h1>

            <p className="text-stone-muted text-base sm:text-xl max-w-2xl mx-auto mb-4 sm:mb-6 leading-relaxed">
              Expert reviews, community ratings and curated picks for {podcastCountLabel} true crime podcasts.
              Discover your next obsession — no algorithms, just honest takes.
            </p>
            <p className="text-stone-muted text-sm max-w-2xl mx-auto mb-6 sm:mb-10">
              New to the genre? Start with our{' '}
              <Link href="/best-true-crime-podcasts" className="text-stone hover:text-white underline decoration-white/20 underline-offset-4">
                best true crime podcasts of {CURRENT_YEAR}, ranked
              </Link>.
            </p>

            {/* Search — a real GET form so typing here searches immediately
                (and works without JavaScript); /browse reads ?q= */}
            <form action="/browse" method="get" role="search" className="relative max-w-xl mx-auto mb-4 sm:mb-8">
              <label htmlFor="hero-search" className="sr-only">Search podcasts</label>
              <Search size={18} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
              <input
                id="hero-search"
                name="q"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder="Search podcasts, case types, hosts…"
                className="input-base h-[52px] pl-11 pr-28 sm:text-[15px]"
              />
              <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-10 px-4 rounded-md bg-ink-700 text-stone text-sm font-medium hover:bg-ink-600 transition-colors">
                Search
              </button>
            </form>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-center gap-3 max-w-xl mx-auto">
              <Link href="/browse" className="btn-primary px-6 py-3 h-12 sm:h-auto text-sm">
                Browse Podcasts
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <NewsletterForm source="hero" variant="minimal" className="w-full sm:w-80 text-left" />
            </div>
            <p className="text-stone-subtle text-xs mt-3">
              <span className="text-crimson font-semibold">Free newsletter</span> — 5 podcast picks emailed every Sunday
            </p>

            {/* Social proof */}
            <div className="flex items-start justify-center gap-4 sm:gap-6 mt-8 sm:mt-12 text-stone-subtle text-sm">
              <div className="flex flex-col items-center text-center">
                <span className="text-stone font-semibold text-xl sm:text-2xl font-serif">{podcastCountLabel}</span>
                <span className="text-xs">Podcasts reviewed</span>
              </div>
              <div className="w-px h-8 bg-white/[0.06] self-center" aria-hidden="true" />
              <div className="flex flex-col items-center text-center">
                <span className="text-stone font-semibold text-xl sm:text-2xl font-serif">6</span>
                <span className="text-xs">Community rating dimensions</span>
              </div>
              <div className="w-px h-8 bg-white/[0.06] self-center" aria-hidden="true" />
              <div className="flex flex-col items-center text-center">
                <span className="text-stone font-semibold text-xl sm:text-2xl font-serif">Free</span>
                <span className="text-xs">Always</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ TRENDING / FEATURED ═══════════════ */}
        {featured.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 mb-5 sm:mb-8">
              <div>
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Featured</p>
                <h2 className="heading-section text-2xl sm:text-3xl">
                  <TrendingUp size={20} aria-hidden="true" className="inline mr-2 text-crimson mb-0.5" />
                  Trending podcasts
                </h2>
              </div>
              <Link href="/browse" className="min-h-[44px] text-sm text-stone-muted hover:text-stone transition-colors flex items-center gap-1">
                View all <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            {/* Phones: a swipeable rail (cards peek in from the right) instead of
                a 2-up grid that strands the fifth card on its own row. */}
            <ul className="flex sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 sm:pb-0 scroll-px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(featured as (Podcast & { rating_stats: RatingStats | null })[]).map((p, i) => (
                <li key={p.id} className="w-[44%] min-[480px]:w-[30%] shrink-0 snap-start sm:w-auto">
                  <PodcastCard podcast={p} priority={i < 3} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ═══════════════ NEWSLETTER CTA ═══════════════
            Sits after Trending: discovery first (what visitors came for),
            then the subscribe ask once they've seen the kind of picks we send. */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.06] p-5 sm:p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
            <div className="relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <p className="text-2xs text-crimson font-semibold uppercase tracking-widest">Newsletter</p>
                  <span className="px-2 py-0.5 rounded-full bg-crimson/10 border border-crimson/20 text-crimson text-2xs font-semibold uppercase tracking-wide">
                    100% free
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-stone-muted text-2xs font-semibold uppercase tracking-wide">
                    Every Sunday
                  </span>
                </div>
                <h2 className="heading-section text-2xl sm:text-3xl mb-3">
                  5 True Crime Podcasts Worth Listening To
                </h2>
                <p className="text-stone-muted text-sm leading-relaxed">
                  Every Sunday, we&apos;ll email you five true crime podcasts we&apos;ve discovered and think are
                  worth your time — from new shows and hidden gems to established favourites.
                  It&apos;s completely free, lands once a week, and you can unsubscribe any time.
                </p>
              </div>
              <NewsletterForm source="homepage_section" showFirstName />
            </div>
          </div>
        </section>

        {/* ═══════════════ SHOP PROMO (only when the shop is enabled) ═══════════════ */}
        {shopEnabled() && <HomepageShopPromo />}

        {/* Cross-promotion (managed in /admin/ads) — renders nothing when no advert is live */}
        <AdSlot placement="homepage_promo" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6" />

        {/* ═══════════════ CATEGORIES ═══════════════ */}
        <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 section-divider">
          <div className="mb-5 sm:mb-8">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Browse by type</p>
            <h2 className="heading-section text-2xl sm:text-3xl">Explore categories</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="card-hover group p-4 sm:p-5 flex flex-col gap-1.5 sm:gap-2"
              >
                <span className="text-2xl" aria-hidden="true">{cat.emoji}</span>
                <h3 className="text-stone text-sm font-semibold group-hover:text-white transition-colors">
                  {cat.label}
                </h3>
                <p className="text-stone-subtle text-xs leading-relaxed line-clamp-2">
                  {cat.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* ═══════════════ GUIDES & RECOMMENDATIONS ═══════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 section-divider">
          <div className="mb-5 sm:mb-8">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Guides</p>
            <h2 className="heading-section text-2xl sm:text-3xl">
              <BookOpen size={20} aria-hidden="true" className="inline mr-2 text-crimson mb-0.5" />
              Guides &amp; recommendations
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {guideLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="card-hover p-4 min-h-[56px] flex items-center text-stone-muted text-sm font-medium hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <AdSlot placement="homepage_between" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12" />

        {/* ═══════════════ TOP COMMUNITY RATED ═══════════════ */}
        {topRated.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 section-divider">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 mb-5 sm:mb-8">
              <div>
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Community</p>
                <h2 className="heading-section text-2xl sm:text-3xl">
                  <Star size={18} aria-hidden="true" className="inline mr-2 text-gold-light mb-0.5" fill="currentColor" />
                  Highest binge factor
                </h2>
              </div>
              <Link href="/best-true-crime-podcasts" className="min-h-[44px] text-sm text-stone-muted hover:text-stone transition-colors flex items-center gap-1">
                Best true crime podcasts, ranked <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {(topRated as (Podcast & { rating_stats: RatingStats | null })[]).map(p => (
                <PodcastCard key={p.id} podcast={p} />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════ NEWEST ADDITIONS ═══════════════ */}
        {newest.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 section-divider">
            <div className="mb-5 sm:mb-8">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Fresh</p>
              <h2 className="heading-section text-2xl sm:text-3xl">Newest additions</h2>
            </div>
            <div className="-mt-4 sm:-mt-6 mb-5 sm:mb-8">
              <Link href="/new-true-crime-podcasts" className="min-h-[44px] text-sm text-stone-muted hover:text-stone transition-colors inline-flex items-center gap-1">
                All new true crime podcasts <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(newest as (Podcast & { rating_stats: RatingStats | null })[]).map(p => (
                <PodcastCard key={p.id} podcast={p} />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════ RECENT REVIEWS ═══════════════ */}
        {recentReviews.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 section-divider">
            <div className="mb-5 sm:mb-8">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Community</p>
              <h2 className="heading-section text-2xl sm:text-3xl">Recent reviews</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentReviews.map((review: any) => (
                <div key={review.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-crimson/20 border border-crimson/20 flex items-center justify-center text-crimson text-xs font-semibold shrink-0">
                      {(review.profile?.username?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1 min-w-0">
                        <span className="text-stone text-xs font-medium">{review.profile?.username ?? 'Anonymous'}</span>
                        <span className="text-stone-subtle text-xs">on</span>
                        <Link href={`/podcasts/${review.podcast?.slug}`} className="inline-block py-2 -my-2 text-xs text-stone hover:text-crimson transition-colors truncate font-medium">
                          {review.podcast?.title}
                        </Link>
                      </div>
                      <p className="text-stone-muted text-sm leading-relaxed">{review.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  )
}
