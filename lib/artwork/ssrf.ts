import dns from 'node:dns/promises'
import net from 'node:net'

const MAX_URL_LENGTH = 2048

/** IPv4/IPv6 ranges that must never be reachable from a server-side fetch of a third-party-supplied URL. */
function isPrivateOrReservedIp(ip: string): boolean {
  const type = net.isIP(ip)
  if (type === 4) {
    const parts = ip.split('.').map(Number)
    const [a, b] = parts
    if (a === 127) return true // loopback
    if (a === 10) return true // private
    if (a === 172 && b >= 16 && b <= 31) return true // private
    if (a === 192 && b === 168) return true // private
    if (a === 169 && b === 254) return true // link-local / cloud metadata (169.254.169.254)
    if (a === 0) return true
    if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
    return false
  }
  if (type === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1') return true // loopback
    if (lower.startsWith('fe80:') || lower.startsWith('fe80::')) return true // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true // unique local
    if (lower.startsWith('::ffff:')) return isPrivateOrReservedIp(lower.replace('::ffff:', ''))
    return false
  }
  return false
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal'])

/**
 * Validates a third-party-supplied artwork URL is safe to fetch server-side:
 * https only, no blocked hostnames, and the hostname doesn't resolve to a
 * private/loopback/link-local IP (blocks SSRF and DNS-rebinding attempts
 * against internal services and cloud metadata endpoints).
 */
export async function assertSafeExternalUrl(rawUrl: string): Promise<{ safe: boolean; reason: string | null }> {
  if (rawUrl.length > MAX_URL_LENGTH) return { safe: false, reason: 'URL exceeds maximum length' }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return { safe: false, reason: 'URL is not well-formed' }
  }

  if (parsed.protocol !== 'https:') return { safe: false, reason: 'Only https URLs are allowed' }

  const hostname = parsed.hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(hostname)) return { safe: false, reason: 'Hostname is blocked' }
  if (net.isIP(hostname) && isPrivateOrReservedIp(hostname)) {
    return { safe: false, reason: 'Hostname resolves to a private/reserved IP' }
  }

  try {
    const records = await dns.lookup(hostname, { all: true })
    if (records.some(r => isPrivateOrReservedIp(r.address))) {
      return { safe: false, reason: 'Hostname resolves to a private/reserved IP' }
    }
  } catch {
    return { safe: false, reason: 'Hostname could not be resolved' }
  }

  return { safe: true, reason: null }
}
