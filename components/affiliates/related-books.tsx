import Link from 'next/link'
import { FurtherReading } from '@/components/affiliates/further-reading'
import { getAffiliateProductsForPage } from '@/lib/affiliates/queries'

// "Related books & audiobooks" for listing pages (categories, platforms, "podcasts like").
// Data-driven: the books come from `page` placements in /admin/affiliates, keyed by
// `pageKey` (e.g. 'category-cold-cases', 'platform-audible'). When a page has none of its
// own it shows the 'books-default' set, so every listing page carries the same honest,
// disclosed module without per-page hardcoding. Renders nothing when no product is live.

const DEFAULT_KEY = 'books-default'
export const BOOKS_GUIDE_HREF = '/blog/best-true-crime-books-2026'

interface RelatedBooksProps {
  pageKey: string
  /** Click-tracking label, e.g. 'category-reading'. */
  placement: string
  heading?: string
  className?: string
}

export async function RelatedBooks({ pageKey, placement, heading = 'Related books & audiobooks', className }: RelatedBooksProps) {
  let { products, note } = await getAffiliateProductsForPage('page', pageKey)
  if (!products.length) ({ products, note } = await getAffiliateProductsForPage('page', DEFAULT_KEY))
  if (!products.length) return null

  return (
    <section className={className ?? 'max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16'}>
      <FurtherReading products={products} placement={placement} heading={heading} headingAs="h2" note={note} />
      <p className="mt-3 text-xs text-stone-subtle">
        <Link href={BOOKS_GUIDE_HREF} className="underline hover:text-stone">See our guide to the best true crime books</Link>
      </p>
    </section>
  )
}
