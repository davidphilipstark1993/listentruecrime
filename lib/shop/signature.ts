import { createHmac, timingSafeEqual } from 'crypto'

/** Printify signs the raw body: `X-Pfy-Signature: sha256=<hex HMAC-SHA256(body, secret)>`. */
export function verifyPrintifySignature(raw: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false
  const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex')
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
