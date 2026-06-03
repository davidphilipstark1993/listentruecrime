import Link from 'next/link'
import { Search, ArrowRight, TrendingUp, Star, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CATEGORIES } from '@/lib/types/database'
import type { Podcast, RatingStats } from '@/lib/types/database'

async function getFeaturedPodcasts() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('podcasts')
    .select(`
      *,
      rating_stats:podcast_rating_stats(*)
    `)
    .eq('is_featured', true)
    .eq('is_published', true)
    .limit(6)

  return data ?? []
}

async function getTopRated() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('podcasts')
    .select(`
      *,
      rating_stats:podcast_rating_stats(*)
    `)
    .eq('is_published', true)
    .order('binge_factor', { ascending: false })
    .limit(6)

  return data ?? []
}

async function getNewest() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('podcasts')
    .select(`
      *,
      rating_stats:podcast_rating_stats(*)
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(4)

  return data ?? []
}

async function getRecentReviews() {
  const supabase = await createClient()
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
  const [featured, topRated, newest, recentReviews] = await Promise.all([
    getFeaturedPodcasts(),
    getTopRated(),
    getNewest(),
    getRecentReviews(),
  ])

  return (
    <>
      <Header />

      <main>
        {/* ═══════════════ HERO ═══════════════ */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden">
          {/* Background layers */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(190,18,60,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_100%,rgba(190,18,60,0.06),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:64px_64px]" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crimson/10 border border-crimson/20 text-crimson text-xs font-medium mb-8">
              <Zap size={11} fill="currentColor" />
              100+ podcasts reviewed and rated
            </div>

            <h1 className="heading-display text-5xl sm:text-6xl lg:text-7xl mb-6 leading-[1.05]">
              Find your next{' '}
              <em className="text-crimson not-italic">true crime</em>{' '}
              podcast
            </h1>

            <p className="text-stone-muted text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Expert reviews, community ratings, and curated recommendations.
              Discover your next obsession — no algorithms, just honest takes.
            </p>

            {/* Search bar */}
            <div className="relative max-w-xl mx-auto mb-8">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
              <Link href="/browse">
                <div className="input-base pl-11 pr-4 py-3.5 cursor-text text-stone-subtle hover:border-white/20 transition-colors text-[15px]">
                  Search podcasts, case types, hosts…
                </div>
              </Link>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/browse" className="btn-primary px-6 py-3 text-sm">
                Browse Podcasts
                <ArrowRight size={15} />
              </Link>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <NewsletterForm source="hero" variant="minimal" className="w-64" />
              </div>
            </div>

            {/* Social proof */}
            <div className="flex items-center justify-center gap-6 mt-12 text-stone-subtle text-sm">
              <div className="flex flex-col items-center">
                <span className="text-stone font-semibold text-2xl font-serif">100+</span>
                <span className="text-xs">Podcasts reviewed</span>
              </div>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div className="flex flex-col items-center">
                <span className="text-stone font-semibold text-2xl font-serif">10</span>
                <span className="text-xs">Rating dimensions</span>
              </div>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div className="flex flex-col items-center">
                <span className="text-stone font-semibold text-2xl font-serif">Free</span>
                <span className="text-xs">Always</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ TRENDING / FEATURED ═══════════════ */}
        {featured.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Featured</p>
                <h2 className="heading-section text-2xl sm:text-3xl">
                  <TrendingUp size={20} className="inline mr-2 text-crimson mb-0.5" />
                  Trending podcasts
                </h2>
              </div>
              <Link href="/browse" className="text-sm text-stone-muted hover:text-stone transition-colors flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {(featured as (Podcast & { rating_stats: RatingStats | null })[]).map((p, i) => (
                <PodcastCard key={p.id} podcast={p} priority={i < 3} />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════ CATEGORIES ═══════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 section-divider">
          <div className="mb-8">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Browse by type</p>
            <h2 className="heading-section text-2xl sm:text-3xl">Explore categories</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="card-hover group p-5 flex flex-col gap-2"
              >
                <span className="text-2xl">{cat.emoji}</span>
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

        {/* ═══════════════ TOP COMMUNITY RATED ═══════════════ */}
        {topRated.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 section-divider">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Community</p>
                <h2 className="heading-section text-2xl sm:text-3xl">
                  <Star size={18} className="inline mr-2 text-gold-light mb-0.5" fill="currentColor" />
                  Highest binge factor
                </h2>
              </div>
              <Link href="/browse?sort=highest_rated" className="text-sm text-stone-muted hover:text-stone transition-colors flex items-center gap-1">
                Full rankings <ArrowRight size={14} />
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
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 section-divider">
            <div className="mb-8">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Fresh</p>
              <h2 className="heading-section text-2xl sm:text-3xl">Newest additions</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(newest as (Podcast & { rating_stats: RatingStats | null })[]).map(p => (
                <PodcastCard key={p.id} podcast={p} />
              ))}
            </div>
          </section>
        )}

        {/* ═══════════════ NEWSLETTER CTA ═══════════════ */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 section-divider">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.06] p-8 sm:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
            <div className="relative z-10 max-w-lg">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-3">Coming Soon</p>
              <h2 className="heading-section text-2xl sm:text-3xl mb-3">
                Join the waiting list
              </h2>
              <p className="text-stone-muted text-sm mb-6 leading-relaxed">
                We're putting together a weekly true crime briefing — new podcast reviews, community picks, and hidden gems.
                Leave your email and you'll be first to know when it launches.
              </p>
              <NewsletterForm source="homepage_section" />
            </div>
          </div>
        </section>

        {/* ═══════════════ RECENT REVIEWS ═══════════════ */}
        {recentReviews.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 section-divider">
            <div className="mb-8">
              <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-1">Community</p>
              <h2 className="heading-section text-2xl sm:text-3xl">Recent reviews</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {recentReviews.map((review: any) => (
                <div key={review.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-crimson/20 border border-crimson/20 flex items-center justify-center text-crimson text-xs font-semibold shrink-0">
                      {(review.profile?.username?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-stone text-xs font-medium">{review.profile?.username ?? 'Anonymous'}</span>
                        <span className="text-stone-subtle text-xs">on</span>
                        <Link href={`/podcasts/${review.podcast?.slug}`} className="text-xs text-stone hover:text-crimson transition-colors truncate font-medium">
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
