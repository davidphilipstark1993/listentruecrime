import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BASE } from '@/lib/seo/config'
import { SHOP_COLLECTIONS } from '@/lib/shop/config'
import { getProductsByCollection } from '@/lib/shop/catalogue'
import { JsonLd, itemListJsonLd } from '@/lib/shop/seo'
import { breadcrumbSchema } from '@/lib/seo'
import { ProductCard } from '@/components/shop/product-card'
import { ShopNewsletter } from '@/components/shop/shop-newsletter'

export function generateStaticParams() {
  return SHOP_COLLECTIONS.map(c => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = SHOP_COLLECTIONS.find(x => x.slug === params.slug)
  if (!c) return {}
  const title = `${c.label} | True Crime Merchandise UK`
  const description = `${c.blurb} T-shirts, hoodies, mugs and more from the ${c.label} collection by Listen True Crime. Printed to order in the UK.`
  return { title, description, alternates: { canonical: `${BASE}/shop/collection/${c.slug}` }, openGraph: { title, description, url: `${BASE}/shop/collection/${c.slug}` } }
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const collection = SHOP_COLLECTIONS.find(c => c.slug === params.slug)
  if (!collection) notFound()
  const products = await getProductsByCollection(collection.slug)

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Home', url: BASE }, { name: 'Shop', url: `${BASE}/shop` }, { name: collection.label, url: `${BASE}/shop/collection/${collection.slug}` }])} />
      <JsonLd data={itemListJsonLd(collection.label, products)} />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-stone-subtle">
          <Link href="/" className="hover:text-stone">Home</Link><span>/</span>
          <Link href="/shop" className="hover:text-stone">Shop</Link><span>/</span>
          <span className="text-stone-muted">{collection.label}</span>
        </nav>
        <p className="text-2xs font-semibold uppercase tracking-widest text-crimson">Collection</p>
        <h1 className="heading-display mt-1 text-4xl uppercase sm:text-5xl">{collection.label}</h1>
        <p className="mt-3 max-w-xl text-stone-muted">{collection.blurb}</p>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Collections">
          {SHOP_COLLECTIONS.map(c => (
            <li key={c.slug}>
              <Link href={`/shop/collection/${c.slug}`} aria-current={c.slug === collection.slug} className={`tag px-3.5 py-1.5 text-xs ${c.slug === collection.slug ? 'border-crimson/40 text-stone' : 'hover:text-stone'}`}>{c.label}</Link>
            </li>
          ))}
        </ul>

        {products.length ? (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
          </div>
        ) : (
          <p className="mt-16 rounded-lg border border-white/[0.06] bg-ink-800 p-10 text-center text-stone-muted">New designs are on their way to this collection.</p>
        )}
      </section>
      <ShopNewsletter source={`shop-collection-${collection.slug}`} />
    </>
  )
}
