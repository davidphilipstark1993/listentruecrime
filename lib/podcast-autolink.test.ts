import { describe, expect, it } from 'vitest'
import { autolinkPodcasts } from './podcast-autolink'

const pods = [
  { slug: 'cold', title: 'Cold' },
  { slug: 'serial', title: 'Serial' },
  { slug: 'american-predator', title: 'American Predator' },
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

  it('links only the first mention of a podcast', () => {
    const out = autolinkPodcasts('Serial started it.\n\nLater, Serial came back. Serial again.', pods)
    expect(out).toBe('[Serial](/podcasts/serial) started it.\n\nLater, Serial came back. Serial again.')
  })

  it('skips headings when picking the first mention', () => {
    const out = autolinkPodcasts('## Serial\n\nWe loved Serial.', pods)
    expect(out).toBe('## Serial\n\nWe loved [Serial](/podcasts/serial).')
  })

  it('does not add a second link for a podcast already linked by hand', () => {
    const out = autolinkPodcasts('Read [our Serial review](/podcasts/serial). Serial is great.', pods)
    expect(out).toBe('Read [our Serial review](/podcasts/serial). Serial is great.')
  })

  it('links different podcasts once each', () => {
    const out = autolinkPodcasts('Serial and American Predator, then Serial and American Predator.', pods)
    expect(out).toBe('[Serial](/podcasts/serial) and [American Predator](/podcasts/american-predator), then Serial and American Predator.')
  })

  it('never nests a link inside a link when one title contains another', () => {
    const nested = [
      { slug: 'crime-junkie', title: 'Crime Junkie' },
      { slug: 'junkie', title: 'Junkie' },
    ]
    expect(autolinkPodcasts('Crime Junkie is popular.', nested)).toBe('[Crime Junkie](/podcasts/crime-junkie) is popular.')
  })
})
