// Facts shown on /privacy, /terms and /contact. Business name, owner, address and the
// shop policy date live in lib/shop/copy.ts (owner-supplied); this file only adds what the
// legal pages need on top. Update LEGAL_UPDATED whenever either legal page changes.
import { BUSINESS_ADDRESS, BUSINESS_NAME, OWNER_NAME } from '@/lib/shop/copy'

export const LEGAL_UPDATED = '1 November 2026'

// Single inbox for general, privacy and data-rights enquiries.
export const CONTACT_EMAIL = 'info@listentruecrime.com'

export const CONTROLLER = {
  name: OWNER_NAME,
  tradingAs: BUSINESS_NAME,
  address: BUSINESS_ADDRESS,
}
