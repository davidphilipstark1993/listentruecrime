#!/usr/bin/env node
/**
 * Original illustrated artwork for blog posts (cover + in-article scene),
 * plus shared section art. Everything is drawn from simple SVG shapes in the
 * site palette, so there are no third-party images, posters or likenesses of
 * real people. Rendered to JPEG with the pre-installed Playwright Chromium;
 * next/image serves optimised WebP/AVIF from these at request time.
 *
 *   node scripts/blog-art/generate.mjs            # all artwork
 *   node scripts/blog-art/generate.mjs karen-read # one set (slug prefix match)
 *
 * Output: public/images/blog/<slug>/{cover,scene}.jpg and
 *         public/images/blog/shared/{documentary,podcasts}.jpg
 */
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const OUT = path.resolve('public/images/blog')
const C = {
  ink950: '#050507', ink900: '#0a0a0f', ink800: '#111118', ink700: '#1a1a23', ink600: '#24242f', ink500: '#2e2e3d',
  stone: '#f2f2f5', muted: '#9ca3af', subtle: '#6b7280',
  crimson: '#be123c', crimsonDeep: '#7f0d29', gold: '#d97706', goldLight: '#fbbf24',
}

// ---------- helpers ----------
function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}
const f = n => Math.round(n * 10) / 10

function frame(w, h, inner, { kicker, sky = [C.ink950, C.ink700], glow = { x: 0.7, y: 0.25, r: 0.6, c: C.crimson, o: 0.18 } } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <radialGradient id="glow" cx="${glow.x}" cy="${glow.y}" r="${glow.r}"><stop offset="0" stop-color="${glow.c}" stop-opacity="${glow.o}"/><stop offset="1" stop-color="${glow.c}" stop-opacity="0"/></radialGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.65"/></radialGradient>
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.05 0"/></filter>
    <filter id="blur4"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="blur12"><feGaussianBlur stdDeviation="12"/></filter>
    <filter id="blur30"><feGaussianBlur stdDeviation="30"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${inner}
  <rect width="${w}" height="${h}" fill="url(#vig)"/>
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
  ${kicker ? `<g font-family="DejaVu Sans, Arial, sans-serif" font-weight="700" letter-spacing="6">
    <rect x="64" y="${h - 96}" width="44" height="3" fill="${C.crimson}"/>
    <text x="64" y="${h - 58}" font-size="26" fill="${C.stone}" fill-opacity="0.92">${kicker}</text>
    <text x="${w - 64}" y="${h - 58}" font-size="18" fill="${C.muted}" text-anchor="end" letter-spacing="4">LISTENTRUECRIME</text>
  </g>` : ''}
</svg>`
}

function stars(w, h, n, seed, maxY = 0.55) {
  const r = rng(seed); let s = ''
  for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * w)}" cy="${f(r() * h * maxY)}" r="${f(0.6 + r() * 1.4)}" fill="#fff" opacity="${f(0.15 + r() * 0.55)}"/>`
  return s
}
function moon(x, y, r, c = '#e8e6df') {
  return `<circle cx="${x}" cy="${y}" r="${r * 3}" fill="${c}" opacity="0.06" filter="url(#blur30)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="0.9"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.15}" r="${r * 0.95}" fill="${C.ink900}" opacity="0.18"/>`
}
function snow(w, h, n, seed) {
  const r = rng(seed); let s = ''
  for (let i = 0; i < n; i++) { const big = r() > 0.85; s += `<circle cx="${f(r() * w)}" cy="${f(r() * h)}" r="${f(big ? 2.5 + r() * 2.5 : 0.8 + r() * 1.4)}" fill="#fff" opacity="${f(big ? 0.25 : 0.35 + r() * 0.4)}" ${big ? 'filter="url(#blur4)"' : ''}/>` }
  return s
}
function ridge(w, h, base, amp, seed, fill, opacity = 1, step = 40) {
  const r = rng(seed); let d = `M0 ${h} L0 ${base}`; let y = base
  for (let x = 0; x <= w + step; x += step) { y = Math.max(base - amp, Math.min(base + amp * 0.3, y + (r() - 0.5) * amp * 0.5)); d += ` L${x} ${f(y)}` }
  return `<path d="${d} L${w} ${h} Z" fill="${fill}" opacity="${opacity}"/>`
}
function houses(w, ground, seed, { lit = 0.35, fill = C.ink900, scale = 1 } = {}) {
  const r = rng(seed); let s = ''; let x = -20
  while (x < w) {
    const bw = (110 + r() * 120) * scale, bh = (70 + r() * 60) * scale, roof = (40 + r() * 35) * scale
    s += `<path d="M${f(x)} ${ground} V${f(ground - bh)} L${f(x + bw / 2)} ${f(ground - bh - roof)} L${f(x + bw)} ${f(ground - bh)} V${ground} Z" fill="${fill}"/>`
    const cols = Math.max(1, Math.floor(bw / (45 * scale)))
    for (let c = 0; c < cols; c++) if (r() < lit) {
      const wx = x + 18 * scale + c * (bw - 36 * scale) / Math.max(1, cols - 0.0001) * (cols > 1 ? (1 - 1 / cols) : 0), wy = ground - bh + 22 * scale
      s += `<rect x="${f(wx)}" y="${f(wy)}" width="${f(16 * scale)}" height="${f(22 * scale)}" fill="${C.goldLight}" opacity="0.75"/><rect x="${f(wx - 10)}" y="${f(wy - 10)}" width="${f(36 * scale)}" height="${f(42 * scale)}" fill="${C.gold}" opacity="0.12" filter="url(#blur12)"/>`
    }
    x += bw + (8 + r() * 40) * scale
  }
  return s
}
function towerBlock(x, y, bw, bh, rows, cols, seed, litP = 0.45, warm = true) {
  const r = rng(seed); let s = `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${C.ink800}"/>`
  const gx = bw / cols, gy = bh / rows
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const on = r() < litP; const col = on ? (warm ? '#fde68a' : '#cbd5e1') : C.ink600
    s += `<rect x="${f(x + j * gx + gx * 0.22)}" y="${f(y + i * gy + gy * 0.25)}" width="${f(gx * 0.56)}" height="${f(gy * 0.5)}" fill="${col}" opacity="${on ? 0.7 : 0.6}"/>`
  }
  return s
}
function palm(x, ground, hgt, fill = C.ink950, flip = 1) {
  const top = ground - hgt; const lean = 60 * flip
  let s = `<path d="M${x} ${ground} C ${x + lean * 0.2} ${ground - hgt * 0.4}, ${x + lean * 0.7} ${ground - hgt * 0.8}, ${x + lean} ${top}" stroke="${fill}" stroke-width="14" fill="none" stroke-linecap="round"/>`
  const fronds = [[-1, -0.2], [-0.8, 0.35], [-0.3, 0.7], [0.3, 0.75], [0.8, 0.4], [1, -0.15], [0.05, -0.6]]
  for (const [dx, dy] of fronds) {
    const ex = x + lean + dx * 150, ey = top + dy * 90 + 40
    s += `<path d="M${x + lean} ${top} Q ${x + lean + dx * 90} ${top - 50 + dy * 20}, ${f(ex)} ${f(ey)}" stroke="${fill}" stroke-width="10" fill="none" stroke-linecap="round"/>`
  }
  return s
}
function waves(w, y0, rows, seed, color = '#94a3b8') {
  const r = rng(seed); let s = ''
  for (let i = 0; i < rows; i++) {
    const y = y0 + i * (10 + i * 2.2); let d = `M0 ${f(y)}`
    for (let x = 0; x <= w; x += 60) d += ` Q ${x + 30} ${f(y - 4 - r() * 4)}, ${x + 60} ${f(y)}`
    s += `<path d="${d}" stroke="${color}" stroke-width="${f(1 + i * 0.12)}" fill="none" opacity="${f(0.08 + (i / rows) * 0.18)}"/>`
  }
  return s
}
function moonPath(x, y0, y1, w0, w1, c = '#f8fafc') {
  return `<path d="M${x - w0} ${y0} L${x + w0} ${y0} L${x + w1} ${y1} L${x - w1} ${y1} Z" fill="${c}" opacity="0.08" filter="url(#blur12)"/>`
}
function road(w, h, horizonY, { lines = true, edge = '#64748b' } = {}) {
  const cx = w / 2
  let s = `<path d="M${cx - 30} ${horizonY} L${cx + 30} ${horizonY} L${w * 0.95} ${h} L${w * 0.05} ${h} Z" fill="${C.ink800}"/>`
  s += `<path d="M${cx - 30} ${horizonY} L${w * 0.05} ${h}" stroke="${edge}" stroke-width="3" opacity="0.5"/><path d="M${cx + 30} ${horizonY} L${w * 0.95} ${h}" stroke="${edge}" stroke-width="3" opacity="0.5"/>`
  if (lines) for (let i = 0; i < 7; i++) { const t0 = Math.pow(i / 7, 1.8), t1 = Math.pow((i + 0.45) / 7, 1.8); const y0 = horizonY + (h - horizonY) * t0, y1 = horizonY + (h - horizonY) * t1; s += `<path d="M${cx} ${f(y0)} L${cx} ${f(y1)}" stroke="${C.goldLight}" stroke-width="${f(2 + t1 * 14)}" opacity="0.55"/>` }
  return s
}
function lightTrails(w, h, horizonY, seed, colors) {
  const r = rng(seed); let s = ''
  for (let i = 0; i < 10; i++) {
    const c = colors[i % colors.length]; const off = (r() - 0.5) * 120; const end = (i % 2 ? 1 : -1) * (w * (0.15 + r() * 0.35))
    s += `<path d="M${w / 2 + off * 0.2} ${horizonY + 4} Q ${w / 2 + off} ${horizonY + (h - horizonY) * 0.4}, ${w / 2 + end} ${h + 20}" stroke="${c}" stroke-width="${f(2 + r() * 5)}" fill="none" opacity="${f(0.35 + r() * 0.4)}"/>`
    s += `<path d="M${w / 2 + off * 0.2} ${horizonY + 4} Q ${w / 2 + off} ${horizonY + (h - horizonY) * 0.4}, ${w / 2 + end} ${h + 20}" stroke="${c}" stroke-width="14" fill="none" opacity="0.12" filter="url(#blur12)"/>`
  }
  return s
}
function bokeh(w, h, n, seed, colors, yMin = 0, yMax = 1) {
  const r = rng(seed); let s = ''
  for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * w)}" cy="${f(h * (yMin + r() * (yMax - yMin)))}" r="${f(14 + r() * 46)}" fill="${colors[Math.floor(r() * colors.length)]}" opacity="${f(0.08 + r() * 0.22)}" filter="url(#blur4)"/>`
  return s
}
function rainStreaks(w, h, n, seed) {
  const r = rng(seed); let s = ''
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, l = 20 + r() * 50; s += `<path d="M${f(x)} ${f(y)} l${f(-l * 0.12)} ${f(l)}" stroke="#cbd5e1" stroke-width="${f(0.8 + r())}" opacity="${f(0.08 + r() * 0.2)}"/>` }
  return s
}
function streetLamp(x, ground, hgt, c = C.goldLight) {
  return `<path d="M${x} ${ground} V${ground - hgt} q0 -24 26 -24 h30" stroke="${C.ink950}" stroke-width="9" fill="none"/><circle cx="${x + 58}" cy="${ground - hgt - 18}" r="70" fill="${c}" opacity="0.18" filter="url(#blur30)"/><rect x="${x + 44}" y="${ground - hgt - 22}" width="30" height="9" rx="3" fill="${c}" opacity="0.95"/><path d="M${x + 44} ${ground - hgt - 13} L${x - 80} ${ground} L${x + 200} ${ground} L${x + 74} ${ground - hgt - 13} Z" fill="${c}" opacity="0.05"/>`
}

// ---------- case scenes ----------
const SETS = {
  'karen-read-case-netflix-documentary-podcasts': {
    kicker: 'THE KAREN READ CASE',
    cover: (w, h) => frame(w, h, `${stars(w, h, 40, 2, 0.4)}
      ${ridge(w, h, h * 0.58, 50, 7, C.ink800, 0.9)}
      ${houses(w, h * 0.74, 11, { lit: 0.45, fill: C.ink900 })}
      <rect y="${h * 0.74}" width="${w}" height="${h * 0.26}" fill="#cbd5e1" opacity="0.09"/>
      <path d="M0 ${h * 0.86} Q ${w * 0.4} ${h * 0.8}, ${w} ${h * 0.88} L${w} ${h} L0 ${h} Z" fill="#e2e8f0" opacity="0.07"/>
      ${streetLamp(w * 0.18, h * 0.82, 260)}
      ${snow(w, h, 420, 5)}`, { kicker: 'THE KAREN READ CASE', sky: ['#05060a', '#1b2030'], glow: { x: 0.2, y: 0.35, r: 0.5, c: C.goldLight, o: 0.1 } }),
    scene: (w, h) => {
      const r = rng(31); let shards = ''
      for (let i = 0; i < 9; i++) { const x = w * (0.38 + r() * 0.28), y = h * (0.58 + r() * 0.25), s = 14 + r() * 34, a = r() * 180; shards += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a)})"><path d="M0 0 L${f(s)} ${f(s * 0.3)} L${f(s * 0.6)} ${f(s * 0.9)} Z" fill="${C.crimson}" opacity="0.9"/><path d="M0 0 L${f(s)} ${f(s * 0.3)} L${f(s * 0.6)} ${f(s * 0.9)} Z" fill="#fb7185" opacity="0.25" filter="url(#blur4)"/></g>` }
      return frame(w, h, `<rect y="${h * 0.45}" width="${w}" height="${h * 0.55}" fill="#e2e8f0" opacity="0.1"/>
        <path d="M${w * 0.1} ${h} C ${w * 0.3} ${h * 0.7}, ${w * 0.55} ${h * 0.55}, ${w} ${h * 0.5}" stroke="${C.ink900}" stroke-width="46" fill="none" opacity="0.55"/>
        <path d="M${w * 0.18} ${h} C ${w * 0.38} ${h * 0.72}, ${w * 0.6} ${h * 0.6}, ${w} ${h * 0.57}" stroke="${C.ink900}" stroke-width="46" fill="none" opacity="0.45"/>
        <circle cx="${w * 0.52}" cy="${h * 0.7}" r="180" fill="${C.crimson}" opacity="0.12" filter="url(#blur30)"/>
        ${shards}${snow(w, h, 300, 9)}`, { sky: ['#070810', '#1e2433'], glow: { x: 0.5, y: 0.7, r: 0.45, c: C.crimson, o: 0.2 } })
    },
    alt: 'Illustration of a snowy suburban street at night under a single street lamp',
    sceneAlt: 'Illustration of shards of red taillight plastic scattered on snow',
  },
  'the-investigation-of-lucy-letby-netflix-documentary': {
    cover: (w, h) => frame(w, h, `${stars(w, h, 30, 3, 0.35)}
      ${towerBlock(w * 0.16, h * 0.34, w * 0.42, h * 0.46, 6, 11, 21, 0.4, false)}
      ${towerBlock(w * 0.58, h * 0.44, w * 0.26, h * 0.36, 4, 6, 22, 0.35, false)}
      <rect x="${w * 0.16}" y="${h * 0.8}" width="${w * 0.68}" height="${h * 0.2}" fill="${C.ink900}"/>
      <rect x="0" y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="${C.ink950}"/>
      ${streetLamp(w * 0.86, h * 0.8, 230, '#e2e8f0')}
      <circle cx="${w * 0.37}" cy="${h * 0.55}" r="260" fill="#93c5fd" opacity="0.05" filter="url(#blur30)"/>`, { kicker: 'THE LUCY LETBY CASE', sky: ['#04050a', '#161b29'], glow: { x: 0.4, y: 0.4, r: 0.6, c: '#60a5fa', o: 0.08 } }),
    scene: (w, h) => {
      let files = ''
      const r = rng(44)
      for (let i = 0; i < 7; i++) { const y = h * 0.78 - i * 26, x = w * 0.3 + (r() - 0.5) * 30, ww = w * 0.36; files += `<rect x="${f(x)}" y="${f(y)}" width="${f(ww)}" height="22" rx="3" fill="${i % 2 ? '#d6c9a8' : '#c4b48f'}" opacity="0.85"/><rect x="${f(x + ww * 0.08)}" y="${f(y - 6)}" width="${f(ww * 0.18)}" height="10" rx="2" fill="${i % 3 ? '#c4b48f' : C.crimson}" opacity="0.8"/>` }
      return frame(w, h, `<rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="${C.ink800}"/>
        <path d="M${w * 0.7} ${h * 0.8} L${w * 0.74} ${h * 0.34} L${w * 0.82} ${h * 0.3}" stroke="${C.ink500}" stroke-width="10" fill="none"/>
        <path d="M${w * 0.78} ${h * 0.27} L${w * 0.9} ${h * 0.33} L${w * 0.84} ${h * 0.41} Z" fill="${C.ink500}"/>
        <path d="M${w * 0.82} ${h * 0.38} L${w * 0.45} ${h * 0.8} L${w * 0.95} ${h * 0.8} Z" fill="${C.goldLight}" opacity="0.07"/>
        <circle cx="${w * 0.84}" cy="${h * 0.4}" r="120" fill="${C.goldLight}" opacity="0.14" filter="url(#blur30)"/>
        ${files}`, { sky: ['#06070b', '#14161f'], glow: { x: 0.75, y: 0.45, r: 0.5, c: C.goldLight, o: 0.1 } })
    },
    alt: 'Illustration of a hospital building at night with some windows lit',
    sceneAlt: 'Illustration of a stack of case files under a desk lamp',
  },
  'natalee-holloway-case-netflix-documentary-podcasts': {
    cover: (w, h) => frame(w, h, `${stars(w, h, 120, 4, 0.5)}${moon(w * 0.72, h * 0.22, 46)}
      <rect y="${h * 0.56}" width="${w}" height="${h * 0.44}" fill="#0c1424"/>
      ${moonPath(w * 0.72, h * 0.56, h * 0.95, 20, 120)}
      ${waves(w, h * 0.58, 16, 8)}
      <path d="M0 ${h * 0.86} Q ${w * 0.5} ${h * 0.78}, ${w} ${h * 0.9} L${w} ${h} L0 ${h} Z" fill="#2a2a33"/>
      ${palm(w * 0.12, h * 0.9, 380, C.ink950, 1)}${palm(w * 0.9, h * 0.92, 300, C.ink950, -1)}`, { kicker: 'THE NATALEE HOLLOWAY CASE', sky: ['#03050b', '#121a2c'], glow: { x: 0.72, y: 0.22, r: 0.4, c: '#e0e7ff', o: 0.08 } }),
    scene: (w, h) => {
      const r = rng(61); let steps = ''
      for (let i = 0; i < 12; i++) { const t = i / 12, x = w * (0.2 + t * 0.6) + (i % 2 ? 18 : -18), y = h * (0.92 - t * 0.32), s = 1 - t * 0.6; steps += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(13 * s)}" ry="${f(6 * s)}" fill="#0b0b10" opacity="${f(0.55 - t * 0.3)}"/>` }
      return frame(w, h, `${stars(w, h, 60, 12, 0.4)}<rect y="${h * 0.35}" width="${w}" height="${h * 0.25}" fill="#0c1424"/>${waves(w, h * 0.37, 10, 13)}
        <path d="M0 ${h * 0.6} Q ${w * 0.3} ${h * 0.55}, ${w * 0.6} ${h * 0.6} T ${w} ${h * 0.58} L${w} ${h} L0 ${h} Z" fill="#3a3530"/>
        <path d="M0 ${h * 0.6} Q ${w * 0.3} ${h * 0.55}, ${w * 0.6} ${h * 0.6} T ${w} ${h * 0.58}" stroke="#e2e8f0" stroke-width="3" fill="none" opacity="0.25"/>
        ${steps}`, { sky: ['#03050b', '#101828'], glow: { x: 0.5, y: 0.1, r: 0.5, c: '#c7d2fe', o: 0.08 } })
    },
    alt: 'Illustration of a moonlit Caribbean shoreline at night framed by palm trees',
    sceneAlt: 'Illustration of footprints leading along a beach at night',
  },
  'pamela-smart-case-netflix-documentary-podcasts': {
    cover: (w, h) => {
      let lines = ''; for (let y = h * 0.2; y < h * 0.72; y += 6) lines += `<rect x="${w * 0.27}" y="${f(y)}" width="${w * 0.46}" height="2" fill="#000" opacity="0.25"/>`
      return frame(w, h, `<rect x="${w * 0.22}" y="${h * 0.14}" width="${w * 0.56}" height="${h * 0.64}" rx="36" fill="#1f1f27"/>
        <rect x="${w * 0.27}" y="${h * 0.2}" width="${w * 0.46}" height="${h * 0.52}" rx="22" fill="#24324a"/>
        <rect x="${w * 0.27}" y="${h * 0.2}" width="${w * 0.46}" height="${h * 0.52}" rx="22" fill="url(#glow)"/>
        <g opacity="0.9"><rect x="${w * 0.33}" y="${h * 0.5}" width="${w * 0.34}" height="${h * 0.08}" fill="#3b2f24"/><rect x="${w * 0.44}" y="${h * 0.36}" width="${w * 0.12}" height="${h * 0.14}" fill="#4a3a2b"/><circle cx="${w * 0.5}" cy="${h * 0.32}" r="${h * 0.04}" fill="#2a2a33"/></g>
        ${lines}
        <circle cx="${w * 0.5}" cy="${h * 0.46}" r="300" fill="#93c5fd" opacity="0.06" filter="url(#blur30)"/>
        <rect x="${w * 0.3}" y="${h * 0.78}" width="${w * 0.4}" height="${h * 0.04}" fill="#15151c"/>
        <circle cx="${w * 0.7}" cy="${h * 0.24}" r="8" fill="${C.crimson}"/>`, { kicker: 'THE PAMELA SMART CASE', sky: ['#060609', '#15151f'], glow: { x: 0.5, y: 0.45, r: 0.45, c: '#60a5fa', o: 0.18 } })
    },
    scene: (w, h) => frame(w, h, `<rect y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="${C.ink800}"/>
      <g fill="#2b2b35"><rect x="${w * 0.18}" y="${h * 0.42}" width="${w * 0.22}" height="${h * 0.14}" rx="14"/><rect x="${w * 0.36}" y="${h * 0.45}" width="${w * 0.08}" height="${h * 0.08}" rx="6"/><circle cx="${w * 0.47}" cy="${h * 0.49}" r="${h * 0.06}" fill="#1a1a22" stroke="#3a3a46" stroke-width="8"/><rect x="${w * 0.27}" y="${h * 0.56}" width="14" height="${h * 0.14}"/><path d="M${w * 0.28} ${h * 0.7} L${w * 0.2} ${h * 0.9} M${w * 0.28} ${h * 0.7} L${w * 0.36} ${h * 0.9} M${w * 0.28} ${h * 0.7} L${w * 0.28} ${h * 0.92}" stroke="#2b2b35" stroke-width="10"/></g>
      <circle cx="${w * 0.22}" cy="${h * 0.46}" r="7" fill="${C.crimson}"/>
      <path d="M${w * 0.52} ${h * 0.49} L${w} ${h * 0.25} L${w} ${h * 0.75} Z" fill="#93c5fd" opacity="0.06"/>
      ${towerBlock(w * 0.62, h * 0.38, w * 0.3, h * 0.32, 3, 7, 70, 0.1)}`, { sky: ['#06060a', '#14141d'], glow: { x: 0.75, y: 0.5, r: 0.5, c: '#60a5fa', o: 0.1 } }),
    alt: 'Illustration of an old television set showing a courtroom, evoking the first televised murder trials',
    sceneAlt: 'Illustration of a 1990s news camera on a tripod pointed at a courtroom',
  },
  'elizabeth-smart-kidnapped-netflix-documentary-podcasts': {
    cover: (w, h) => frame(w, h, `${stars(w, h, 90, 6, 0.45)}
      ${ridge(w, h, h * 0.5, 160, 3, '#1c2236', 1, 60)}${ridge(w, h, h * 0.62, 110, 9, '#141826', 1, 50)}
      <rect y="${h * 0.78}" width="${w}" height="${h * 0.22}" fill="${C.ink900}"/>
      ${houses(w, h * 0.82, 17, { lit: 0.3, fill: C.ink950, scale: 0.7 })}`, { kicker: 'THE ELIZABETH SMART CASE', sky: ['#04050b', '#1a2033'], glow: { x: 0.5, y: 0.2, r: 0.6, c: '#a5b4fc', o: 0.08 } }),
    scene: (w, h) => frame(w, h, `${ridge(w, h, h * 0.55, 150, 23, '#3a2f3f', 1, 60)}${ridge(w, h, h * 0.68, 90, 24, '#241d2a', 1, 50)}
      <circle cx="${w * 0.62}" cy="${h * 0.56}" r="70" fill="${C.goldLight}" opacity="0.85"/><circle cx="${w * 0.62}" cy="${h * 0.56}" r="260" fill="${C.gold}" opacity="0.18" filter="url(#blur30)"/>
      ${ridge(w, h, h * 0.62, 120, 25, '#2d2433', 1, 60)}<rect y="${h * 0.85}" width="${w}" height="${h * 0.15}" fill="#17131b"/>`, { sky: ['#1b1630', '#7c3a3a'], glow: { x: 0.62, y: 0.6, r: 0.6, c: C.goldLight, o: 0.25 } }),
    alt: 'Illustration of mountains above a quiet neighbourhood at night',
    sceneAlt: 'Illustration of the sun rising over a mountain range',
  },
  'moriah-wilson-case-netflix-documentary-podcasts': {
    cover: (w, h) => {
      const R = h * 0.17, gy = h * 0.8 - R - 6, x1 = w * 0.5, x2 = w * 0.5 + R * 2.5
      const wheel = (cx) => { let sp = ''; for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; sp += `<line x1="${cx}" y1="${gy}" x2="${f(cx + Math.cos(a) * R)}" y2="${f(gy + Math.sin(a) * R)}" stroke="#94a3b8" stroke-width="1.5" opacity="0.45"/>` } return `<circle cx="${cx}" cy="${gy}" r="${R}" fill="none" stroke="#0b0b10" stroke-width="16"/><circle cx="${cx}" cy="${gy}" r="${R - 4}" fill="none" stroke="#94a3b8" stroke-width="3" opacity="0.55"/>${sp}<circle cx="${cx}" cy="${gy}" r="9" fill="#94a3b8"/>` }
      const bb = { x: x1 + R * 1.15, y: gy }, seat = { x: x1 + R * 0.75, y: gy - R * 1.25 }, head = { x: x2 - R * 0.3, y: gy - R * 1.2 }
      const frameLines = `<path d="M${x1} ${gy} L${f(bb.x)} ${f(bb.y)} L${f(seat.x)} ${f(seat.y)} Z M${f(seat.x)} ${f(seat.y)} L${f(head.x)} ${f(head.y)} L${f(bb.x)} ${f(bb.y)} M${f(head.x)} ${f(head.y)} L${x2} ${gy}" stroke="#cbd5e1" stroke-width="9" fill="none" stroke-linejoin="round" opacity="0.85"/>`
      const extras = `<path d="M${f(seat.x - 30)} ${f(seat.y - 14)} h60" stroke="#cbd5e1" stroke-width="10" stroke-linecap="round" opacity="0.85"/><path d="M${f(head.x)} ${f(head.y)} l-6 -28 q30 -8 40 14" stroke="#cbd5e1" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.85"/><circle cx="${f(bb.x)}" cy="${f(bb.y)}" r="18" fill="none" stroke="#cbd5e1" stroke-width="6" opacity="0.8"/>`
      return frame(w, h, `${towerBlock(w * 0.05, h * 0.3, w * 0.1, h * 0.5, 8, 3, 80, 0.4)}${towerBlock(w * 0.17, h * 0.42, w * 0.08, h * 0.38, 6, 2, 81, 0.5)}${towerBlock(w * 0.86, h * 0.36, w * 0.1, h * 0.44, 7, 3, 82, 0.4)}
        <rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="${C.ink900}"/>
        <circle cx="${w * 0.62}" cy="${gy}" r="320" fill="${C.gold}" opacity="0.14" filter="url(#blur30)"/>
        ${wheel(x1)}${wheel(x2)}${frameLines}${extras}
        <path d="M0 ${h * 0.88} L${w} ${h * 0.88}" stroke="${C.goldLight}" stroke-width="4" stroke-dasharray="40 30" opacity="0.4"/>`, { kicker: 'THE MORIAH WILSON CASE', sky: ['#120d1c', '#5a2a2e'], glow: { x: 0.2, y: 0.85, r: 0.6, c: C.gold, o: 0.25 } })
    },
    scene: (w, h) => frame(w, h, `${ridge(w, h, h * 0.7, 40, 41, '#1d1622', 1, 40)}
      ${road(w, h, h * 0.62)}
      <circle cx="${w * 0.5}" cy="${h * 0.6}" r="60" fill="${C.goldLight}" opacity="0.9"/><circle cx="${w * 0.5}" cy="${h * 0.6}" r="300" fill="${C.gold}" opacity="0.2" filter="url(#blur30)"/>
      ${ridge(w, h, h * 0.66, 30, 42, '#140f18', 1, 40)}`, { sky: ['#1d1430', '#9a4a2e'], glow: { x: 0.5, y: 0.6, r: 0.6, c: C.goldLight, o: 0.25 } }),
    alt: 'Illustration of a bicycle wheel against a city skyline at dusk',
    sceneAlt: 'Illustration of an open road leading towards a setting sun',
  },
  'taylor-parker-case-maternal-instinct-netflix-documentary-podcasts': {
    cover: (w, h) => frame(w, h, `${stars(w, h, 50, 14, 0.35)}
      ${ridge(w, h, h * 0.66, 20, 51, '#18141c', 1, 40)}
      ${road(w, h, h * 0.64, { lines: true })}
      <g><rect x="${w * 0.78}" y="${h * 0.5}" width="12" height="${h * 0.22}" fill="${C.ink950}"/><rect x="${w * 0.76}" y="${h * 0.46}" width="${w * 0.05}" height="${h * 0.06}" rx="10" fill="${C.ink950}"/></g>
      <g transform="translate(${w * 0.18} ${h * 0.3})"><rect x="40" y="70" width="8" height="${h * 0.34}" fill="${C.ink950}"/><rect x="88" y="70" width="8" height="${h * 0.34}" fill="${C.ink950}"/><ellipse cx="68" cy="50" rx="70" ry="44" fill="${C.ink950}"/></g>`, { kicker: 'THE TAYLOR PARKER CASE', sky: ['#0d0a16', '#4a2638'], glow: { x: 0.5, y: 0.66, r: 0.5, c: '#f59e0b', o: 0.2 } }),
    scene: (w, h) => frame(w, h, `<rect y="${h * 0.7}" width="${w}" height="${h * 0.3}" fill="#1a1416"/>
      ${ridge(w, h, h * 0.7, 18, 52, '#1d171c', 1, 30)}
      ${(() => { let s = ''; for (let i = 0; i < 9; i++) { const x = w * (0.05 + i * 0.11); s += `<rect x="${f(x)}" y="${h * 0.62}" width="6" height="${h * 0.12}" fill="#0b0a0d"/>` } s += `<path d="M0 ${h * 0.65} L${w} ${h * 0.65} M0 ${h * 0.69} L${w} ${h * 0.69}" stroke="#0b0a0d" stroke-width="3"/>`; return s })()}
      ${stars(w, h, 40, 53, 0.4)}`, { sky: ['#0f0b1a', '#7a3b40'], glow: { x: 0.3, y: 0.7, r: 0.6, c: C.gold, o: 0.2 } }),
    alt: 'Illustration of an empty rural Texas road at dusk with a water tower in the distance',
    sceneAlt: 'Illustration of a fenced field under a fading evening sky',
  },
  'the-crash-netflix-mackenzie-shirilla-case-podcasts': {
    cover: (w, h) => frame(w, h, `${towerBlock(w * 0.02, h * 0.38, w * 0.18, h * 0.3, 4, 5, 90, 0.25)}${towerBlock(w * 0.8, h * 0.4, w * 0.18, h * 0.28, 4, 5, 91, 0.3)}
      ${road(w, h, h * 0.62, { lines: false })}${lightTrails(w, h, h * 0.62, 93, [C.crimson, '#f87171', C.goldLight, '#fde68a'])}
      ${streetLamp(w * 0.14, h * 0.68, 220)}${streetLamp(w * 0.86 - 60, h * 0.68, 220)}`, { kicker: 'THE MACKENZIE SHIRILLA CASE', sky: ['#05050a', '#1a1622'], glow: { x: 0.5, y: 0.62, r: 0.5, c: C.crimson, o: 0.18 } }),
    scene: (w, h) => frame(w, h, `${bokeh(w, h, 40, 95, [C.crimson, '#f87171', C.goldLight, '#93c5fd'], 0.2, 0.9)}${rainStreaks(w, h, 260, 96)}
      <rect width="${w}" height="${h}" fill="#0b1020" opacity="0.25"/>`, { sky: ['#06060b', '#141722'], glow: { x: 0.5, y: 0.5, r: 0.7, c: C.crimson, o: 0.12 } }),
    alt: 'Illustration of red and amber light trails on a road at night',
    sceneAlt: 'Illustration of blurred traffic lights seen through rain at night',
  },
  'who-killed-the-bankers-widow-netflix-case-explained': {
    cover: (w, h) => frame(w, h, `${stars(w, h, 40, 15, 0.3)}
      <path d="M0 ${h} V${h * 0.18} H${w * 0.3} V${h} Z" fill="#2a1f1c"/><path d="M${w * 0.7} ${h} V${h * 0.14} H${w} V${h} Z" fill="#241a18"/>
      ${(() => { let s = ''; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const lit = (i + j) % 3 === 0; s += `<rect x="${f(w * (0.06 + j * 0.12))}" y="${f(h * (0.24 + i * 0.15))}" width="${w * 0.06}" height="${h * 0.09}" fill="${lit ? '#fde68a' : '#3b2b26'}" opacity="${lit ? 0.75 : 0.9}"/><rect x="${f(w * (0.055 + j * 0.12))}" y="${f(h * (0.335 + i * 0.15))}" width="${w * 0.07}" height="6" fill="#1a1312"/>`; s += `<rect x="${f(w * (0.76 + j * 0.12))}" y="${f(h * (0.2 + i * 0.15))}" width="${w * 0.06}" height="${h * 0.09}" fill="${(i + j) % 4 === 1 ? '#fde68a' : '#36261f'}" opacity="0.8"/>` } return s })()}
      <rect x="${w * 0.3}" y="${h * 0.86}" width="${w * 0.4}" height="${h * 0.14}" fill="#1b1716"/>
      ${streetLamp(w * 0.44, h * 0.86, 280)}
      ${palm(w * 0.6, h * 0.88, 340, '#0b0a0b', -1)}`, { kicker: 'THE MARÍA DEL CARMEN MARTÍNEZ CASE', sky: ['#07060c', '#1d1a2a'], glow: { x: 0.5, y: 0.5, r: 0.5, c: C.goldLight, o: 0.1 } }),
    scene: (w, h) => {
      const r = rng(101); let lights = '', town = '', masts = ''
      let x = 0; while (x < w) { const bw = 40 + r() * 90, bh = 30 + r() * 80; town += `<rect x="${f(x)}" y="${f(h * 0.5 - bh)}" width="${f(bw)}" height="${f(bh)}" fill="#120e16"/>`; if (r() < 0.7) { const lx = x + bw * (0.2 + r() * 0.6), ly = h * 0.5 - bh * (0.3 + r() * 0.5), c = r() > 0.5 ? C.goldLight : '#fde68a'; lights += `<rect x="${f(lx)}" y="${f(ly)}" width="8" height="10" fill="${c}" opacity="0.85"/><rect x="${f(lx - 1)}" y="${f(h * 0.53)}" width="10" height="${f(40 + r() * 140)}" fill="${c}" opacity="${f(0.1 + r() * 0.18)}" filter="url(#blur4)"/>` } x += bw + 4 }
      for (let i = 0; i < 6; i++) { const mx = w * (0.12 + i * 0.15 + (r() - 0.5) * 0.04), mh = h * (0.18 + r() * 0.12); masts += `<path d="M${f(mx - 60)} ${h * 0.68} q60 22 120 0 Z" fill="#07070b"/><line x1="${f(mx)}" y1="${h * 0.68}" x2="${f(mx)}" y2="${f(h * 0.68 - mh)}" stroke="#07070b" stroke-width="5"/><line x1="${f(mx)}" y1="${f(h * 0.68 - mh)}" x2="${f(mx + 50)}" y2="${h * 0.66}" stroke="#07070b" stroke-width="2"/>` }
      return frame(w, h, `${stars(w, h, 40, 104, 0.35)}${ridge(w, h, h * 0.36, 50, 102, '#1a1422', 1, 50)}${town}<rect y="${h * 0.5}" width="${w}" height="${h * 0.5}" fill="#0a1020"/>${lights}${waves(w, h * 0.54, 14, 103, '#fde68a')}${masts}`, { sky: ['#06060c', '#1f1b33'], glow: { x: 0.5, y: 0.5, r: 0.6, c: C.goldLight, o: 0.12 } })
    },
    alt: 'Illustration of a Mediterranean street at night with a street lamp and palm tree',
    sceneAlt: 'Illustration of harbour lights reflected in the sea at night',
  },
}

// ---------- shared section art ----------
const SHARED = {
  documentary: (w, h) => {
    let holes = ''; for (let x = 20; x < w; x += 70) holes += `<rect x="${x}" y="${h * 0.08}" width="36" height="24" rx="5" fill="${C.ink950}"/><rect x="${x}" y="${h * 0.86}" width="36" height="24" rx="5" fill="${C.ink950}"/>`
    return frame(w, h, `<rect x="0" y="${h * 0.04}" width="${w}" height="${h * 0.16}" fill="#15151d"/><rect x="0" y="${h * 0.8}" width="${w}" height="${h * 0.16}" fill="#15151d"/>${holes}
      ${[0.08, 0.38, 0.68].map((x, i) => `<rect x="${w * x}" y="${h * 0.25}" width="${w * 0.26}" height="${h * 0.5}" rx="10" fill="${i === 1 ? '#1f2433' : '#191b24'}"/>`).join('')}
      <circle cx="${w * 0.51}" cy="${h * 0.5}" r="${h * 0.15}" fill="#0d0d12" stroke="#3a3a48" stroke-width="10"/><circle cx="${w * 0.51}" cy="${h * 0.5}" r="${h * 0.1}" fill="#141824" stroke="${C.crimson}" stroke-width="6"/><circle cx="${w * 0.51}" cy="${h * 0.5}" r="${h * 0.045}" fill="${C.crimson}" opacity="0.85"/><circle cx="${w * 0.495}" cy="${h * 0.465}" r="${h * 0.018}" fill="#fff" opacity="0.55"/>
      <circle cx="${w * 0.51}" cy="${h * 0.5}" r="${h * 0.3}" fill="${C.crimson}" opacity="0.15" filter="url(#blur30)"/>`, { sky: ['#07070b', '#13131b'], glow: { x: 0.5, y: 0.5, r: 0.5, c: C.crimson, o: 0.12 } })
  },
  podcasts: (w, h) => {
    const r = rng(7); let bars = ''
    for (let i = 0; i < 64; i++) { const x = w * 0.08 + i * (w * 0.84 / 64), v = Math.abs(Math.sin(i * 0.35)) * 0.6 + r() * 0.4, bh = h * 0.06 + v * h * 0.34; if (x > w * 0.42 && x < w * 0.58) continue; bars += `<rect x="${f(x)}" y="${f(h * 0.5 - bh / 2)}" width="${f(w * 0.84 / 64 * 0.55)}" height="${f(bh)}" rx="4" fill="${i % 5 === 0 ? C.crimson : '#3f3f4f'}" opacity="0.85"/>` }
    return frame(w, h, `${bars}
      <rect x="${w * 0.465}" y="${h * 0.2}" width="${w * 0.07}" height="${h * 0.38}" rx="${w * 0.035}" fill="#2a2a35" stroke="#4b4b5c" stroke-width="4"/>
      ${[0, 1, 2, 3, 4].map(i => `<line x1="${w * 0.47}" y1="${h * (0.27 + i * 0.05)}" x2="${w * 0.53}" y2="${h * (0.27 + i * 0.05)}" stroke="#4b4b5c" stroke-width="3"/>`).join('')}
      <path d="M${w * 0.44} ${h * 0.45} q0 ${h * 0.2} ${w * 0.06} ${h * 0.2} q${w * 0.06} 0 ${w * 0.06} -${h * 0.2}" stroke="#6b6b7d" stroke-width="6" fill="none"/>
      <rect x="${w * 0.497}" y="${h * 0.65}" width="8" height="${h * 0.12}" fill="#6b6b7d"/><rect x="${w * 0.46}" y="${h * 0.77}" width="${w * 0.08}" height="8" rx="4" fill="#6b6b7d"/>
      <circle cx="${w * 0.5}" cy="${h * 0.4}" r="${h * 0.35}" fill="${C.crimson}" opacity="0.1" filter="url(#blur30)"/>`, { sky: ['#07070b', '#13131b'], glow: { x: 0.5, y: 0.45, r: 0.5, c: C.crimson, o: 0.12 } })
  },
}

// ---------- render ----------
async function render(page, svg, w, h, file) {
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#000">${svg}</body></html>`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  await page.screenshot({ path: file, type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: w, height: h } })
  console.log('wrote', path.relative(process.cwd(), file), Math.round(fs.statSync(file).size / 1024) + 'KB')
}

const only = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const [slug, set] of Object.entries(SETS)) {
  if (only && !slug.startsWith(only) && only !== 'shared') continue
  if (only === 'shared') break
  await render(page, set.cover(1600, 900), 1600, 900, path.join(OUT, slug, 'cover.jpg'))
  await render(page, set.scene(1600, 640), 1600, 640, path.join(OUT, slug, 'scene.jpg'))
}
if (!only || only === 'shared') {
  await render(page, SHARED.documentary(1600, 520), 1600, 520, path.join(OUT, 'shared', 'documentary.jpg'))
  await render(page, SHARED.podcasts(1600, 520), 1600, 520, path.join(OUT, 'shared', 'podcasts.jpg'))
}
fs.writeFileSync(path.join(OUT, 'alt-text.json'), JSON.stringify(Object.fromEntries(Object.entries(SETS).map(([k, v]) => [k, { cover: v.alt, scene: v.sceneAlt }])), null, 2) + '\n')
await browser.close()
