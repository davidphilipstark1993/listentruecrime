'use client'
import Link from 'next/link'
import { useEffect, type ComponentProps } from 'react'
import { sendGAEvent } from '@next/third-parties/google'

// Thin wrappers over the site's existing Google Analytics setup
// (@next/third-parties in app/layout.tsx). Event params are limited to
// page/CTA/package identifiers — never form contents or personal data.

export type PromotionEvent =
  | 'promote_page_view'
  | 'promote_cta_click'
  | 'promote_free_listing_click'
  | 'promotion_enquiry_started'
  | 'promotion_package_selected'
  | 'promotion_enquiry_submitted'

export function trackPromotion(event: PromotionEvent, params: Record<string, string> = {}) {
  try {
    sendGAEvent('event', event, params)
  } catch {
    // Analytics must never break the page
  }
}

export function PromotionPageView({ page }: { page: string }) {
  useEffect(() => {
    trackPromotion('promote_page_view', { page })
  }, [page])
  return null
}

type TrackedLinkProps = ComponentProps<typeof Link> & {
  event: PromotionEvent
  params?: Record<string, string>
}

export function TrackedLink({ event, params, onClick, ...props }: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={e => {
        trackPromotion(event, params)
        onClick?.(e)
      }}
    />
  )
}
