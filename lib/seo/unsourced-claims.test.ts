import { describe, it, expect } from 'vitest'
import { guardClaims, stripUnsourcedPopularity } from './unsourced-claims'

describe('stripUnsourcedPopularity', () => {
  it('lifts a leading download figure and keeps the sentence', () => {
    expect(stripUnsourcedPopularity('With over 600 million downloads, Casefile’s anonymous host and clinical storytelling set the standard.'))
      .toBe('Casefile’s anonymous host and clinical storytelling set the standard.')
  })
  it('removes a trailing figure from a facts line', () => {
    expect(stripUnsourcedPopularity('30-60 min weekly episodes, over 800M downloads')).toBe('30-60 min weekly episodes')
    expect(stripUnsourcedPopularity('anonymous, fully scripted · 600M+ downloads · ~60-90 minutes each'))
      .toBe('Anonymous, fully scripted · ~60-90 minutes each')
  })
  it('drops an uncited chart sentence whole', () => {
    expect(stripUnsourcedPopularity('Warm and funny. Apple ranked it the 10th most popular US podcast of 2024 for good reason. Start anywhere.'))
      .toBe('Warm and funny. Start anywhere.')
  })
  it('drops a sentence it cannot repair', () => {
    expect(stripUnsourcedPopularity('The show has approximately 30 million downloads per month. It is hosted by two friends.'))
      .toBe('It is hosted by two friends.')
  })
  it('leaves ordinary copy and awards alone', () => {
    const t = 'A Peabody-winning investigation into the Curtis Flowers case, told over 11 episodes.'
    expect(stripUnsourcedPopularity(t)).toBe(t)
    expect(stripUnsourcedPopularity('Download the first episode and you will be hooked.')).toBe('Download the first episode and you will be hooked.')
  })
  it('writes no replacement figure', () => {
    expect(stripUnsourcedPopularity('With over 600 million downloads, it is huge.')).not.toMatch(/million|downloads/i)
  })
})

describe('guardClaims', () => {
  it('returns null for empty input or when nothing is left', () => {
    expect(guardClaims(null)).toBeNull()
    expect(guardClaims('Over 600 million downloads.')).toBeNull()
  })
})
