import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BASE } from '@/lib/seo/config'
import { breadcrumbSchema } from '@/lib/seo'
import { categoryLabel, shopEnabled } from '@/lib/shop/config'
import { getAllProducts, getProductBySlug, getRelatedProducts } from '@/lib/shop/catalogue'
import { JsonLd, productJsonLd, productUrl } from '@/lib/shop/seo'
import { ProductGallery } from '@/components/shop/product-gallery'
import { PurchasePanel } from '@/components/shop/purchase-panel'
import { SizeGuideTable } from '@/components/shop/size-guide'
import { DeliveryInfo } from '@/components/shop/delivery-info'
import { ProductCard } from '@/components/shop/product-card'
import { ShopNewsletter } from '@/components/shop/shop-newsletter'

export async function generateStaticParams() {
  if (!shopEnabled()) return []
  try {
    return (await getAllProducts()).map(p => ({ slug: p.slug }))
  } catch {
    return [] // pages are then rendered on first request instead
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProductBySlug(params.slug)
  if (!p) return {}
  const title = p.seoTitle ?? `${p.title} | Listen True Crime Shop`
  const description = p.seoDescription ?? p.shortDescription ?? undefined
  const image = p.images.find(i => !i.placeholder)?.url
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: productUrl(p.slug) },
    openGraph: { title, description, url: productUrl(p.slug), type: 'website', ...(image ? { images: [{ url: image, alt: p.title }] } : {}) },
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug)
  if (!product) notFound()
  const related = await getRelatedProducts(product)
  const paragraphs = (product.description ?? product.shortDescription ?? '').split(/\n\s*\n/).filter(Boolean)

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={breadcrumbSchema([
        { name: 'Home', url: BASE }, { name: 'Shop', url: `${BASE}/shop` },
        { name: categoryLabel(product.category), url: `${BASE}/shop/category/${product.category}` },
        { name: product.title, url: productUrl(product.slug) },
      ])} />

      <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-stone-subtle">
          <Link href="/" className="hover:text-stone">Home</Link><span>/</span>
          <Link href="/shop" className="hover:text-stone">Shop</Link><span>/</span>
          <Link href={`/shop/category/${product.category}`} className="hover:text-stone">{categoryLabel(product.category)}</Link><span>/</span>
          <span className="text-stone-muted">{product.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ProductGallery product={product} />

          <div>
            <div className="flex flex-wrap gap-2">
              {product.isNew && <span className="tag-crimson">New</span>}
              {product.isBestSeller && <span className="tag">Best seller</span>}
              {product.isPlaceholder && <span className="tag">Preview · final artwork to follow</span>}
            </div>
            <h1 className="heading-display mt-3 text-3xl sm:text-4xl">{product.title}</h1>

            <div className="mt-6"><PurchasePanel product={product} /></div>

            <div className="mt-10 space-y-4 text-stone-muted leading-relaxed">
              {paragraphs.map((para, i) => <p key={i}>{para}</p>)}
            </div>
            {product.specs.length > 0 && (
              <ul className="mt-5 list-disc space-y-1 pl-5 text-sm text-stone-muted">{product.specs.map(s => <li key={s}>{s}</li>)}</ul>
            )}

            <div className="mt-10 divide-y divide-white/[0.06] border-y border-white/[0.06]">
              <details className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold uppercase tracking-wider text-stone">Size guide <span className="text-stone-subtle transition group-open:rotate-45">+</span></summary>
                <div className="mt-4"><SizeGuideTable guide={product.sizeGuide} /></div>
              </details>
              <details className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold uppercase tracking-wider text-stone">Delivery and returns <span className="text-stone-subtle transition group-open:rotate-45">+</span></summary>
                <div className="mt-4"><DeliveryInfo /></div>
              </details>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related" className="mt-20">
            <h2 id="related" className="mb-8 font-serif text-2xl uppercase tracking-tight text-stone">You might also like</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">{related.map(p => <ProductCard key={p.id} product={p} />)}</div>
          </section>
        )}
      </article>
      <ShopNewsletter source="shop-product" />
    </>
  )
}
