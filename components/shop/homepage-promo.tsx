import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { categoryLabel } from '@/lib/shop/config'
import { getAllProducts } from '@/lib/shop/catalogue'
import { formatGBP } from '@/lib/shop/money'
import { ProductImage } from './product-image'

/** Homepage merchandise promotion. Rendered only while the shop is enabled. */
export async function HomepageShopPromo() {
  const products = (await getAllProducts()).filter(p => p.isFeatured).slice(0, 3)
  return (
    <section aria-labelledby="home-shop" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(190,18,60,0.16),transparent_60%)]" />
        <div className="relative grid items-center gap-10 p-8 lg:grid-cols-[1fr_1.2fr] lg:p-12">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.3em] text-crimson">The Shop</p>
            <h2 id="home-shop" className="heading-display mt-3 text-4xl uppercase leading-[1.05] sm:text-5xl">Wear your obsession</h2>
            <p className="mt-4 max-w-md text-stone-muted">Exclusive clothing and accessories for true crime enthusiasts.</p>
            <Link href="/shop" className="btn-primary mt-8 px-7 py-3.5 uppercase tracking-widest">
              Shop the collection <ArrowRight size={15} />
            </Link>
          </div>
          {products.length > 0 && (
            <ul className="grid grid-cols-3 gap-3">
              {products.map(p => (
                <li key={p.id}>
                  <Link href={`/shop/${p.slug}`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/[0.06] bg-ink-800 transition-all group-hover:border-white/20">
                      <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105">
                        <ProductImage product={p} sizes="(min-width: 1024px) 18vw, 30vw" />
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-stone">{p.title}</p>
                    <p className="text-2xs text-stone-subtle">{p.fromPricePence != null ? `From ${formatGBP(p.fromPricePence)}` : categoryLabel(p.category)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
