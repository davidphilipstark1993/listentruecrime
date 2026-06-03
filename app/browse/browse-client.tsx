'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { PodcastCard, PodcastCardSkeleton } from '@/components/podcasts/podcast-card'
import { CATEGORIES, PLATFORMS, COUNTRIES } from '@/lib/types/database'
import type { Podcast, RatingStats } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import { useSearchParams, useRouter } from 'next/navigation'

type SortOption = 'newest' | 'title_asc' | 'binge_desc'

const CASE_TYPES = [
  'Murder', 'Cold Case', 'Missing Person', 'Serial Killer', 'Fraud',
  'Systemic Injustice', 'Courtroom', 'Domestic Abuse', 'Wrongful Conviction',
  'Historical Crime', 'White-Collar Crime', 'Psychological Crime', 'Sexual Abuse',
  'Forensic Science', 'Cult', 'Organised Crime', 'Medical Crime',
  'Political Crime', 'Conspiracy', 'Environmental Crime',
  'Terrorism', 'Espionage', 'Online Harassment', 'Sports Crime',
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'title_asc', label: 'A–Z' },
  { value: 'binge_desc', label: 'Highest Binge Factor' },
]

type PodcastWithStats = Podcast & { rating_stats: RatingStats | null }

export function BrowseClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [podcasts, setPodcasts] = useState<PodcastWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Filters
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [country, setCountry] = useState('')
  const [formatType, setFormatType] = useState('')
  const [platform, setPlatform] = useState('')
  const [minBinge, setMinBinge] = useState(0)
  const [sort, setSort] = useState<SortOption>('newest')

  const supabase = createClient()

  const fetchPodcasts = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('podcasts')
      .select(`*, rating_stats:podcast_rating_stats(*)`, { count: 'exact' })
      .eq('is_published', true)

    if (query.trim()) {
      q = q.textSearch('search_vector', query.trim().split(' ').join(' & '))
    }
    if (selectedTypes.length > 0) {
      q = q.overlaps('case_types', selectedTypes)
    }
    if (country) q = q.eq('country', country)
    if (formatType) q = q.eq('format_type', formatType)
    if (platform) q = q.contains('platforms', [platform])
    if (minBinge > 0) q = q.gte('binge_factor', minBinge)

    if (sort === 'newest') q = q.order('created_at', { ascending: false })
    else if (sort === 'title_asc') q = q.order('title', { ascending: true })
    else if (sort === 'binge_desc') q = q.order('binge_factor', { ascending: false })

    const { data, count } = await q.limit(48)
    setPodcasts((data ?? []) as PodcastWithStats[])
    setTotal(count ?? 0)
    setLoading(false)
  }, [query, selectedTypes, country, formatType, platform, minBinge, sort])

  useEffect(() => {
    const timer = setTimeout(fetchPodcasts, 300)
    return () => clearTimeout(timer)
  }, [fetchPodcasts])

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const clearFilters = () => {
    setQuery(''); setSelectedTypes([]); setCountry(''); setFormatType('')
    setPlatform(''); setMinBinge(0); setSort('newest')
  }

  const hasFilters = query || selectedTypes.length || country || formatType || platform || minBinge

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 min-h-screen">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="heading-display text-3xl sm:text-4xl mb-2">Browse podcasts</h1>
          <p className="text-stone-muted text-sm">{total} podcasts in the database</p>
        </div>

        {/* Search + controls */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by title, case type, host…"
              className="input-base pl-10"
            />
          </div>

          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn('btn-outline flex items-center gap-2 shrink-0', filtersOpen && 'border-crimson/40 text-stone')}
          >
            <SlidersHorizontal size={15} />
            Filters
            {hasFilters && (
              <span className="w-4 h-4 rounded-full bg-crimson text-white text-2xs flex items-center justify-center">
                {[selectedTypes.length > 0, country, formatType, platform, minBinge > 0].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Sort */}
          <div className="relative shrink-0">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortOption)}
              className="input-base pr-8 appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
          </div>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="card p-5 mb-6 animate-fade-in">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Case types */}
              <div>
                <p className="text-xs font-semibold text-stone mb-3 uppercase tracking-wide">Case type</p>
                <div className="flex flex-wrap gap-1.5">
                  {CASE_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={cn('tag cursor-pointer transition-colors', selectedTypes.includes(t) && 'tag-crimson')}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div>
                <p className="text-xs font-semibold text-stone mb-3 uppercase tracking-wide">Country</p>
                <div className="relative">
                  <select value={country} onChange={e => setCountry(e.target.value)} className="input-base pr-8 appearance-none">
                    <option value="">All countries</option>
                    {Object.entries(COUNTRIES).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
                </div>
              </div>

              {/* Format */}
              <div>
                <p className="text-xs font-semibold text-stone mb-3 uppercase tracking-wide">Format</p>
                <div className="relative">
                  <select value={formatType} onChange={e => setFormatType(e.target.value)} className="input-base pr-8 appearance-none">
                    <option value="">All formats</option>
                    {['Serialized', 'Episodic', 'Both'].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
                </div>
              </div>

              {/* Platform */}
              <div>
                <p className="text-xs font-semibold text-stone mb-3 uppercase tracking-wide">Platform</p>
                <div className="relative">
                  <select value={platform} onChange={e => setPlatform(e.target.value)} className="input-base pr-8 appearance-none">
                    <option value="">All platforms</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Binge factor */}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="text-xs font-semibold text-stone mb-2 uppercase tracking-wide">
                Min. Binge Factor: <span className="text-crimson">{minBinge > 0 ? `${minBinge}+` : 'Any'}</span>
              </p>
              <input
                type="range"
                min={0} max={9} step={1}
                value={minBinge}
                onChange={e => setMinBinge(Number(e.target.value))}
                className="w-full max-w-xs accent-crimson cursor-pointer"
              />
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 flex items-center gap-1.5 text-xs text-stone-muted hover:text-stone transition-colors">
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mb-5">
            {selectedTypes.map(t => (
              <button key={t} onClick={() => toggleType(t)} className="flex items-center gap-1 tag-crimson cursor-pointer hover:bg-crimson/20">
                {t} <X size={10} />
              </button>
            ))}
            {country && <button onClick={() => setCountry('')} className="flex items-center gap-1 tag-crimson cursor-pointer">
              {COUNTRIES[country]} <X size={10} />
            </button>}
          </div>
        )}

        {/* Results grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => <PodcastCardSkeleton key={i} />)}
          </div>
        ) : podcasts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {podcasts.map((p, i) => <PodcastCard key={p.id} podcast={p} priority={i < 6} />)}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-stone-muted text-lg mb-2">No podcasts found</p>
            <p className="text-stone-subtle text-sm mb-4">Try adjusting your search or filters</p>
            <button onClick={clearFilters} className="btn-ghost">Clear filters</button>
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
