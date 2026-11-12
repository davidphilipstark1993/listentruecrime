import { describe, it, expect } from 'vitest'
import { clampMeta, isCompleteNewRecord, pickNewPodcasts, newPageTitle, newPageDescription, formatAddedDate, NEW_PAGE_DESCRIPTION_FALLBACK } from './new-podcasts'

const row = (o: Partial<Parameters<typeof isCompleteNewRecord>[0]> = {}) => ({
  title: 'Show', slug: 'show', created_at: '2026-11-11T06:55:35Z', binge_factor: 7,
  host_name: 'Host', short_description: 'A real description.', noindex: false, ...o,
})

describe('new true crime podcasts page helpers', () => {
  it('keeps only complete, indexable records', () => {
    expect(isCompleteNewRecord(row())).toBe(true)
    expect(isCompleteNewRecord(row({ binge_factor: null }))).toBe(false)
    expect(isCompleteNewRecord(row({ host_name: ' ' }))).toBe(false)
    expect(isCompleteNewRecord(row({ short_description: '<p></p>' }))).toBe(false)
    expect(isCompleteNewRecord(row({ noindex: true }))).toBe(false)
  })

  it('orders newest first and limits', () => {
    const rows = [
      row({ slug: 'a', created_at: '2026-08-01T00:00:00Z' }),
      row({ slug: 'b', created_at: '2026-11-10T00:00:00Z' }),
      row({ slug: 'c', created_at: '2026-10-27T00:00:00Z', binge_factor: null }),
      row({ slug: 'd', created_at: '2026-11-11T00:00:00Z' }),
    ]
    expect(pickNewPodcasts(rows, 2).map(r => r.slug)).toEqual(['d', 'b'])
  })

  it('builds a dated title under 60 characters', () => {
    const t = newPageTitle('2026-11-11T06:55:35Z')
    expect(t).toBe('New True Crime Podcasts (November 2026): Latest Added')
    expect(t.length).toBeLessThanOrEqual(60)
    expect(newPageTitle(null)).toBe('New True Crime Podcasts: Latest Added')
  })

  it('formats the added date in UK time', () => {
    expect(formatAddedDate('2026-11-10T23:30:00Z')).toBe('10 November 2026')
    expect(formatAddedDate('2026-06-30T23:30:00Z')).toBe('1 July 2026')
  })

  it('names shows in the description only when it fits', () => {
    expect(newPageDescription(['A', 'B', 'C'])).toContain('A, B and C')
    expect(newPageDescription(['A'])).toBe(NEW_PAGE_DESCRIPTION_FALLBACK)
    expect(newPageDescription(['x'.repeat(60), 'y'.repeat(60), 'z'.repeat(60)])).toBe(NEW_PAGE_DESCRIPTION_FALLBACK)
  })

  it('clamps meta descriptions without cutting a word', () => {
    const intro = 'Cold case podcasts dive into mysteries that have stumped investigators for decades — unsolved murders, vanished victims, and killers who evaded justice. These shows reopen files the police closed.'
    const out = clampMeta(intro)
    expect(out.length).toBeLessThanOrEqual(160)
    expect(out.endsWith('justice.')).toBe(true)
    const noStop = 'word '.repeat(50).trim()
    const c = clampMeta(noStop)
    expect(c.length).toBeLessThanOrEqual(160)
    expect(c.endsWith('word…')).toBe(true)
    expect(clampMeta('Short.')).toBe('Short.')
  })
})
