'use client'
import { useEffect, useState } from 'react'
import { List } from 'lucide-react'
import type { TOCEntry } from '@/lib/blog'
import { cn } from '@/lib/utils'

export function TableOfContents({ entries }: { entries: TOCEntry[] }) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const headings = entries.map(e => document.getElementById(e.id)).filter(Boolean) as HTMLElement[]
    if (!headings.length) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )
    headings.forEach(h => observer.observe(h))
    return () => observer.disconnect()
  }, [entries])

  if (!entries.length) return null

  return (
    <nav aria-label="Table of contents" className="rounded-xl border border-white/[0.07] bg-ink-800/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <List className="w-4 h-4 text-crimson" />
        <span className="text-xs font-semibold uppercase tracking-widest text-stone-muted">
          Contents
        </span>
      </div>
      <ol className="space-y-1.5">
        {entries.map(entry => (
          <li
            key={entry.id}
            style={{ paddingLeft: `${(entry.level - 2) * 12}px` }}
          >
            <a
              href={`#${entry.id}`}
              className={cn(
                'block text-sm leading-snug transition-colors py-0.5',
                activeId === entry.id
                  ? 'text-crimson font-medium'
                  : 'text-stone-subtle hover:text-stone'
              )}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
