import { cn } from '@/lib/utils'
import { AffiliateLink } from '@/components/affiliates/affiliate-link'
import type { PublicAffiliateProduct } from '@/lib/affiliates/queries'

// Presentation for managed affiliate products. Wording stays descriptive
// (title, author, the product's own factual description) and never claims
// ListenTrueCrime has reviewed a product. Prices are deliberately never
// shown: they change constantly on the retailer's side.

/** Small "Affiliate link" marker next to a CTA. The full disclosure sits at page/section level. */
export function AffiliateTag({ className }: { className?: string }) {
  return <span className={cn('text-2xs text-stone-subtle', className)}>Affiliate link</span>
}

/**
 * "Prefer to listen?" line for a book's audiobook edition. Only rendered
 * when a live audiobook product exists, so availability is never assumed.
 */
export function AudiobookLine({ audiobook, placement, className }: { audiobook: PublicAffiliateProduct; placement: string; className?: string }) {
  return (
    <p className={cn('text-xs text-stone-subtle', className)}>
      Prefer to listen?{' '}
      <AffiliateLink
        provider={audiobook.provider}
        href={audiobook.affiliate_url}
        label={audiobook.link_text ?? 'Check the audiobook'}
        product={audiobook.slug}
        placement={placement}
        variant="text"
        className="text-xs"
      />
    </p>
  )
}

/** Title — author, description, CTA and audiobook line. Shared by the card and FurtherReading. */
export function AffiliateProductBody({ product, placement, compact = false }: { product: PublicAffiliateProduct; placement: string; compact?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={cn('text-stone leading-snug', compact ? 'text-sm font-medium' : 'font-serif text-base font-semibold')}>
        {product.title}
        {product.creator && (
          <span className={cn('font-sans font-normal', compact ? 'text-stone-subtle' : 'text-stone-muted')}> — {product.creator}</span>
        )}
      </p>
      {product.description && (
        <p className={cn('leading-relaxed mt-1', compact ? 'text-xs text-stone-subtle' : 'text-sm text-stone-muted')}>{product.description}</p>
      )}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2">
        <AffiliateLink
          provider={product.provider}
          href={product.affiliate_url}
          label={product.link_text ?? undefined}
          product={product.slug}
          placement={placement}
          variant="text"
          className={compact ? 'text-xs' : undefined}
        />
        {product.disclosure_required && <AffiliateTag />}
      </div>
      {product.audiobook && <AudiobookLine audiobook={product.audiobook} placement={placement} className="mt-1.5" />}
    </div>
  )
}

interface AffiliateProductCardProps {
  product: PublicAffiliateProduct
  placement: string
  /** Optional small label above the title, e.g. "Recommended". */
  label?: string
  className?: string
}

/** A single product, set apart from the surrounding article in a restrained box. */
export function AffiliateProductCard({ product, placement, label, className }: AffiliateProductCardProps) {
  return (
    <aside
      className={cn('not-prose rounded-xl border border-white/[0.07] bg-ink-800/40 p-4 sm:p-5 my-6', className)}
      aria-label={label ? `${label}: ${product.title}` : product.title}
    >
      {label && <p className="text-2xs font-semibold uppercase tracking-widest text-stone-subtle mb-2">{label}</p>}
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
            className="w-14 h-auto rounded object-contain shrink-0 self-start"
          />
        )}
        <AffiliateProductBody product={product} placement={placement} />
      </div>
    </aside>
  )
}
