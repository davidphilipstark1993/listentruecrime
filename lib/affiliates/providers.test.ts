import { describe, expect, it } from 'vitest'
import { affiliateUrlWarning, requiredStatementsFor, validateAffiliateUrl } from './providers'
import { extractAffiliateSlugs } from './mdx'
import { affiliateProductSchema } from './schema'

// Example URLs below are structural test fixtures only (made-up tag
// "example-21"), never real Associates links.

describe('validateAffiliateUrl', () => {
  it('accepts Amazon UK and short links', () => {
    expect(validateAffiliateUrl('amazon', 'https://www.amazon.co.uk/dp/0000000000?tag=example-21')).toBeNull()
    expect(validateAffiliateUrl('amazon', 'https://amzn.to/abc123')).toBeNull()
  })

  it('rejects other hosts, lookalikes and http', () => {
    expect(validateAffiliateUrl('amazon', 'https://example.com/dp/1')).toMatch(/Amazon link/)
    expect(validateAffiliateUrl('amazon', 'https://amazon.co.uk.evil.com/dp/1')).toMatch(/Amazon link/)
    expect(validateAffiliateUrl('amazon', 'https://notamazon.co.uk/dp/1')).toMatch(/Amazon link/)
    expect(validateAffiliateUrl('amazon', 'http://www.amazon.co.uk/dp/1')).toMatch(/https/)
    expect(validateAffiliateUrl('amazon', 'not a url')).toMatch(/full URL/)
  })

  it('rejects unknown providers', () => {
    expect(validateAffiliateUrl('ebay', 'https://www.ebay.co.uk/itm/1')).toBe('Unknown provider')
  })

  it('accepts Audible hosts for the audible provider only', () => {
    expect(validateAffiliateUrl('audible', 'https://www.audible.co.uk/pd/x?tag=example-21')).toBeNull()
    expect(validateAffiliateUrl('amazon', 'https://www.audible.co.uk/pd/x')).toMatch(/Amazon link/)
  })
})

describe('affiliateUrlWarning', () => {
  it('warns on an ordinary Amazon URL but not an Associates one', () => {
    expect(affiliateUrlWarning('amazon', 'https://www.amazon.co.uk/dp/0000000000')).toMatch(/ordinary Amazon link/)
    expect(affiliateUrlWarning('amazon', 'https://www.amazon.co.uk/dp/0000000000?tag=example-21')).toBeNull()
    expect(affiliateUrlWarning('amazon', 'https://amzn.to/abc123')).toBeNull()
  })
})

describe('requiredStatementsFor', () => {
  it('shows the shared Amazon statement once for Amazon + Audible', () => {
    expect(requiredStatementsFor(['amazon', 'audible', 'amazon'])).toHaveLength(1)
    expect(requiredStatementsFor([])).toEqual([])
  })
})

describe('extractAffiliateSlugs', () => {
  it('finds inline MDX product slugs', () => {
    const mdx = 'Intro\n\n<AffiliateProduct slug="helter-skelter" />\n\nText <AffiliateProduct variant="link" slug=\'in-cold-blood\'>x</AffiliateProduct>'
    expect(extractAffiliateSlugs(mdx)).toEqual(['helter-skelter', 'in-cold-blood'])
  })
})

describe('affiliateProductSchema', () => {
  const base = { slug: 'helter-skelter', provider: 'amazon', title: 'Helter Skelter' }

  it('keeps the affiliate URL exactly as supplied (bar surrounding whitespace)', () => {
    const url = 'https://www.amazon.co.uk/dp/0000000000/ref=xyz?tag=example-21&linkCode=ll1'
    const parsed = affiliateProductSchema.parse({ ...base, affiliate_url: `  ${url} ` })
    expect(parsed.affiliate_url).toBe(url)
  })

  it('refuses to make a product live without an affiliate URL', () => {
    expect(affiliateProductSchema.safeParse({ ...base, active: true }).success).toBe(false)
    expect(affiliateProductSchema.safeParse({ ...base, active: false }).success).toBe(true)
  })

  it('rejects a URL for the wrong provider', () => {
    expect(affiliateProductSchema.safeParse({ ...base, affiliate_url: 'https://example.com/x' }).success).toBe(false)
  })
})
