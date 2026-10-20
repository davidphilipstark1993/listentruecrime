import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ShopProductForm } from '@/components/admin/shop-product-form'
import type { ShopProductRow, ShopVariantRow } from '@/lib/shop/types'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient()
  const [{ data: product }, { data: variants }] = await Promise.all([
    admin.from('shop_products').select('*').eq('id', params.id).maybeSingle(),
    admin.from('shop_variants').select('*').eq('product_id', params.id).order('sort_order'),
  ])
  if (!product) notFound()
  return (
    <div className="p-8">
      <h1 className="heading-display mb-1 text-2xl">{(product as ShopProductRow).title}</h1>
      <p className="mb-6 text-xs text-stone-subtle">/shop/{(product as ShopProductRow).slug}</p>
      <ShopProductForm product={product as ShopProductRow} variants={(variants ?? []) as ShopVariantRow[]} />
    </div>
  )
}
