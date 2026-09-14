import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  basePath: string
  /** Other active query params to preserve across page links (e.g. filters, sort). 'page' is ignored if present. */
  searchParams?: Record<string, string | undefined>
}

function buildHref(basePath: string, page: number, searchParams?: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== 'page') params.set(key, value)
    }
  }
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

/** Full run of numbers up to 9 pages; otherwise first/last two, current ±1, with ellipses between gaps. */
function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 9) return Array.from({ length: total }, (_, i) => i + 1)

  const keep = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1])
  const sorted = Array.from(keep).filter(p => p >= 1 && p <= total).sort((a, b) => a - b)

  const result: (number | 'ellipsis')[] = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('ellipsis')
    result.push(p)
    prev = p
  }
  return result
}

/**
 * Real server-rendered <a href> pagination — every page links directly to
 * its neighbours, so a crawler reaches the whole set within a couple of
 * clicks from page 1 without needing JavaScript.
 */
export function Pagination({ currentPage, totalPages, basePath, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(currentPage, totalPages)
  const linkClass = 'min-w-[2.25rem] h-9 px-2.5 flex items-center justify-center rounded-lg text-sm transition-colors'

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 mt-10 flex-wrap">
      {currentPage > 1 ? (
        <Link
          href={buildHref(basePath, currentPage - 1, searchParams)}
          className={cn(linkClass, 'gap-1 px-3 text-stone-muted hover:text-stone border border-white/[0.08] hover:border-white/20')}
        >
          <ChevronLeft size={14} /> Prev
        </Link>
      ) : (
        <span className={cn(linkClass, 'gap-1 px-3 text-stone-subtle/40 border border-white/[0.04] cursor-not-allowed')}>
          <ChevronLeft size={14} /> Prev
        </span>
      )}

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-stone-subtle text-sm select-none">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(basePath, p, searchParams)}
            aria-current={p === currentPage ? 'page' : undefined}
            className={cn(
              linkClass,
              p === currentPage
                ? 'bg-crimson text-white font-semibold'
                : 'text-stone-muted hover:text-stone border border-white/[0.08] hover:border-white/20'
            )}
          >
            {p}
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link
          href={buildHref(basePath, currentPage + 1, searchParams)}
          className={cn(linkClass, 'gap-1 px-3 text-stone-muted hover:text-stone border border-white/[0.08] hover:border-white/20')}
        >
          Next <ChevronRight size={14} />
        </Link>
      ) : (
        <span className={cn(linkClass, 'gap-1 px-3 text-stone-subtle/40 border border-white/[0.04] cursor-not-allowed')}>
          Next <ChevronRight size={14} />
        </span>
      )}
    </nav>
  )
}
