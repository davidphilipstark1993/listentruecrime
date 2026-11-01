import { describe, expect, it } from 'vitest'
import { sanitizeEnv } from './utils'

describe('sanitizeEnv', () => {
  it('leaves clean values alone', () => {
    expect(sanitizeEnv('SG.abc-123')).toBe('SG.abc-123')
  })
  it('trims whitespace and real newlines', () => {
    expect(sanitizeEnv('  abc\n')).toBe('abc')
  })
  it('strips wrapping quotes', () => {
    expect(sanitizeEnv('"abc"')).toBe('abc')
  })
  it('strips a literal trailing backslash-n', () => {
    expect(sanitizeEnv('abc\\n')).toBe('abc')
  })
  it('strips a literal backslash-n inside the quotes', () => {
    expect(sanitizeEnv('"abc\\n"')).toBe('abc')
  })
  it('strips a literal backslash-n outside the quotes (the previously broken case)', () => {
    expect(sanitizeEnv('"abc"\\n')).toBe('abc')
  })
})
