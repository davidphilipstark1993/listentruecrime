import { describe, it, expect } from 'vitest'
import { getGuidesForPodcastPage } from './blog'

describe('getGuidesForPodcastPage', () => {
  it('adds the serial killer guide for a serial killer show', () => {
    const slugs = getGuidesForPodcastPage('no-such-podcast', ['Murder', 'Serial killer']).map(g => g.slug)
    expect(slugs).toEqual(['best-serial-killer-podcasts'])
  })
  it('adds the investigative guide for investigative shows', () => {
    expect(getGuidesForPodcastPage('no-such-podcast', ['Investigative']).map(g => g.slug)).toEqual(['best-investigative-journalism-podcasts'])
  })
  it('adds the cult guide for cult shows', () => {
    expect(getGuidesForPodcastPage('no-such-podcast', ['Cults', 'Murder']).map(g => g.slug)).toEqual(['best-cult-podcasts'])
  })
  it('adds nothing for a plain murder show', () => {
    expect(getGuidesForPodcastPage('no-such-podcast', ['Murder'])).toEqual([])
  })
  it('never exceeds the limit or duplicates', () => {
    const slugs = getGuidesForPodcastPage('serial', ['Investigative', 'Murder']).map(g => g.slug)
    expect(slugs.length).toBeLessThanOrEqual(3)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('getPostBySlug', () => {
  it('reads the podcastList flag used for ItemList schema', async () => {
    const { getPostBySlug } = await import('./blog')
    expect(getPostBySlug('best-serial-killer-podcasts')?.podcastList).toBe(true)
  })
})
