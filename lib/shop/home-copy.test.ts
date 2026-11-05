import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SHOP_HOME, SHOP_META } from './copy'
import { SHOP_COLLECTIONS } from './config'

describe('/shop landing copy', () => {
  it('has the agreed title, description and H1', () => {
    expect(SHOP_META.title).toBe('True Crime Merch & Gifts UK | Listen True Crime')
    expect(SHOP_META.description.length).toBeLessThanOrEqual(170)
    expect(SHOP_HOME.h1).toBe('True crime merch and gifts, made for armchair detectives')
  })

  it('does not hard-code prices, discounts or delivery times', () => {
    const all = [SHOP_META.description, SHOP_HOME.intro, ...Object.values(SHOP_HOME.collectionLines)].join(' ')
    expect(all).not.toMatch(/£|\d+%|working days|BF26/i)
  })

  it('has a one-line description for every collection', () => {
    for (const c of SHOP_COLLECTIONS) expect(SHOP_HOME.collectionLines[c.slug]).toBeTruthy()
  })

  it('links to a gift guide that exists with that canonical slug', () => {
    const slug = SHOP_HOME.giftGuideHref.replace('/blog/', '')
    const file = join(process.cwd(), 'content/blog', `${slug}.mdx`)
    expect(existsSync(file)).toBe(true)
    expect(readFileSync(file, 'utf8')).toContain(`slug: "${slug}"`)
  })
})
