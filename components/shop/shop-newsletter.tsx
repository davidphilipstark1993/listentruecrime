import { NewsletterForm } from '@/components/newsletter/newsletter-form'

/**
 * Reuses the site's existing newsletter signup (POST /api/newsletter →
 * newsletter_subscribers). The `source` tag lets admin see which shop placement
 * converted. Kept as a server component wrapper so the architecture for future
 * subscriber perks (discount codes, referral rewards) has one obvious home.
 */
export function ShopNewsletter({ source = 'shop' }: { source?: string }) {
  return (
    <section aria-labelledby="shop-newsletter" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-800 p-8 lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.14),transparent_60%)]" />
        <div className="relative grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-widest text-crimson">Free newsletter</p>
            <h2 id="shop-newsletter" className="mt-2 font-serif text-3xl uppercase tracking-tight text-stone sm:text-4xl">Love true crime?</h2>
            <p className="mt-3 text-stone-muted">Get fascinating true crime stories delivered straight to your inbox.</p>
          </div>
          <div>
            <NewsletterForm source={source} buttonLabel="Subscribe Free" />
          </div>
        </div>
      </div>
    </section>
  )
}
