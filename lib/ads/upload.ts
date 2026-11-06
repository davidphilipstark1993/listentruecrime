import { probeImage } from '@/lib/artwork/image-probe'
import { AD_IMAGE_LIMITS } from './config'

const EXT: Record<'jpeg' | 'png' | 'webp', { ext: 'jpg' | 'png' | 'webp'; contentType: string }> = {
  jpeg: { ext: 'jpg', contentType: 'image/jpeg' },
  png: { ext: 'png', contentType: 'image/png' },
  webp: { ext: 'webp', contentType: 'image/webp' },
}

export type AdImageCheck =
  | { ok: true; ext: 'jpg' | 'png' | 'webp'; contentType: string; width: number; height: number }
  | { ok: false; error: string }

/**
 * Validates an uploaded file by its actual bytes, never its filename or the
 * browser-declared type (both are attacker-controlled). SVG and GIF are
 * refused: SVG can carry script, and animated GIFs are heavy and distracting.
 */
export function validateAdImage(buffer: Buffer): AdImageCheck {
  const { maxBytes, minWidth, minHeight, maxDimension } = AD_IMAGE_LIMITS
  if (buffer.length === 0) return { ok: false, error: 'That file is empty.' }
  if (buffer.length > maxBytes) {
    return { ok: false, error: `That image is ${(buffer.length / 1024 / 1024).toFixed(1)} MB. The limit is ${maxBytes / 1024 / 1024} MB — export it at a smaller size or as JPEG/WebP.` }
  }

  const probe = probeImage(buffer)
  if (probe.format !== 'jpeg' && probe.format !== 'png' && probe.format !== 'webp') {
    return { ok: false, error: 'Upload a JPEG, PNG or WebP image.' }
  }
  if (!probe.width || !probe.height) return { ok: false, error: 'Could not read the image size. Try re-exporting it.' }
  if (probe.width < minWidth || probe.height < minHeight) {
    return { ok: false, error: `The image is ${probe.width} × ${probe.height} px. It needs to be at least ${minWidth} × ${minHeight} px (1600 × 900 recommended).` }
  }
  if (probe.width > maxDimension || probe.height > maxDimension) {
    return { ok: false, error: `The image is too large (${probe.width} × ${probe.height} px). Keep each side under ${maxDimension} px.` }
  }
  return { ok: true, ...EXT[probe.format], width: probe.width, height: probe.height }
}
