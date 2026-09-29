import { cn } from '@/lib/utils'
import { AffiliateDisclosure } from '@/components/affiliates/affiliate-disclosure'
import { AffiliateProductBody } from '@/components/affiliates/affiliate-product-card'
import { disclosedProviders, type PublicAffiliateProduct } from '@/lib/affiliates/queries'

// A short, editorial list of related books/audiobooks with one disclosure
// line. Used inline in articles (<FurtherReading slugs="..." /> in MDX),
// at the end of articles, in podcast/case sidebars and on fixed pages.
// Renders nothing when none of its products are live.

interface FurtherReadingProps {
  products: PublicAffiliateProduct[]
  /** Identifies where on the page the links sit, for click tracking. */
  placement: string
  heading?: string
  /** Heading element. 'p' keeps it out of the page outline and table of contents. */
  headingAs?: 'h2' | 'h3' | 'p'
  /** Editorial context, e.g. that a book concerns a different case. */
  note?: string | null
  variant?: 'inline' | 'sidebar'
  className?: string
}

// "Further reading" for books only, "Further listening" for audio only,
// both otherwise — so the heading never misdescribes what's listed.
function defaultHeading(products: PublicAffiliateProduct[]) {
  const listening = (p: PublicAffiliateProduct) => p.category === 'audiobook' || p.category === 'subscription'
  if (products.every(listening)) return 'Further listening'
  if (products.some(listening)) return 'Further reading and listening'
  return 'Further reading'
}

export function FurtherReading({ products, placement, heading, headingAs = 'p', note, variant = 'inline', className }: FurtherReadingProps) {
  if (!products.length) return null
  const title = heading ?? defaultHeading(products)
  const providers = disclosedProviders(products)
  const Heading = headingAs
  const sidebar = variant === 'sidebar'

  return (
    <aside
      aria-label={title}
      className={cn(
        'not-prose',
        sidebar ? 'card p-5' : 'rounded-xl border border-white/[0.07] bg-ink-800/40 p-4 sm:p-5 my-8',
        className
      )}
    >
      <Heading
        className={cn(
          sidebar
            ? 'font-serif text-sm text-stone uppercase tracking-wide'
            : headingAs === 'h2'
              ? 'font-serif text-xl font-semibold text-stone'
              : 'font-serif text-base font-semibold text-stone',
          'mb-1'
        )}
      >
        {title}
      </Heading>
      {note && <p className={cn('text-stone-subtle leading-relaxed', sidebar ? 'text-xs' : 'text-sm')}>{note}</p>}
      <ul className={cn('mt-3', sidebar ? 'space-y-4' : 'space-y-4 divide-y divide-white/[0.05] [&>li+li]:pt-4')}>
        {products.map(p => (
          <li key={p.id}>
            <AffiliateProductBody product={p} placement={placement} compact={sidebar} />
          </li>
        ))}
      </ul>
      {providers.length > 0 && (
        <AffiliateDisclosure
          providers={providers}
          variant="compact"
          className="mt-4 pt-3 border-t border-white/[0.06]"
        />
      )}
    </aside>
  )
}
