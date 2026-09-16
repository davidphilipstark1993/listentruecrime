'use client'
import { useMemo, useState } from 'react'
import { Copy, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BASE } from '@/lib/seo/config'

interface PodcastOption {
  slug: string
  title: string
}

type Theme = 'dark' | 'light'
type Size = 'full' | 'compact'

export function BadgeEmbedGenerator({ podcasts }: { podcasts: PodcastOption[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<PodcastOption | null>(null)
  const [theme, setTheme] = useState<Theme>('dark')
  const [size, setSize] = useState<Size>('full')
  const [copied, setCopied] = useState(false)

  const matches = useMemo(() => {
    if (selected || !query.trim()) return []
    const q = query.trim().toLowerCase()
    return podcasts.filter(p => p.title.toLowerCase().includes(q)).slice(0, 8)
  }, [query, selected, podcasts])

  const badgeParams = new URLSearchParams()
  if (theme !== 'dark') badgeParams.set('theme', theme)
  if (size !== 'full') badgeParams.set('size', size)
  const qs = badgeParams.toString()

  const badgeUrl = selected ? `${BASE}/badge/${selected.slug}${qs ? `?${qs}` : ''}` : ''
  const podcastUrl = selected ? `${BASE}/podcasts/${selected.slug}` : ''
  const dimensions = size === 'compact' ? { width: 150, height: 32 } : { width: 240, height: 64 }

  const embedCode = selected
    ? `<a href="${podcastUrl}" target="_blank" rel="noopener">\n  <img src="${badgeUrl}" alt="${selected.title} — reviewed on ListenTrueCrime" width="${dimensions.width}" height="${dimensions.height}" loading="lazy">\n</a>`
    : ''

  const handleCopy = async () => {
    if (!embedCode) return
    await navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card p-6 space-y-5">
      <div className="relative">
        <label htmlFor="podcast-search" className="block text-xs font-semibold uppercase tracking-widest text-stone-subtle mb-2">
          Find your podcast
        </label>
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
          <input
            id="podcast-search"
            type="text"
            value={selected ? selected.title : query}
            onChange={e => {
              setSelected(null)
              setQuery(e.target.value)
            }}
            placeholder="Start typing your podcast's name…"
            className="w-full bg-ink-800 border border-white/[0.1] rounded-lg pl-10 pr-4 py-2.5 text-stone text-sm placeholder:text-stone-faint focus:outline-none focus:border-crimson/60 transition-colors"
          />
        </div>

        {matches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-ink-800 border border-white/[0.1] rounded-lg overflow-hidden shadow-xl max-h-64 overflow-y-auto">
            {matches.map(p => (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => { setSelected(p); setQuery('') }}
                  className="w-full text-left px-4 py-2.5 text-sm text-stone-muted hover:bg-ink-700 hover:text-stone transition-colors"
                >
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        )}

        {query.trim().length > 1 && !selected && matches.length === 0 && (
          <p className="text-xs text-stone-subtle mt-1.5">
            No match yet — check the spelling, or your podcast may not be reviewed on ListenTrueCrime yet.
          </p>
        )}
      </div>

      {selected && (
        <>
          {/* Style options */}
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-subtle mb-2">Theme</p>
              <div className="flex gap-2">
                {(['dark', 'light'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize',
                      theme === t ? 'border-crimson/50 bg-crimson/10 text-stone' : 'border-white/[0.1] text-stone-subtle hover:text-stone'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-subtle mb-2">Size</p>
              <div className="flex gap-2">
                {(['full', 'compact'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize',
                      size === s ? 'border-crimson/50 bg-crimson/10 text-stone' : 'border-white/[0.1] text-stone-subtle hover:text-stone'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-subtle mb-2">Preview</p>
            <div className={cn('inline-block p-3 rounded-lg', theme === 'light' ? 'bg-white' : 'bg-ink-900')}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={badgeUrl}
                src={badgeUrl}
                alt="Badge preview"
                width={dimensions.width}
                height={dimensions.height}
              />
            </div>
          </div>

          {/* Embed code */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-subtle">HTML embed code</p>
              <button
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all',
                  copied
                    ? 'border-green-500/50 text-green-400'
                    : 'border-white/[0.1] text-stone-subtle hover:border-white/[0.2] hover:text-stone'
                )}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy code'}
              </button>
            </div>
            <pre className="bg-ink-800 rounded-lg p-4 text-xs text-stone-muted overflow-x-auto leading-relaxed">
              {embedCode}
            </pre>
          </div>
        </>
      )}
    </div>
  )
}
