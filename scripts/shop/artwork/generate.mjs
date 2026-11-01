// Renders every design to production-ready artwork.
//
//   node scripts/shop/artwork/generate.mjs
//
// Output (safe to re-run; files are overwritten deterministically):
//   assets/shop-artwork/designs/<slug>/design.svg   editable vector source (cropped)
//   assets/shop-artwork/designs/<slug>/design.png   transparent print file, 3600px wide
//   assets/shop-artwork/designs/manifest.json       aspect ratios + collection per design
//   assets/shop-artwork/designs/_preview/*.png      contact sheets on black (QA only)
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import { designs } from './designs.mjs'
import { renderDesign, fontFiles, C } from './lib.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, '../../../assets/shop-artwork/designs')
mkdirSync(join(OUT, '_preview'), { recursive: true })

const manifest = []
for (const d of designs) {
  const { svg } = d.compose()
  const body = svg
  const r = renderDesign(body, { pxWidth: 3600 })
  const dir = join(OUT, d.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'design.svg'), r.svg)
  writeFileSync(join(dir, 'design.png'), r.png)
  manifest.push({ slug: d.slug, name: d.name, collection: d.collection, aspect: Number(r.aspect.toFixed(4)), png: { width: r.width, height: r.height } })
  console.log(d.slug.padEnd(42), `${r.width}x${r.height}`, `aspect ${r.aspect.toFixed(2)}`)
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

// Contact sheets: designs on black at roughly shirt proportions, for visual QA.
const cell = 520, cols = 4, pad = 20
for (let page = 0; page * 8 < designs.length; page++) {
  const slice = designs.slice(page * 8, page * 8 + 8)
  const rows = Math.ceil(slice.length / cols)
  const W = cols * (cell + pad) + pad, H = rows * (cell + pad) + pad
  const imgs = slice.map((d, i) => {
    const m = manifest.find(x => x.slug === d.slug)
    const w = Math.min(cell - 40, (cell - 40) / Math.max(1, m.aspect))
    const h = w * m.aspect
    const x = pad + (i % cols) * (cell + pad) + (cell - w) / 2
    const y = pad + Math.floor(i / cols) * (cell + pad) + (cell - h) / 2
    const png = Buffer.from(new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>`).render().asPng())
    return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${join(OUT, d.slug, 'design.svg')}"/>`
  })
  // resvg cannot load external hrefs reliably, so inline each design's SVG instead
  const inline = slice.map((d, i) => {
    const m = manifest.find(x => x.slug === d.slug)
    const w = Math.min(cell - 40, (cell - 40) / Math.max(1, m.aspect))
    const h = w * m.aspect
    const x = pad + (i % cols) * (cell + pad) + (cell - w) / 2
    const y = pad + Math.floor(i / cols) * (cell + pad) + (cell - h) / 2
    const src = d.compose()
    const rr = renderDesign(src.svg, { pxWidth: Math.round(w * 2) })
    const b64 = Buffer.from(rr.png).toString('base64')
    return `<rect x="${pad + (i % cols) * (cell + pad)}" y="${pad + Math.floor(i / cols) * (cell + pad)}" width="${cell}" height="${cell}" fill="#0B0B0D" stroke="#2a2a2e"/><image x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/png;base64,${b64}"/>`
  }).join('')
  const sheet = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#050506"/>${inline}</svg>`, { font: { fontFiles, loadSystemFonts: false } })
  writeFileSync(join(OUT, '_preview', `sheet-${page + 1}.png`), sheet.render().asPng())
}
console.log(`\n${designs.length} designs rendered to ${OUT}`)
