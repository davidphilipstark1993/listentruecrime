import { createAdminClient } from '@/lib/supabase/admin'
import { toPublicProduct } from './pricing'
import type { PublicProduct, ShopProductRow, ShopVariantRow } from './types'

// Storefront reads use the service-role client (like the rest of the site's
// server components) but only ever SELECT published rows and return the
// browser-safe PublicProduct shape.

async function loadProducts(filter: (q: any) => any): Promise<PublicProduct[]> {
  const admin = createAdminClient()
  const base = admin.from('shop_products').select('*').eq('is_published', true)
  const { data: products, error } = await filter(base).order('sort_order').order('created_at')
  if (error || !products?.length) return []
  const { data: variants } = await admin
    .from('shop_variants')
    .select('*')
    .in('product_id', (products as ShopProductRow[]).map(p => p.id))
  const byProduct = new Map<string, ShopVariantRow[]>()
  for (const v of (variants ?? []) as ShopVariantRow[]) {
    const list = byProduct.get(v.product_id) ?? []
    list.push(v)
    byProduct.set(v.product_id, list)
  }
  return (products as ShopProductRow[]).map(p => toPublicProduct(p, byProduct.get(p.id) ?? []))
}

export const getAllProducts = () => loadProducts(q => q)
export const getProductsByCategory = (category: string) => loadProducts(q => q.eq('category', category))
export const getProductsByCollection = (collection: string) => loadProducts(q => q.eq('collection', collection))

export async function getProductBySlug(slug: string): Promise<PublicProduct | null> {
  const [p] = await loadProducts(q => q.eq('slug', slug).limit(1))
  return p ?? null
}

/** Ranks cross-sells: the same design on other products first, then the same collection, then the same category. */
export function relatedScore(product: PublicProduct, p: PublicProduct): number {
  return (
    (product.design && p.design === product.design ? 8 : 0) +
    (product.collection && p.collection === product.collection ? 4 : 0) +
    (p.category === product.category ? 2 : 0) +
    (p.isFeatured ? 1 : 0)
  )
}

export async function getRelatedProducts(product: PublicProduct, limit = 4): Promise<PublicProduct[]> {
  const all = await getAllProducts()
  return all
    .filter(p => p.id !== product.id)
    .sort((a, b) => relatedScore(product, b) - relatedScore(product, a))
    .slice(0, limit)
}
