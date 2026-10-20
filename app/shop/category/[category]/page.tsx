import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BASE } from '@/lib/seo/config'
import { SHOP_CATEGORIES } from '@/lib/shop/config'
import { getProductsByCategory } from '@/lib/shop/catalogue'
import { JsonLd, itemListJsonLd } from '@/lib/shop/seo'
import { breadcrumbSchema } from '@/lib/seo'
import { ProductCard } from '@/components/shop/product-card'
import { ShopNewsletter } from '@/components/shop/shop-newsletter'

const SEO: Record<string, { title: string; description: string; intro: string }> = {
  't-shirts': {
    title: 'True Crime T-Shirts UK',
    description: 'True crime T-shirts for armchair detectives and podcast addicts. Black tees printed to order and delivered across the UK.',
    intro: 'Black tees for people who solve cases from the sofa. Printed to order, delivered across the UK.',
  },
  hoodies: {
    title: 'True Crime Hoodies UK',
    description: 'True crime hoodies for long episodes and longer theories. Printed to order and delivered across the UK.',
    intro: 'For long episodes and longer theories. Black hoodies, printed to order.',
  },
  mugs: {
    title: 'True Crime Mugs and Gifts',
    description: 'True crime mugs and gifts for lovers of cold cases and podcasts. Printed to order and delivered across the UK.',
    intro: 'Every investigation needs a brew. Gifts for true crime lovers.',
  },
  accessories: {
    title: 'True Crime Accessories',
    description: 'True crime accessories and gifts from Listen True Crime. Printed to order and delivered across the UK.',
    intro: 'The finishing touches for the dedicated armchair detective.',
  },
}

export function generateStaticParams() {
  return SHOP_CATEGORIES.map(c => ({ category: c.slug }))
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const seo = SEO[params.category]
  if (!seo) return {}
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `${BASE}/shop/category/${params.category}` },
    openGraph: { title: seo.title, description: seo.description, url: `${BASE}/shop/category/${params.category}` },
  }
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const cat = SHOP_CATEGORIES.find(c => c.slug === params.category)
  if (!cat) notFound()
  const seo = SEO[cat.slug]
  const products = await getProductsByCategory(cat.slug)

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Home', url: BASE }, { name: 'Shop', url: `${BASE}/shop` }, { name: cat.label, url: `${BASE}/shop/category/${cat.slug}` }])} />
      <JsonLd data={itemListJsonLd(seo.title, products)} />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-stone-subtle">
          <Link href="/" className="hover:text-stone">Home</Link><span>/</span>
          <Link href="/shop" className="hover:text-stone">Shop</Link><span>/</span>
          <span className="text-stone-muted">{cat.label}</span>
        </nav>
        <h1 className="heading-display text-4xl uppercase sm:text-5xl">{cat.label}</h1>
        <p className="mt-3 max-w-xl text-stone-muted">{seo.intro}</p>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Categories">
          {SHOP_CATEGORIES.map(c => (
            <li key={c.slug}>
              <Link href={`/shop/category/${c.slug}`} aria-current={c.slug === cat.slug} className={`tag px-3.5 py-1.5 text-xs ${c.slug === cat.slug ? 'border-crimson/40 text-stone' : 'hover:text-stone'}`}>{c.label}</Link>
            </li>
          ))}
        </ul>

        {products.length ? (
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
          </div>
        ) : (
          <p className="mt-16 rounded-lg border border-white/[0.06] bg-ink-800 p-10 text-center text-stone-muted">New designs are on their way to this category.</p>
        )}
      </section>
      <ShopNewsletter source={`shop-${cat.slug}`} />
    </>
  )
}
