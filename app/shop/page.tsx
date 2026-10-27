import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BASE } from '@/lib/seo/config'
import { SHOP_CATEGORIES } from '@/lib/shop/config'
import { SHOP_META } from '@/lib/shop/copy'
import { getAllProducts } from '@/lib/shop/catalogue'
import { JsonLd, itemListJsonLd } from '@/lib/shop/seo'
import { breadcrumbSchema } from '@/lib/seo'
import { ProductCard } from '@/components/shop/product-card'
import { DeliveryInfo } from '@/components/shop/delivery-info'
import { ShopNewsletter } from '@/components/shop/shop-newsletter'

export const metadata: Metadata = {
  title: { absolute: SHOP_META.title },
  description: SHOP_META.description,
  alternates: { canonical: `${BASE}/shop` },
  openGraph: { title: SHOP_META.title, description: SHOP_META.description, url: `${BASE}/shop`, type: 'website' },
  robots: { index: true, follow: true },
}

function Section({ id, eyebrow, title, link, children }: { id: string; eyebrow: string; title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-2xs font-semibold uppercase tracking-widest text-crimson">{eyebrow}</p>
          <h2 id={id} className="mt-1 font-serif text-3xl uppercase tracking-tight text-stone">{title}</h2>
        </div>
        {link && <Link href={link.href} className="hidden text-sm text-stone-muted hover:text-stone sm:inline">{link.label} →</Link>}
      </div>
      {children}
    </section>
  )
}

const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">{children}</div>

export default async function ShopPage() {
  const products = await getAllProducts()
  const featured = products.filter(p => p.isFeatured)
  const bestSellers = products.filter(p => p.isBestSeller)
  const newArrivals = products.filter(p => p.isNew)
  const counts = Object.fromEntries(SHOP_CATEGORIES.map(c => [c.slug, products.filter(p => p.category === c.slug).length]))

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Home', url: BASE }, { name: 'Shop', url: `${BASE}/shop` }])} />
      <JsonLd data={itemListJsonLd('Listen True Crime merchandise', products)} />

      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(190,18,60,0.18),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-crimson">Listen True Crime · The Shop</p>
          <h1 className="heading-display mt-5 text-5xl uppercase leading-[1.02] sm:text-6xl lg:text-7xl">
            True crime.<br /><span className="text-crimson">Real obsession.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-muted">
            Exclusive merchandise for amateur detectives, cold case enthusiasts and true crime addicts.
          </p>
          <Link href="#collection" className="btn-primary mt-9 px-8 py-4 uppercase tracking-widest">
            Explore the collection <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section aria-label="Shop by category" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SHOP_CATEGORIES.map(c => (
            <li key={c.slug}>
              <Link href={`/shop/category/${c.slug}`} className="group relative flex h-36 flex-col justify-end overflow-hidden rounded-lg border border-white/[0.06] bg-ink-800 p-5 transition-all duration-300 hover:border-crimson/40 hover:shadow-glow-crimson">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(190,18,60,0.12),transparent_60%)] opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative font-serif text-xl uppercase tracking-wide text-stone">{c.label}</span>
                <span className="relative mt-0.5 text-xs text-stone-subtle">{counts[c.slug] ? `${counts[c.slug]} design${counts[c.slug] === 1 ? '' : 's'}` : 'Coming soon'}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div id="collection" className="scroll-mt-20">
        {featured.length > 0 && (
          <Section id="featured" eyebrow="Featured" title="The collection">
            <Grid>{featured.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}</Grid>
          </Section>
        )}
        {bestSellers.length > 0 && (
          <Section id="best-sellers" eyebrow="Fan favourites" title="Best sellers">
            <Grid>{bestSellers.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}</Grid>
          </Section>
        )}
        {newArrivals.length > 0 && (
          <Section id="new-arrivals" eyebrow="Just in" title="New arrivals">
            <Grid>{newArrivals.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}</Grid>
          </Section>
        )}
        {products.length === 0 && <p className="py-20 text-center text-stone-muted">The collection is being prepared. Check back soon.</p>}
      </div>

      <ShopNewsletter source="shop-home" />
      <DeliveryInfo variant="strip" />
    </>
  )
}
