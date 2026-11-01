import { describe, expect, it } from 'vitest'
import { relatedScore } from './catalogue'
import type { PublicProduct } from './types'

const make = (over: Partial<PublicProduct>): PublicProduct => ({
  id: 'x', slug: 'x', title: 'x', category: 't-shirts', shortDescription: null, description: null, images: [], specs: [],
  sizeGuide: null, isFeatured: false, isBestSeller: false, isNew: false, isPlaceholder: false, collection: null, design: null,
  seoTitle: null, seoDescription: null, variants: [], fromPricePence: null, purchasable: true, colours: [], sizes: [], ...over,
})

describe('relatedScore', () => {
  const tee = make({ category: 't-shirts', collection: 'case-files', design: 'unresolved' })

  it('ranks the same design on another product above the same collection, and that above the same category', () => {
    const sameDesign = make({ category: 'mugs', collection: 'case-files', design: 'unresolved' })
    const sameCollection = make({ category: 'mugs', collection: 'case-files', design: 'cold-case-unit' })
    const sameCategory = make({ category: 't-shirts', collection: 'podcast-addict', design: 'other' })
    expect(relatedScore(tee, sameDesign)).toBeGreaterThan(relatedScore(tee, sameCollection))
    expect(relatedScore(tee, sameCollection)).toBeGreaterThan(relatedScore(tee, sameCategory))
  })

  it('does not treat two products with no design or collection as related by design/collection', () => {
    const a = make({}), b = make({})
    expect(relatedScore(a, b)).toBe(2) // same category only
  })
})
