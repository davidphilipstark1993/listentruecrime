import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard } from '@/components/podcasts/podcast-card'
import { BrowseControls } from '@/components/browse/browse-controls'
import { Pagination } from '@/components/ui/pagination'
import { BASE } from '@/lib/seo/config'
import type { Podcast, RatingStats } from '@/lib/types/database'

const PAGE_SIZE = 48

interface Props {
  searchParams: Promise<{
    q?: string
    types?: string
    country?: string
    format?: string
    platform?: string
    minBinge?: string
    sort?: string
    page?: string
  }>
}

type PodcastWithStats = Podcast & { rating_stats: RatingStats | null }

// Any filter/search/sort narrows or reorders the same underlying set —
// indexing every combination would be thin/duplicate content, so only the
// plain paginated catalogue (no params beyond `page`) is indexable. Filtered
// views stay `follow` so link equity still flows through them.
function hasNonPageParams(sp: Awaited<Props['searchParams']>): boolean {
  return Boolean(sp.q || sp.types || sp.country || sp.format || sp.platform || sp.minBinge || sp.sort)
}

// Self-referencing canonical, page-aware — a paginated page canonicalised
// to page 1 tells Google "this is a duplicate, don't index it separately",
// which would undo the whole point of paginating (every page needs its own
// indexable URL, since each one links a different 48 podcasts).
function canonicalUrl(sp: Awaited<Props['searchParams']>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    if (value) params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `${BASE}/browse?${qs}` : `${BASE}/browse`
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const filtered = hasNonPageParams(sp)

  const pageNum = Math.max(1, Number(sp.page ?? 1) || 1)
  const title = `Browse True Crime Podcasts${pageNum > 1 ? ` — Page ${pageNum}` : ''}`
  const description = 'Search and filter our complete database of reviewed true crime podcasts. Filter by case type, country, platform, binge factor, format, and more.'

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(sp) },
    robots: filtered ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: `${title} | ListenTrueCrime`,
      description,
      url: canonicalUrl(sp),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ListenTrueCrime`,
      description,
    },
  }
}

// Two near-identical builders rather than one parameterised function: the
// Supabase client infers each query's row type from a literal .select()
// string, so making that string dynamic (e.g. a ternary) breaks type
// inference entirely. Keeping both calls literal is worth the duplication.
function parseFilterParams(sp: Awaited<Props['searchParams']>) {
  const types = (sp.types ?? '').split(',').filter(Boolean)
  const minBinge = Number(sp.minBinge ?? 0)
  return { types, minBinge, sort: sp.sort ?? 'newest' }
}

function buildCountQuery(sp: Awaited<Props['searchParams']>) {
  const { types, minBinge } = parseFilterParams(sp)
  let q = createAdminClient()
    .from('podcasts')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true)

  if (sp.q?.trim()) q = q.textSearch('search_vector', sp.q.trim().split(' ').join(' & '))
  if (types.length > 0) q = q.overlaps('case_types', types)
  if (sp.country) q = q.eq('country', sp.country)
  if (sp.format) q = q.eq('format_type', sp.format)
  if (sp.platform) q = q.contains('platforms', [sp.platform])
  if (minBinge > 0) q = q.gte('binge_factor', minBinge)
  return q
}

function buildDataQuery(sp: Awaited<Props['searchParams']>) {
  const { types, minBinge, sort } = parseFilterParams(sp)
  let q = createAdminClient()
    .from('podcasts')
    .select(`*, rating_stats:podcast_rating_stats(*)`)
    .eq('is_published', true)

  if (sp.q?.trim()) q = q.textSearch('search_vector', sp.q.trim().split(' ').join(' & '))
  if (types.length > 0) q = q.overlaps('case_types', types)
  if (sp.country) q = q.eq('country', sp.country)
  if (sp.format) q = q.eq('format_type', sp.format)
  if (sp.platform) q = q.contains('platforms', [sp.platform])
  if (minBinge > 0) q = q.gte('binge_factor', minBinge)

  // Bulk-imported podcasts share identical created_at timestamps in large
  // batches, so `created_at desc` alone is not a stable sort — PostgREST can
  // return tied rows in a different order on each request, which silently
  // duplicates some podcasts across pages and skips others entirely. Every
  // sort mode gets `id` as a deterministic tiebreaker so .range() pagination
  // is actually stable.
  if (sort === 'title_asc') return q.order('title', { ascending: true }).order('id', { ascending: true })
  if (sort === 'binge_desc') return q.order('binge_factor', { ascending: false }).order('id', { ascending: true })
  return q.order('created_at', { ascending: false }).order('id', { ascending: true })
}

async function fetchPodcasts(sp: Awaited<Props['searchParams']>) {
  const requestedPage = Math.max(1, Number(sp.page ?? 1) || 1)

  // Count first, with no .range() — an out-of-bounds range 416s and loses
  // the real count, which would otherwise silently defeat the 404 check.
  const { count } = await buildCountQuery(sp)
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (requestedPage > totalPages) {
    return { podcasts: [] as PodcastWithStats[], total, page: requestedPage, totalPages, outOfRange: true }
  }

  const from = (requestedPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data } = await buildDataQuery(sp).range(from, to)

  return {
    podcasts: (data ?? []) as PodcastWithStats[],
    total,
    page: requestedPage,
    totalPages,
    outOfRange: false,
  }
}

export default async function BrowsePage({ searchParams }: Props) {
  const sp = await searchParams
  const { podcasts, total, page, totalPages, outOfRange } = await fetchPodcasts(sp)

  // An out-of-range page is a dead/duplicate URL, not a valid result — 404
  // rather than silently clamping, so it can't get indexed as a thin page.
  if (outOfRange) notFound()

  const preservedParams = {
    q: sp.q, types: sp.types, country: sp.country,
    format: sp.format, platform: sp.platform, minBinge: sp.minBinge, sort: sp.sort,
  }

  return (
    <>
      <Header />
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 min-h-screen">
        <div className="mb-8">
          <h1 className="heading-display text-3xl sm:text-4xl mb-2">Browse podcasts</h1>
          <p className="text-stone-muted text-sm">{total} podcasts in the database</p>
        </div>

        <BrowseControls />

        {podcasts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {podcasts.map((p, i) => (
              <PodcastCard key={p.id} podcast={p} priority={page === 1 && i < 6} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-stone-muted text-lg mb-2">No podcasts found</p>
            <p className="text-stone-subtle text-sm">Try adjusting your search or filters</p>
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} basePath="/browse" searchParams={preservedParams} />
      </main>
      <Footer />
    </>
  )
}
