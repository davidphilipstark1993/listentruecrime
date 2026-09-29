import { cn } from '@/lib/utils'
import { AffiliateLink } from '@/components/affiliates/affiliate-link'
import { AffiliateDisclosure } from '@/components/affiliates/affiliate-disclosure'
import type { PublicAffiliateProduct } from '@/lib/affiliates/queries'

// Editorial recommendation card for a managed affiliate product. Wording
// is descriptive ("Recommended", the product's own description) — it
// never claims ListenTrueCrime has reviewed or tested the product. Prices
// are deliberately never shown: they change constantly on the retailer's
// side and a stale price would be inaccurate.

interface AffiliateRecommendationProps {
  product: PublicAffiliateProduct
  placement: string
  label?: string
  /** Set false when a surrounding section already shows the disclosure. */
  showDisclosure?: boolean
  className?: string
}

export function AffiliateRecommendation({ product, placement, label = 'Recommended', showDisclosure = true, className }: AffiliateRecommendationProps) {
  return (
    <aside
      className={cn('not-prose rounded-xl border border-white/[0.07] bg-ink-800/40 p-5 my-6', className)}
      aria-label={`${label}: ${product.title}`}
    >
      <p className="text-2xs font-semibold uppercase tracking-widest text-stone-subtle mb-3">{label}</p>
      <div className="flex gap-4">
        {product.image_url && (
          // Plain <img>: product images are hotlinked from the programme's
          // own approved image URLs, never downloaded or proxied.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt=""
            width={64}
            height={96}
            loading="lazy"
            decoding="async"
            className="w-16 h-auto rounded object-contain shrink-0 self-start"
          />
        )}
        <div className="min-w-0">
          <p className="font-serif text-base font-semibold text-stone leading-snug">
            {product.title}
            {product.creator && <span className="font-sans font-normal text-stone-muted"> — {product.creator}</span>}
          </p>
          {product.description && (
            <p className="text-sm text-stone-muted leading-relaxed mt-1.5">{product.description}</p>
          )}
          <AffiliateLink
            provider={product.provider}
            href={product.affiliate_url}
            label={product.link_text ?? undefined}
            product={product.slug}
            placement={placement}
            variant="text"
            className="mt-3"
          />
          {showDisclosure && product.disclosure_required && (
            <AffiliateDisclosure providers={[product.provider]} variant="compact" className="mt-2" />
          )}
        </div>
      </div>
    </aside>
  )
}

// "Further reading" for books only, "Further listening" for audio only,
// both otherwise — so the heading never misdescribes what's listed.
function defaultHeading(products: PublicAffiliateProduct[]) {
  const reading = products.some(p => p.category === 'book')
  const listening = products.some(p => p.category === 'audiobook' || p.category === 'subscription')
  if (reading && !listening) return 'Further reading'
  if (listening && !reading) return 'Further listening'
  return 'Further reading and listening'
}

interface AffiliateRecommendationsProps {
  products: PublicAffiliateProduct[]
  placement: string
  heading?: string
  className?: string
}

/** A group of recommendations with a single disclosure underneath. */
export function AffiliateRecommendations({ products, placement, heading, className }: AffiliateRecommendationsProps) {
  if (!products.length) return null
  heading ??= defaultHeading(products)
  const needsDisclosure = products.some(p => p.disclosure_required)

  return (
    <section className={cn('not-prose', className)} aria-labelledby={`affiliate-${placement}`}>
      <h2 id={`affiliate-${placement}`} className="font-serif text-xl font-semibold text-stone mb-2">{heading}</h2>
      <div>
        {products.map(p => (
          <AffiliateRecommendation key={p.id} product={p} placement={placement} showDisclosure={false} className="my-3" />
        ))}
      </div>
      {needsDisclosure && (
        <AffiliateDisclosure providers={products.map(p => p.provider)} variant="compact" className="mt-2" />
      )}
    </section>
  )
}

/** Compact version for page sidebars (podcast and case pages). */
export function AffiliateSidebarCard({ products, placement, heading }: AffiliateRecommendationsProps) {
  if (!products.length) return null
  heading ??= defaultHeading(products)
  const needsDisclosure = products.some(p => p.disclosure_required)

  return (
    <div className="card p-5">
      <h3 className="font-serif text-sm text-stone mb-3 uppercase tracking-wide">{heading}</h3>
      <ul className="space-y-4">
        {products.map(p => (
          <li key={p.id}>
            <p className="text-stone text-sm font-medium leading-snug">
              {p.title}
              {p.creator && <span className="text-stone-subtle font-normal"> — {p.creator}</span>}
            </p>
            {p.description && <p className="text-stone-subtle text-xs leading-relaxed mt-1">{p.description}</p>}
            <AffiliateLink
              provider={p.provider}
              href={p.affiliate_url}
              label={p.link_text ?? undefined}
              product={p.slug}
              placement={placement}
              variant="text"
              className="mt-2 text-xs"
            />
          </li>
        ))}
      </ul>
      {needsDisclosure && (
        <AffiliateDisclosure providers={products.map(p => p.provider)} variant="compact" className="mt-4 pt-3 border-t border-white/[0.06]" />
      )}
    </div>
  )
}
