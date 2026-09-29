'use client'
import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { sendGAEvent } from '@next/third-parties/google'
import { cn } from '@/lib/utils'
import { getAffiliateProvider } from '@/lib/affiliates/providers'

// Outbound affiliate link. The href is the affiliate URL exactly as
// supplied — a plain <a>, no redirect or cloaking, so the destination is
// visible on hover and the referring page is passed on as normal.
//
// On click it records the event in Google Analytics (the site's existing
// analytics) and posts a small beacon to /api/affiliate-clicks. Neither
// carries personal data, and neither can delay or block navigation.

interface AffiliateLinkProps {
  provider: string
  href: string
  label?: string
  /** Product slug from /admin/affiliates, when the link is for a managed product. */
  product?: string
  /** Where on the page the link sits, e.g. 'article-inline', 'podcast-sidebar'. */
  placement?: string
  variant?: 'button' | 'text'
  className?: string
  children?: ReactNode
}

function trackAffiliateClick(params: { provider: string; product?: string; placement?: string }) {
  const page_path = window.location.pathname
  try {
    sendGAEvent('event', 'affiliate_click', {
      affiliate_provider: params.provider,
      affiliate_product: params.product ?? '',
      affiliate_placement: params.placement ?? '',
      page_path,
    })
  } catch {
    // Analytics must never break the page
  }
  try {
    const body = JSON.stringify({
      provider: params.provider,
      product_slug: params.product,
      placement: params.placement,
      page_path,
    })
    navigator.sendBeacon?.('/api/affiliate-clicks', new Blob([body], { type: 'application/json' }))
  } catch {
    // Same — tracking is best-effort
  }
}

export function AffiliateLink({ provider, href, label, product, placement, variant = 'button', className, children }: AffiliateLinkProps) {
  const text = children ?? label ?? getAffiliateProvider(provider)?.defaultLinkText ?? 'View retailer'

  return (
    <a
      href={href}
      target="_blank"
      // sponsored: tells search engines this is a paid link. noopener
      // without noreferrer, so the retailer still sees the referring page.
      rel="sponsored nofollow noopener"
      data-affiliate-provider={provider}
      onClick={() => trackAffiliateClick({ provider, product, placement })}
      className={cn(
        variant === 'button'
          ? 'btn-outline !px-4 !py-2'
          : 'inline-flex items-center gap-1 text-crimson hover:underline font-medium text-sm',
        className
      )}
    >
      {text}
      <ArrowUpRight size={14} aria-hidden="true" className="shrink-0" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
