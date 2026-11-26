'use client'
import { useEffect, useRef, useState } from 'react'
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

  const filterCount = [selectedTypes.length > 0, country, formatType, platform, minBinge > 0].filter(Boolean).length
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

  const panelRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  // Below md the filter panel is a bottom sheet over the results: lock the
  // page behind it, close on Escape, and move focus into it. From md up it's
  // an inline panel and none of that applies.
  useEffect(() => {
    if (!filtersOpen) return
    const isSheet = !window.matchMedia('(min-width: 768px)').matches
    const root = document.documentElement
    const prev = root.style.overflow
    if (isSheet) {
      root.style.overflow = 'hidden'
      panelRef.current?.focus()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFiltersOpen(false); toggleRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [filtersOpen])

  const closeSheet = () => { setFiltersOpen(false); toggleRef.current?.focus() }

  const selectWrap = (id: string, label: string, value: string, onChange: (v: string) => void, options: [string, string][], allLabel: string) => (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-stone mb-2 md:mb-3 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select id={id} value={value} onChange={e => onChange(e.target.value)} className="input-base pr-9 appearance-none cursor-pointer">
          <option value="">{allLabel}</option>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <ChevronDown size={14} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
      </div>
    </div>
  )

  // Every active filter gets a removable chip, so what's applied is always
  // visible above the results without reopening the panel.
  const activeChips: { key: string; label: string; remove: () => void }[] = [
    ...(searchParams.get('q') ? [{ key: 'q', label: `“${searchParams.get('q')}”`, remove: () => { setQueryInput(''); pushParams({ q: null }) } }] : []),
    ...selectedTypes.map(t => ({ key: `t-${t}`, label: t, remove: () => toggleType(t) })),
    ...(country ? [{ key: 'country', label: COUNTRIES[country] ?? country, remove: () => pushParams({ country: null }) }] : []),
    ...(formatType ? [{ key: 'format', label: formatType, remove: () => pushParams({ format: null }) }] : []),
    ...(platform ? [{ key: 'platform', label: platform, remove: () => pushParams({ platform: null }) }] : []),
    ...(minBinge > 0 ? [{ key: 'binge', label: `Binge ${minBinge}+`, remove: () => pushParams({ minBinge: null }) }] : []),
  ]

  return (
    <>
      {/* Search + controls: search gets its own full-width row on phones,
          with Filters and Sort sharing the row beneath it. */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
        <form role="search" onSubmit={e => { e.preventDefault(); pushParams({ q: queryInput.trim() || null }) }} className="relative flex-1 min-w-0">
          <Search size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
          <label htmlFor="browse-search" className="sr-only">Search podcasts</label>
          <input
            id="browse-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            placeholder="Search by title, case type, host…"
            className="input-base pl-10 h-12 sm:h-auto"
          />
        </form>

        <div className="flex gap-2 sm:gap-3">
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            aria-controls="browse-filters"
            className={cn('btn-outline flex-1 sm:flex-none shrink-0', filtersOpen && 'border-crimson/40 text-stone')}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            Filters
            {filterCount > 0 && (
              <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-crimson text-white text-2xs flex items-center justify-center" aria-label={`${filterCount} active`}>
                {filterCount}
              </span>
            )}
          </button>

          <div className="relative flex-1 sm:flex-none min-w-0">
            <label htmlFor="browse-sort" className="sr-only">Sort by</label>
            <select
              id="browse-sort"
              value={sort}
              onChange={e => pushParams({ sort: e.target.value === 'newest' ? null : e.target.value })}
              className="input-base pr-9 appearance-none cursor-pointer truncate"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter panel — bottom sheet on phones, inline card from md up.
          Filters apply as they're picked; "Show results" just closes the sheet. */}
      {filtersOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-[60] bg-black/60 animate-fade-in" onClick={closeSheet} aria-hidden="true" />
          <div
            id="browse-filters"
            ref={panelRef}
            tabIndex={-1}
            role="region"
            aria-label="Filters"
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[85dvh] flex flex-col rounded-t-2xl bg-ink-800 border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] animate-slide-up outline-none
                       md:static md:z-auto md:max-h-none md:block md:rounded-lg md:border md:border-white/[0.06] md:shadow-card md:mb-6 md:animate-fade-in"
          >
            {/* Sheet header (phones only) */}
            <div className="md:hidden flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/[0.06]">
              <p className="font-serif text-lg text-stone">Filters</p>
              <button type="button" onClick={closeSheet} aria-label="Close filters" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-md text-stone-muted hover:text-stone hover:bg-ink-700">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <fieldset>
                  <legend className="text-xs font-semibold text-stone mb-2 md:mb-3 uppercase tracking-wide">Case type</legend>
                  <div className="flex flex-wrap gap-2 md:gap-1.5">
                    {CASE_TYPES.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(t)}
                        aria-pressed={selectedTypes.includes(t)}
                        className={cn('chip', selectedTypes.includes(t) && 'chip-active')}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {selectWrap('filter-country', 'Country', country, v => pushParams({ country: v || null }), Object.entries(COUNTRIES), 'All countries')}
                {selectWrap('filter-format', 'Format', formatType, v => pushParams({ format: v || null }), ['Serialized', 'Episodic', 'Both'].map(f => [f, f]), 'All formats')}
                {selectWrap('filter-platform', 'Platform', platform, v => pushParams({ platform: v || null }), PLATFORMS.map(p => [p, p]), 'All platforms')}
              </div>

              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <label htmlFor="filter-binge" className="block text-xs font-semibold text-stone mb-2 uppercase tracking-wide">
                  Min. Binge Factor: <span className="text-crimson">{minBinge > 0 ? `${minBinge}+` : 'Any'}</span>
                </label>
                <input
                  id="filter-binge"
                  type="range"
                  min={0} max={9} step={1}
                  value={minBinge}
                  onChange={e => pushParams({ minBinge: Number(e.target.value) > 0 ? e.target.value : null })}
                  className="w-full md:max-w-xs h-11 accent-crimson cursor-pointer"
                />
              </div>

              {hasFilters && (
                <button type="button" onClick={clearFilters} className="hidden md:inline-flex mt-3 min-h-[32px] items-center gap-1.5 text-xs text-stone-muted hover:text-stone transition-colors">
                  <X size={12} aria-hidden="true" /> Clear all filters
                </button>
              )}
            </div>

            {/* Sheet footer (phones only) */}
            <div className="md:hidden flex gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/[0.06]">
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="btn-outline flex-1">Clear all</button>
              )}
              <button type="button" onClick={closeSheet} className="btn-primary flex-[2]">Show results</button>
            </div>
          </div>
        </>
      )}

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {activeChips.map(c => (
            <button key={c.key} type="button" onClick={c.remove} aria-label={`Remove filter: ${c.label}`} className="chip chip-active max-w-full">
              <span className="truncate">{c.label}</span> <X size={12} aria-hidden="true" className="shrink-0" />
            </button>
          ))}
          <button type="button" onClick={clearFilters} className="min-h-[44px] md:min-h-[32px] px-2 text-xs text-stone-muted underline underline-offset-4 hover:text-stone">
            Clear all
          </button>
        </div>
      )}
    </>
  )
}
