import { describe, it, expect } from 'vitest'
import { nextSunday } from './week'

function utcDate(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`) // midday to avoid any TZ edge effects
}

describe('nextSunday', () => {
  it('returns today when today is Sunday', () => {
    // 2026-08-30 is a Sunday
    expect(nextSunday(utcDate('2026-08-30'))).toBe('2026-08-30')
  })

  it('returns the coming Sunday for a Monday', () => {
    // 2026-08-31 is a Monday -> next Sunday is 2026-09-06
    expect(nextSunday(utcDate('2026-08-31'))).toBe('2026-09-06')
  })

  it('returns the coming Sunday for a Saturday (1 day away)', () => {
    // 2026-09-05 is a Saturday -> next Sunday is 2026-09-06
    expect(nextSunday(utcDate('2026-09-05'))).toBe('2026-09-06')
  })

  it('returns the coming Sunday for a Wednesday', () => {
    // 2026-09-02 is a Wednesday -> next Sunday is 2026-09-06
    expect(nextSunday(utcDate('2026-09-02'))).toBe('2026-09-06')
  })
})
