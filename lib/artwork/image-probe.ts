export interface ImageProbeResult {
  format: 'png' | 'jpeg' | 'gif' | 'webp' | null
  width: number | null
  height: number | null
}

/**
 * Reads image format + dimensions directly from file-header magic bytes.
 * Deliberately hand-rolled instead of adding an image-parsing dependency —
 * only the four formats podcast artwork actually ships in need supporting,
 * and only enough of each format's header to read width/height.
 */
export function probeImage(buf: Buffer): ImageProbeResult {
  if (isPng(buf)) return { format: 'png', ...readPngSize(buf) }
  if (isGif(buf)) return { format: 'gif', ...readGifSize(buf) }
  if (isJpeg(buf)) return { format: 'jpeg', ...readJpegSize(buf) }
  if (isWebp(buf)) return { format: 'webp', ...readWebpSize(buf) }
  return { format: null, width: null, height: null }
}

function isPng(buf: Buffer): boolean {
  return buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
}

function readPngSize(buf: Buffer): { width: number | null; height: number | null } {
  if (buf.length < 24) return { width: null, height: null }
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

function isGif(buf: Buffer): boolean {
  return buf.length >= 6 && buf.toString('ascii', 0, 3) === 'GIF'
}

function readGifSize(buf: Buffer): { width: number | null; height: number | null } {
  if (buf.length < 10) return { width: null, height: null }
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
}

function isJpeg(buf: Buffer): boolean {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
}

/** JPEG stores dimensions in an SOFn (start-of-frame) marker segment — walk the segment chain to find it. */
function readJpegSize(buf: Buffer): { width: number | null; height: number | null } {
  let offset = 2
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) { offset++; continue }
    const marker = buf[offset + 1]
    const isSofMarker = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
    const segmentLength = buf.readUInt16BE(offset + 2)
    if (isSofMarker) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) }
    }
    offset += 2 + segmentLength
  }
  return { width: null, height: null }
}

function isWebp(buf: Buffer): boolean {
  return buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP'
}

function readWebpSize(buf: Buffer): { width: number | null; height: number | null } {
  if (buf.length < 30) return { width: null, height: null }
  const chunkType = buf.toString('ascii', 12, 16)
  if (chunkType === 'VP8 ') {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
  }
  if (chunkType === 'VP8L') {
    const bits = buf.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunkType === 'VP8X') {
    const width = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1
    const height = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1
    return { width, height }
  }
  return { width: null, height: null }
}
