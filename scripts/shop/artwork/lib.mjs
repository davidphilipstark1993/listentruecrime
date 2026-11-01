// Shared helpers for the merchandise artwork generator.
// Text is always typeset from real font files (assets/shop-artwork/fonts) and
// measured with resvg, so every slogan is spelled exactly as written and sized
// to a target width. Nothing here uses an image-generation model.
import { Resvg } from '@resvg/resvg-js'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const FONT_DIR = join(HERE, '../../../assets/shop-artwork/fonts')
export const fontFiles = readdirSync(FONT_DIR).filter(f => f.endsWith('.ttf')).map(f => join(FONT_DIR, f))

// Brand palette for black garments: cream type, one restrained dark-red accent.
export const C = { cream: '#EDE6D6', red: '#B3262E', muted: '#9A9382', ink: '#0B0B0D' }

export const FONT = {
  serifBlack: { family: 'Playfair Display', weight: 900, cap: 0.708 },
  serif: { family: 'Playfair Display', weight: 700, cap: 0.708 },
  serifItalic: { family: 'Playfair Display', weight: 700, style: 'italic', cap: 0.708 },
  sans: { family: 'Inter', weight: 700, cap: 0.727 },
  sansMedium: { family: 'Inter', weight: 500, cap: 0.727 },
  type: { family: 'Courier Prime', weight: 700, cap: 0.6 },
  typeLight: { family: 'Courier Prime', weight: 400, cap: 0.6 },
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const attrs = (f, size, ls) =>
  `font-family="${f.family}" font-weight="${f.weight}" ${f.style ? `font-style="${f.style}"` : ''} font-size="${size}" letter-spacing="${ls}"`

const widthCache = new Map()
/** Width of `text` set at 100px, measured by rendering it. */
function measure100(text, f, lsEm) {
  const key = `${text}|${f.family}|${f.weight}|${f.style ?? ''}|${lsEm}`
  if (widthCache.has(key)) return widthCache.get(key)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="400"><text x="0" y="250" ${attrs(f, 100, lsEm * 100)} fill="#000">${esc(text)}</text></svg>`
  const r = new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: f.family } })
  const b = r.getBBox()
  const w = b ? b.width : 0
  widthCache.set(key, w)
  return w
}

/**
 * A line of text centred on cx, sized so it is `w` wide, with its cap-top at y.
 * Returns { svg, h, size } where h is the cap height (all slogans are upper-case).
 */
export function fit(text, { cx = 500, y = 0, w, font = FONT.serifBlack, ls = 0.02, fill = C.cream, size, anchor = 'middle', x }) {
  const per100 = measure100(text, font, ls)
  const fs = size ?? (100 * w) / per100
  const h = font.cap * fs
  const px = x ?? cx
  return {
    svg: `<text x="${px}" y="${(y + h).toFixed(1)}" text-anchor="${anchor}" ${attrs(font, fs.toFixed(2), (ls * fs).toFixed(2))} fill="${fill}">${esc(text)}</text>`,
    h,
    size: fs,
    w: (per100 * fs) / 100,
  }
}

export const rule = (x1, x2, y, { stroke = C.cream, sw = 3, dash } = {}) =>
  `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${stroke}" stroke-width="${sw}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`

export const rect = (x, y, w, h, { fill = 'none', stroke, sw = 3, rx = 0, rot, cx, cy } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${stroke ? `stroke="${stroke}" stroke-width="${sw}"` : ''} ${rot ? `transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`

/** Stack items top to bottom. Each item is {svg, h} or a number (gap). Returns {svg, h}. */
export function stack(items, y0 = 0) {
  let y = y0
  const out = []
  for (const it of items) {
    if (typeof it === 'number') { y += it; continue }
    out.push(typeof it.build === 'function' ? it.build(y) : it.svg.replace(/__Y__/g, y))
    y += it.h
  }
  return { svg: out.join('\n'), h: y - y0 }
}

/** A text item for stack(): placed when the running y is known. */
export const line = (text, opts) => {
  const probe = fit(text, { ...opts, y: 0 })
  return { h: probe.h, build: y => fit(text, { ...opts, y }).svg, w: probe.w }
}

/**
 * Render a composition (svg body in a 1000-wide design space) to a tightly
 * cropped, transparent PNG whose width is `pxWidth`.
 */
export function renderDesign(body, { pxWidth = 3600, pad = 0 } = {}) {
  const big = 4000
  const wrap = (vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${big}" height="${big}">${body}</svg>`
  const probe = new Resvg(wrap('-1500 -1500 4000 4000'), { font: { fontFiles, loadSystemFonts: false } })
  const b = probe.getBBox()
  if (!b) throw new Error('empty design')
  const vb = [b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" width="${vb[2]}" height="${vb[3]}">${body}</svg>`
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: pxWidth }, font: { fontFiles, loadSystemFonts: false } })
  const img = r.render()
  return { png: img.asPng(), width: img.width, height: img.height, svg, aspect: vb[3] / vb[2] }
}
