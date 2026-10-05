'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Search } from 'lucide-react'
import { COUNTRIES } from '@/lib/types/database'

export interface RateItem {
  id: string
  slug: string
  title: string
  host_name: string | null
  country: string | null
}

function normalise(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function letterOf(title: string) {
  const c = normalise(title.replace(/^(the|a|an)\s+/i, '')).charAt(0).toUpperCase()
  return /[A-Z]/.test(c) ? c : '#'
}

export function RateCatalogue({ items }: { items: RateItem[] }) {
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')
  const [rated, setRated] = useState<Set<string>>(new Set())

  // Shows this browser has already rated (the widget stores a copy locally).
  useEffect(() => {
    try {
      setRated(new Set(items.filter(i => localStorage.getItem(`ltc_rating_${i.id}`)).map(i => i.id)))
    } catch {}
  }, [items])

  const countries = useMemo(
    () => Array.from(new Set(items.map(i => i.country).filter((c): c is string => !!c))).sort(),
    [items],
  )

  const filtered = useMemo(() => {
    const q = normalise(query.trim())
    return items
      .filter(i => !country || i.country === country)
      .filter(i => !q || normalise(`${i.title} ${i.host_name ?? ''}`).includes(q))
      .map(i => ({ ...i, letter: letterOf(i.title) }))
      .sort((a, b) => a.letter.localeCompare(b.letter) || normalise(a.title).localeCompare(normalise(b.title)))
  }, [items, query, country])

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const i of filtered) map.set(i.letter, [...(map.get(i.letter) ?? []), i])
    return Array.from(map.entries())
  }, [filtered])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by show or host…"
            aria-label="Search podcasts"
            className="input-base pl-10"
          />
        </div>
        <select
          value={country}
          onChange={e => setCountry(e.target.value)}
          aria-label="Filter by country"
          className="input-base sm:w-52 cursor-pointer"
        >
          <option value="">All countries</option>
          {countries.map(c => <option key={c} value={c}>{COUNTRIES[c] ?? c}</option>)}
        </select>
      </div>
      <p className="text-stone-subtle text-xs mb-6" aria-live="polite">
        {filtered.length} of {items.length} shows{rated.size > 0 && ` · you've rated ${rated.size}`}
      </p>

      {groups.length === 0 && (
        <p className="text-stone-muted py-12 text-center">No shows match that search.</p>
      )}

      {groups.map(([letter, list]) => (
        <section key={letter} className="mb-6">
          <h2 className="font-serif text-lg text-stone-subtle border-b border-ink-600 pb-1 mb-1">{letter}</h2>
          <ul>
            {list.map(i => (
              <li key={i.id} className="flex items-center justify-between gap-4 py-2.5 border-b border-ink-700/60">
                <div className="min-w-0">
                  <p className="text-stone truncate">{i.title}</p>
                  {i.host_name && <p className="text-stone-subtle text-xs truncate">{i.host_name}</p>}
                </div>
                <Link
                  href={`/podcasts/${i.slug}#rate`}
                  className="shrink-0 text-sm font-semibold text-crimson hover:underline"
                >
                  {rated.has(i.id) ? (
                    <span className="inline-flex items-center gap-1 text-stone-subtle font-normal">
                      <Check size={14} /> Rated
                    </span>
                  ) : 'Rate →'}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
