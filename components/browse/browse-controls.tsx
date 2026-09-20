'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { CATEGORIES, PLATFORMS, COUNTRIES } from '@/lib/types/database'
import { cn } from '@/lib/utils'

type SortOption = 'newest' | 'title_asc' | 'binge_desc'

const CASE_TYPES = [
  'Cold Case', 'Missing Person', 'Murder', 'Serial Killer', 'Courtroom',
  'Wrongful Conviction', 'Fraud', 'White-Collar Crime', 'Investigative',
  'Systemic Injustice', 'Historical Crime', 'Organised Crime',
]

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'title_asc', label: 'A–Z' },
  { value: 'binge_desc', label: 'Highest Binge Factor' },
]

/**
 * Filter/search/sort UI for /browse. Everything here writes to the URL
 * (via router.push) instead of local state, so the server component that
 * owns the actual data fetch (app/browse/page.tsx) re-renders with real
 * results and real pagination links for every combination — no client-only
 * fetch, no dead end for a non-JS crawler.
 */
export function BrowseControls() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [queryInput, setQueryInput] = useState(searchParams.get('q') ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const selectedTypes = (searchParams.get('types') ?? '').split(',').filter(Boolean)
  const country = searchParams.get('country') ?? ''
  const formatType = searchParams.get('format') ?? ''
  const platform = searchParams.get('platform') ?? ''
  const minBinge = Number(searchParams.get('minBinge') ?? 0)
  const sort = (searchParams.get('sort') as SortOption) ?? 'newest'

  const hasFilters = Boolean(
    searchParams.get('q') || selectedTypes.length || country || formatType || platform || minBinge
  )

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    params.delete('page') // any filter/sort/search change resets pagination
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  // Debounce the free-text search before it hits the URL/server.
  useEffect(() => {
    const current = searchParams.get('q') ?? ''
    if (queryInput === current) return
    const timer = setTimeout(() => pushParams({ q: queryInput || null }), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput])

  const toggleType = (t: string) => {
    const next = selectedTypes.includes(t) ? selectedTypes.filter(x => x !== t) : [...selectedTypes, t]
    pushParams({ types: next.length ? next.join(',') : null })
  }

  const clearFilters = () => {
    setQueryInput('')
    router.push(pathname)
  }

  return (
    <>
      {/* Search + controls */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
          <label htmlFor="browse-search" className="sr-only">Search podcasts</label>
          <input
            id="browse-search"
            type="search"
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
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

        <div className="relative shrink-0">
          <label htmlFor="browse-sort" className="sr-only">Sort by</label>
          <select
            id="browse-sort"
            value={sort}
            onChange={e => pushParams({ sort: e.target.value === 'newest' ? null : e.target.value })}
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

            <div>
              <p id="filter-country-label" className="text-xs font-semibold text-stone mb-3 uppercase tracking-wide">Country</p>
              <div className="relative">
                <select aria-labelledby="filter-country-label" value={country} onChange={e => pushParams({ country: e.target.value || null })} className="input-base pr-8 appearance-none">
                  <option value="">All countries</option>
                  {Object.entries(COUNTRIES).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
              </div>
            </div>

            <div>
              <p id="filter-format-label" className="text-xs font-semibold text-stone mb-3 uppercase tracking-wide">Format</p>
              <div className="relative">
                <select aria-labelledby="filter-format-label" value={formatType} onChange={e => pushParams({ format: e.target.value || null })} className="input-base pr-8 appearance-none">
                  <option value="">All formats</option>
                  {['Serialized', 'Episodic', 'Both'].map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
              </div>
            </div>

            <div>
              <p id="filter-platform-label" className="text-xs font-semibold text-stone mb-3 uppercase tracking-wide">Platform</p>
              <div className="relative">
                <select aria-labelledby="filter-platform-label" value={platform} onChange={e => pushParams({ platform: e.target.value || null })} className="input-base pr-8 appearance-none">
                  <option value="">All platforms</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <p id="filter-binge-label" className="text-xs font-semibold text-stone mb-2 uppercase tracking-wide">
              Min. Binge Factor: <span className="text-crimson">{minBinge > 0 ? `${minBinge}+` : 'Any'}</span>
            </p>
            <input
              type="range"
              aria-labelledby="filter-binge-label"
              min={0} max={9} step={1}
              value={minBinge}
              onChange={e => pushParams({ minBinge: Number(e.target.value) > 0 ? e.target.value : null })}
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
          {country && (
            <button onClick={() => pushParams({ country: null })} className="flex items-center gap-1 tag-crimson cursor-pointer">
              {COUNTRIES[country]} <X size={10} />
            </button>
          )}
        </div>
      )}
    </>
  )
}
