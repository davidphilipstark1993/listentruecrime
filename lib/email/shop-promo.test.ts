import { describe, it, expect, afterEach } from 'vitest'
import { shopPromoRowHtml } from './shop-promo'
import { buildWelcomeEmailHtml } from './sendgrid'
import { buildLeadMagnetHtml } from './lead-magnet'

const original = process.env.NEXT_PUBLIC_SHOP_ENABLED
afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PUBLIC_SHOP_ENABLED
  else process.env.NEXT_PUBLIC_SHOP_ENABLED = original
})

describe('shop news in the welcome emails', () => {
  it('is included in both welcome emails when the shop is enabled', () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'true'
    expect(shopPromoRowHtml()).toContain('/shop')
    expect(buildWelcomeEmailHtml('Sam')).toContain('The Listen True Crime shop is open')
    expect(buildLeadMagnetHtml([])).toContain('The Listen True Crime shop is open')
  })

  it('is left out of both when the shop is switched off', () => {
    process.env.NEXT_PUBLIC_SHOP_ENABLED = 'false'
    expect(shopPromoRowHtml()).toBe('')
    expect(buildWelcomeEmailHtml()).not.toContain('/shop')
    expect(buildLeadMagnetHtml([])).not.toContain('/shop')
  })
})
