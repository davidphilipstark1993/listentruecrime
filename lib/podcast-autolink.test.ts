import { describe, expect, it } from 'vitest'
import { autolinkPodcasts } from './podcast-autolink'

const pods = [
  { slug: 'cold', title: 'Cold' },
  { slug: 'serial', title: 'Serial' },
  { slug: 'american-predator', title: 'American Predator' },
  { slug: 'serial-killers', title: 'Serial Killers' },
  { slug: 'the-trail-went-cold', title: 'The Trail Went Cold' },
]

describe('autolinkPodcasts', () => {
  it('links podcast titles in plain prose', () => {
    expect(autolinkPodcasts('Start with Serial today.', pods)).toBe('Start with [Serial](/podcasts/serial) today.')
  })

  it("doesn't link a podcast title inside another work's italicised title", () => {
    expect(autolinkPodcasts('Capote wrote *In Cold Blood* in 1966.', pods)).toBe('Capote wrote *In Cold Blood* in 1966.')
  })

  it('still links an italicised podcast title', () => {
    expect(autolinkPodcasts('Listen to *Serial* first.', pods)).toBe('Listen to *[Serial](/podcasts/serial)* first.')
  })

  it('still links podcast titles in bold', () => {
    expect(autolinkPodcasts('**American Predator** covers Keyes.', pods)).toBe('**[American Predator](/podcasts/american-predator)** covers Keyes.')
  })

  it('skips lines that start with an MDX component', () => {
    const line = '<FurtherReading slugs="x" note="Unlike Serial, this is a book." />'
    expect(autolinkPodcasts(line, pods)).toBe(line)
  })

  it("doesn't nest a shorter title inside a longer one it has just linked", () => {
    expect(autolinkPodcasts('Try Serial Killers or The Trail Went Cold.', pods)).toBe(
      'Try [Serial Killers](/podcasts/serial-killers) or [The Trail Went Cold](/podcasts/the-trail-went-cold).',
    )
  })

  it('leaves the props of a multi-line MDX component alone', () => {
    const block = ['<PodcastRecommendation', '  slug="cold"', '  tags={["Cold case", "Serial"]}', '/>', 'Then try Serial.'].join('\n')
    const out = autolinkPodcasts(block, pods).split('\n')
    expect(out.slice(0, 4).join('\n')).toBe(block.split('\n').slice(0, 4).join('\n'))
    expect(out[4]).toBe('Then try [Serial](/podcasts/serial).')
  })
})
