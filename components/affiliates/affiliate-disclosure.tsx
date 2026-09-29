import Link from 'next/link'
import { cn } from '@/lib/utils'
import { AFFILIATE_DISCLOSURE_PATH, requiredStatementsFor } from '@/lib/affiliates/providers'

// Short, plain-English affiliate disclosure. Render it only on pages that
// actually carry affiliate links, and pass the providers used so each
// programme's required wording (e.g. Amazon Associates) is included.

interface AffiliateDisclosureProps {
  providers: string[]
  /** 'page' sits near the top of a page; 'compact' sits inside a recommendation. */
  variant?: 'page' | 'compact'
  className?: string
}

export function AffiliateDisclosure({ providers, variant = 'page', className }: AffiliateDisclosureProps) {
  const statements = requiredStatementsFor(providers)

  if (variant === 'compact') {
    return (
      <p className={cn('text-2xs text-stone-subtle leading-relaxed', className)}>
        Affiliate link: we may earn a commission if you buy, at no extra cost to you.
        {statements.length > 0 && <> {statements.join(' ')}</>}
      </p>
    )
  }

  return (
    <p className={cn('text-xs text-stone-subtle leading-relaxed not-prose', className)}>
      This page contains affiliate links. If you buy something after clicking one, we may earn a commission at no
      extra cost to you. It doesn&apos;t affect which podcasts, books or services we cover.
      {statements.length > 0 && <> {statements.join(' ')}</>}{' '}
      <Link href={AFFILIATE_DISCLOSURE_PATH} className="underline hover:text-stone">
        More about affiliate links
      </Link>
    </p>
  )
}
