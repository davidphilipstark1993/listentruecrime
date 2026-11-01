import { describe, it, expect } from 'vitest'
import { buildConfirmationHtml, buildConfirmationText } from './newsletter-confirm'

describe('confirmation email copy', () => {
  const link = 'https://www.listentruecrime.com/api/newsletter/confirm?token=abc'

  it('the first email has no reminder wording', () => {
    expect(buildConfirmationText(link)).not.toMatch(/haven't confirmed/)
    expect(buildConfirmationHtml(link)).not.toMatch(/haven't confirmed/)
  })
  it('the reminder says so and still carries the link', () => {
    expect(buildConfirmationText(link, null, true)).toMatch(/haven't confirmed yet/)
    expect(buildConfirmationHtml(link, null, true)).toContain(link)
  })
})
