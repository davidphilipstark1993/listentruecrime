import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `https://www.listentruecrime.com${item.href}` } : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center flex-wrap gap-1 text-xs text-stone-subtle">
          {items.map((item, i) => (
            // The current page is the H1 directly below; on phones the crumb
            // trail stops at its parent so a long title doesn't wrap into a
            // second line. It stays in the BreadcrumbList structured data.
            <li key={i} className={cn('flex items-center gap-1', i === items.length - 1 && i > 0 && 'hidden sm:flex')}>
              {i > 0 && <ChevronRight className="w-3 h-3 text-stone-faint flex-shrink-0" />}
              {item.href && i < items.length - 1 ? (
                <Link href={item.href} className="inline-block py-2 hover:text-stone transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={i === items.length - 1 ? 'text-stone-muted' : ''}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
