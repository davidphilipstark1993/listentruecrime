import { ShopProductForm } from '@/components/admin/shop-product-form'

export default function NewProductPage() {
  return (
    <div className="p-8">
      <h1 className="heading-display mb-6 text-2xl">New product</h1>
      <ShopProductForm product={null} variants={[]} />
    </div>
  )
}
