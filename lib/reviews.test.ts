import { describe, expect, it } from 'vitest'
import { getReviewMeta } from './reviews'

describe('getReviewMeta', () => {
  it('uses stored reviewer and date when present', () => {
    const meta = getReviewMeta({
      reviewed_by: 'david-stark',
      reviewed_at: '2026-03-01T10:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-04-02T00:00:00Z',
    })
    expect(meta.author.slug).toBe('david-stark')
    expect(meta.reviewedAt).toBe('2026-03-01T10:00:00Z')
    expect(meta.updatedAt).toBe('2026-04-02T00:00:00Z')
  })

  it('falls back to the default author and created_at', () => {
    const meta = getReviewMeta({ created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })
    expect(meta.author.slug).toBe('david-stark')
    expect(meta.reviewedAt).toBe('2026-01-01T00:00:00Z')
    expect(meta.updatedAt).toBeNull()
  })

  it('omits "last updated" when the edit was the same day as the review', () => {
    const meta = getReviewMeta({ created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T18:00:00Z' })
    expect(meta.updatedAt).toBeNull()
  })
})
