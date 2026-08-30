'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Search, Pencil, Eye, EyeOff, Star, ImageOff } from 'lucide-react'

interface Podcast {
  id: string
  title: string
  slug: string
  is_published: boolean
  is_featured: boolean
  binge_factor: number | null
  country: string | null
  quick_verdict: string | null
  image_url: string | null
  created_at: string
}

export function PodcastsTable({ podcasts }: { podcasts: Podcast[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? podcasts.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.slug.includes(query.toLowerCase()) ||
        p.country?.toLowerCase().includes(query.toLowerCase())
      )
    : podcasts

  return (
    <>
      <div className="relative mb-4 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search title, slug, country…"
          className="input-base pl-9 text-sm py-2"
        />
      </div>

      {query && (
        <p className="text-xs text-stone-subtle mb-3">{filtered.length} of {podcasts.length} podcasts</p>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Title</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden sm:table-cell">Country</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden md:table-cell">Binge</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden lg:table-cell">Verdict</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {!p.image_url && (
                      <span title="No cover image"><ImageOff size={12} className="text-amber-400/60 shrink-0" /></span>
                    )}
                    <span className="text-stone font-medium truncate max-w-[200px]">{p.title}</span>
                    {p.is_featured && (
                      <span title="Featured"><Star size={10} className="text-gold-light shrink-0" fill="currentColor" /></span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-subtle text-xs hidden sm:table-cell">{p.country ?? '—'}</td>
                <td className="px-4 py-3 text-stone-subtle text-xs hidden md:table-cell">{p.binge_factor ?? '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {p.quick_verdict && (
                    <span className={`text-2xs px-2 py-0.5 rounded-full ${
                      p.quick_verdict === 'Must listen'
                        ? 'bg-crimson/10 text-crimson'
                        : 'bg-white/5 text-stone-subtle'
                    }`}>
                      {p.quick_verdict}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    p.is_published ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-stone-subtle'
                  }`}>
                    {p.is_published ? <Eye size={10} /> : <EyeOff size={10} />}
                    {p.is_published ? 'Live' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/podcasts/${p.slug}`} target="_blank" className="text-xs text-stone-subtle hover:text-stone transition-colors">
                      View
                    </Link>
                    <Link href={`/admin/podcasts/${p.id}`} className="text-xs text-stone-muted hover:text-stone transition-colors flex items-center gap-1">
                      <Pencil size={11} /> Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-subtle text-sm">No podcasts match "{query}"</p>
          </div>
        )}
      </div>
    </>
  )
}
