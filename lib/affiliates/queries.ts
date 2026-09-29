import { createAdminClient } from '@/lib/supabase/admin'
import type { AffiliateProduct } from '@/lib/types/database'
import { AUDIOBOOK_SLUG_SUFFIX, type AffiliatePageType } from '@/lib/affiliates/providers'

// Public-page reads. A product is only ever returned when it is active AND
// has an affiliate URL — so products added in admin without a real link
// never reach the site. Errors (e.g. a migration not yet applied) return
// empty results rather than breaking the page.

const PUBLIC_COLUMNS = 'id, slug, provider, title, creator, description, affiliate_url, link_text, image_url, category, disclosure_required'

type PublicRow = Pick<
  AffiliateProduct,
  'id' | 'slug' | 'provider' | 'title' | 'creator' | 'description' | 'affiliate_url' | 'link_text' | 'image_url' | 'category' | 'disclosure_required'
>

export type PublicAffiliateProduct = PublicRow & {
  affiliate_url: string
  /** Live audiobook edition of this book, when one exists (see AUDIOBOOK_SLUG_SUFFIX). */
  audiobook?: PublicAffiliateProduct
}

export interface PageAffiliates {
  products: PublicAffiliateProduct[]
  /** Editorial context set on the placement in admin, if any. */
  note: string | null
}

function isRenderable<T extends Pick<AffiliateProduct, 'affiliate_url'>>(p: T): p is T & { affiliate_url: string } {
  return Boolean(p.affiliate_url)
}

async function fetchLiveBySlugs(slugs: string[]): Promise<PublicAffiliateProduct[]> {
  if (!slugs.length) return []
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('affiliate_products')
    .select(PUBLIC_COLUMNS)
    .in('slug', slugs)
    .eq('active', true)
    .not('affiliate_url', 'is', null)
  if (error || !data) return []
  return (data as unknown as PublicRow[]).filter(isRenderable)
}

/**
 * Attaches live audiobook editions to their books, and drops a standalone
 * audiobook from the list when its book is already shown (it appears as
 * the book's "Prefer to listen?" line instead).
 */
async function withAudiobooks(products: PublicAffiliateProduct[]): Promise<PublicAffiliateProduct[]> {
  const books = products.filter(p => !p.slug.endsWith(AUDIOBOOK_SLUG_SUFFIX))
  const audiobooks = await fetchLiveBySlugs(books.map(b => b.slug + AUDIOBOOK_SLUG_SUFFIX))
  const bySlug = new Map(audiobooks.map(a => [a.slug, a]))
  const bookSlugs = new Set(books.map(b => b.slug))

  return products
    .filter(p => !(p.slug.endsWith(AUDIOBOOK_SLUG_SUFFIX) && bookSlugs.has(p.slug.slice(0, -AUDIOBOOK_SLUG_SUFFIX.length))))
    .map(p => {
      const audiobook = bySlug.get(p.slug + AUDIOBOOK_SLUG_SUFFIX)
      return audiobook ? { ...p, audiobook } : p
    })
}

export async function getAffiliateProductsForPage(pageType: AffiliatePageType, pageKey: string): Promise<PageAffiliates> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('affiliate_placements')
    .select(`position, note, product:affiliate_products!inner(${PUBLIC_COLUMNS})`)
    .eq('page_type', pageType)
    .eq('page_key', pageKey)
    .eq('product.active', true)
    .not('product.affiliate_url', 'is', null)
    .order('position', { ascending: true })

  if (error || !data) return { products: [], note: null }
  const products = data.map(row => row.product as unknown as PublicRow).filter(isRenderable)
  const note = data.map(row => row.note as string | null).find(Boolean) ?? null
  return { products: await withAudiobooks(products), note }
}

export async function getAffiliateProductsBySlugs(slugs: string[]): Promise<Map<string, PublicAffiliateProduct>> {
  const products = await withAudiobooks(await fetchLiveBySlugs(slugs))
  return new Map(products.map(p => [p.slug, p]))
}

/** Providers whose disclosure applies to these products, including attached audiobooks. */
export function disclosedProviders(products: PublicAffiliateProduct[]): string[] {
  return products.flatMap(p => [p, ...(p.audiobook ? [p.audiobook] : [])]).filter(p => p.disclosure_required).map(p => p.provider)
}
