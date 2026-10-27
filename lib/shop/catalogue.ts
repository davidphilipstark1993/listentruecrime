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

export async function getProductBySlug(slug: string): Promise<PublicProduct | null> {
  const [p] = await loadProducts(q => q.eq('slug', slug).limit(1))
  return p ?? null
}

export async function getRelatedProducts(product: PublicProduct, limit = 4): Promise<PublicProduct[]> {
  const all = await getAllProducts()
  const others = all.filter(p => p.id !== product.id)
  const score = (p: PublicProduct) => (p.category === product.category ? 2 : 0) + (p.isFeatured ? 1 : 0)
  return others.sort((a, b) => score(b) - score(a)).slice(0, limit)
}
