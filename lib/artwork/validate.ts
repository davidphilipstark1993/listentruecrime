import { assertSafeExternalUrl } from './ssrf'
import { probeImage } from './image-probe'
import type { ImageValidationResult } from './types'
import { FETCH_TIMEOUT_MS, MAX_DOWNLOAD_BYTES, MIN_ACCEPTABLE_DIMENSION } from './types'

const IMAGE_CONTENT_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])

function invalid(reason: string, extra: Partial<ImageValidationResult> = {}): ImageValidationResult {
  return { valid: false, reason, contentType: null, byteSize: null, width: null, height: null, isSquare: false, ...extra }
}

/**
 * Downloads a candidate artwork URL and verifies it is actually a usable
 * image — never trusts HTTP 200 alone. Enforces a byte cap, request
 * timeout, and SSRF guard since the URL always originates from third-party
 * data (Podcast Index, Apple, RSS feeds, or scraped website markup).
 */
export async function validateArtworkUrl(url: string): Promise<{ result: ImageValidationResult; buffer: Buffer | null }> {
  const safety = await assertSafeExternalUrl(url)
  if (!safety.safe) return { result: invalid(safety.reason ?? 'URL failed safety check'), buffer: null }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'ListenTrueCrime-ArtworkRecovery/1.0' },
    })
  } catch (err) {
    clearTimeout(timeout)
    const message = err instanceof Error && err.name === 'AbortError' ? 'Request timed out' : 'Request failed'
    return { result: invalid(message), buffer: null }
  }

  if (!res.ok) {
    clearTimeout(timeout)
    return { result: invalid(`HTTP ${res.status}`), buffer: null }
  }

  // A redirect could have left the safe scheme/host but landed somewhere
  // unsafe (SSRF via open redirect) — re-check the final URL actually fetched.
  if (res.url && res.url !== url) {
    const finalSafety = await assertSafeExternalUrl(res.url)
    if (!finalSafety.safe) {
      clearTimeout(timeout)
      return { result: invalid(finalSafety.reason ?? 'Redirected to an unsafe URL'), buffer: null }
    }
  }

  const contentType = res.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? null
  const declaredLength = Number(res.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_DOWNLOAD_BYTES) {
    clearTimeout(timeout)
    return { result: invalid(`Declared size ${declaredLength} bytes exceeds ${MAX_DOWNLOAD_BYTES} byte limit`, { contentType }), buffer: null }
  }

  if (!res.body) {
    clearTimeout(timeout)
    return { result: invalid('Response had no body', { contentType }), buffer: null }
  }

  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.length
      if (total > MAX_DOWNLOAD_BYTES) {
        clearTimeout(timeout)
        controller.abort()
        return { result: invalid(`Response exceeds ${MAX_DOWNLOAD_BYTES} byte limit`, { contentType }), buffer: null }
      }
      chunks.push(chunk)
    }
  } catch {
    clearTimeout(timeout)
    return { result: invalid('Download interrupted', { contentType }), buffer: null }
  }
  clearTimeout(timeout)

  const buffer = Buffer.concat(chunks)
  if (buffer.length === 0) return { result: invalid('Response body was empty', { contentType, byteSize: 0 }), buffer: null }

  // Content-Type header is advisory (some CDNs mislabel or omit it, and a
  // "text/html" content type on a 200 usually means an error page was
  // served instead of the image) — the real check is the file's own magic
  // bytes via probeImage, not the header.
  if (contentType && contentType.startsWith('text/html')) {
    return { result: invalid('Server returned an HTML page instead of an image', { contentType, byteSize: buffer.length }), buffer: null }
  }

  const probe = probeImage(buffer)
  if (!probe.format) {
    return { result: invalid('Response is not a recognizable image file', { contentType, byteSize: buffer.length }), buffer: null }
  }
  if (contentType && !IMAGE_CONTENT_TYPES.has(contentType) && !contentType.startsWith('image/')) {
    return { result: invalid(`Unexpected content type: ${contentType}`, { contentType, byteSize: buffer.length }), buffer: null }
  }

  const { width, height } = probe
  if (!width || !height) {
    return { result: invalid('Could not read image dimensions', { contentType, byteSize: buffer.length }), buffer: null }
  }
  if (width < MIN_ACCEPTABLE_DIMENSION || height < MIN_ACCEPTABLE_DIMENSION) {
    return {
      result: invalid(`Image is too small (${width}x${height}, minimum ${MIN_ACCEPTABLE_DIMENSION}x${MIN_ACCEPTABLE_DIMENSION})`, {
        contentType, byteSize: buffer.length, width, height,
      }),
      buffer: null,
    }
  }

  const isSquare = Math.abs(width - height) / Math.max(width, height) < 0.05

  return {
    result: { valid: true, reason: null, contentType, byteSize: buffer.length, width, height, isSquare },
    buffer,
  }
}
