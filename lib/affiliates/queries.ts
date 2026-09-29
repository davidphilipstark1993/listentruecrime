import { createAdminClient } from '@/lib/supabase/admin'
import type { AffiliateProduct } from '@/lib/types/database'
import type { AffiliatePageType } from '@/lib/affiliates/providers'

// Public-page reads. A product is only ever returned when it is active AND
// has an affiliate URL — so products added in admin without a real link
// never reach the site. Errors (e.g. the migration not yet applied) return
// an empty list rather than breaking the page.

const PUBLIC_COLUMNS = 'id, slug, provider, title, creator, description, affiliate_url, link_text, image_url, category, disclosure_required'

export type PublicAffiliateProduct = Pick<
  AffiliateProduct,
  'id' | 'slug' | 'provider' | 'title' | 'creator' | 'description' | 'affiliate_url' | 'link_text' | 'image_url' | 'category' | 'disclosure_required'
> & { affiliate_url: string }

function isRenderable<T extends Pick<AffiliateProduct, 'affiliate_url'>>(p: T): p is T & { affiliate_url: string } {
  return Boolean(p.affiliate_url)
}

export async function getAffiliateProductsForPage(pageType: AffiliatePageType, pageKey: string): Promise<PublicAffiliateProduct[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('affiliate_placements')
    .select(`position, product:affiliate_products!inner(${PUBLIC_COLUMNS})`)
    .eq('page_type', pageType)
    .eq('page_key', pageKey)
    .eq('product.active', true)
    .not('product.affiliate_url', 'is', null)
    .order('position', { ascending: true })

  if (error || !data) return []
  return data
    .map(row => row.product as unknown as AffiliateProduct)
    .filter(isRenderable)
}

export async function getAffiliateProductsBySlugs(slugs: string[]): Promise<Map<string, PublicAffiliateProduct>> {
  const result = new Map<string, PublicAffiliateProduct>()
  if (!slugs.length) return result

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('affiliate_products')
    .select(PUBLIC_COLUMNS)
    .in('slug', slugs)
    .eq('active', true)
    .not('affiliate_url', 'is', null)

  if (error || !data) return result
  for (const p of data as unknown as AffiliateProduct[]) {
    if (isRenderable(p)) result.set(p.slug, p)
  }
  return result
}
