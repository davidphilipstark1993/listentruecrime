import type { SupabaseClient } from '@supabase/supabase-js'
import type { ImageProbeResult } from './image-probe'

const BUCKET = 'podcast-artwork'

const EXTENSION_BY_FORMAT: Record<NonNullable<ImageProbeResult['format']>, string> = {
  png: 'png',
  jpeg: 'jpg',
  gif: 'gif',
  webp: 'webp',
}

/**
 * Uploads a validated artwork image to the podcast-artwork Supabase Storage
 * bucket under a deterministic filename (podcast-artwork/{podcastId}.{ext})
 * — never derived from the remote URL, so the directory never depends
 * permanently on a third-party CDN staying up, and repeated recovery runs
 * for the same podcast simply overwrite the same object.
 */
export async function cacheArtwork(
  admin: SupabaseClient,
  podcastId: string,
  buffer: Buffer,
  format: NonNullable<ImageProbeResult['format']>,
  contentType: string | null
): Promise<{ url: string } | { error: string }> {
  const extension = EXTENSION_BY_FORMAT[format]
  const path = `${podcastId}.${extension}`

  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: contentType ?? `image/${format === 'jpeg' ? 'jpeg' : format}`,
    upsert: true,
    cacheControl: '3600',
  })

  if (error) return { error: error.message }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  // Cache-bust the CDN/browser cache on every re-check by appending a
  // version query param — the underlying object path never changes.
  return { url: `${data.publicUrl}?v=${Date.now()}` }
}
