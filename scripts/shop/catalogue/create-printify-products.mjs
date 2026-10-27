// Creates the merchandise products in Printify (UK print providers only).
//
//   PRINTIFY_API_TOKEN=… PRINTIFY_SHOP_ID=… node scripts/shop/catalogue/create-printify-products.mjs [--dry-run] [--only=<listing-slug>]
//
// Safe to re-run: products are matched by title and never duplicated, and print
// files are uploaded once (cached by content hash in printify-state.json).
// This creates DRAFT products only. It does not publish them to any sales
// channel, place orders, or touch the website.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COLLECTIONS, TYPES, PRICES, MATRIX, placement, sizeFor, typeSlug, describe } from './range.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ART = join(HERE, '../../../assets/shop-artwork/designs')
const STATE_FILE = join(HERE, 'printify-state.json')
const TOKEN = process.env.PRINTIFY_API_TOKEN, SHOP = process.env.PRINTIFY_SHOP_ID
const DRY = process.argv.includes('--dry-run')
const UPDATE = process.argv.includes('--update-placement')
const ONLY = (process.argv.find(a => a.startsWith('--only=')) ?? '').slice(7)
if (!TOKEN || !SHOP) throw new Error('Set PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID')

const API = 'https://api.printify.com/v1'
async function api(method, path, body) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(API + path, { method, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'ltc-catalogue' }, body: body ? JSON.stringify(body) : undefined })
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); continue }
    const text = await res.text()
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 400)}`)
    return text ? JSON.parse(text) : null
  }
  throw new Error(`${method} ${path} failed after retries`)
}

const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : { uploads: {}, products: {} }
const save = () => writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n')
const manifest = JSON.parse(readFileSync(join(ART, 'manifest.json'), 'utf8'))
const designs = new Map(manifest.map(d => [d.slug, d]))

async function uploadDesign(slug) {
  const buf = readFileSync(join(ART, slug, 'design.png'))
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16)
  const cached = state.uploads[slug]
  if (cached?.hash === hash) return cached.id
  if (DRY) return `dry-${slug}`
  const up = await api('POST', '/uploads/images.json', { file_name: `ltc-${slug}.png`, contents: buf.toString('base64') })
  state.uploads[slug] = { hash, id: up.id, width: up.width, height: up.height }
  save()
  console.log(`  uploaded ${slug} (${up.width}x${up.height})`)
  return up.id
}

const catalogueCache = new Map()
async function variantsFor(typeKey) {
  if (catalogueCache.has(typeKey)) return catalogueCache.get(typeKey)
  const t = TYPES[typeKey]
  const d = await api('GET', `/catalog/blueprints/${t.blueprint}/print_providers/${t.provider}/variants.json`)
  const chosen = d.variants.filter(v => {
    if (typeKey === 'mug') return (v.options.size ?? v.title) === '11oz'
    return (v.options.color ?? v.title.split(' / ')[0]) === t.colour
  })
  if (!chosen.length) throw new Error(`No ${t.colour ?? '11oz'} variants for ${typeKey}`)
  catalogueCache.set(typeKey, chosen)
  return chosen
}

const existing = DRY ? [] : (await api('GET', `/shops/${SHOP}/products.json?limit=50`)).data
let page = 1, total = DRY ? 0 : (await api('GET', `/shops/${SHOP}/products.json?limit=50`)).last_page
const byTitle = new Map(existing.map(p => [p.title, p.id]))
for (page = 2; !DRY && page <= total; page++) for (const p of (await api('GET', `/shops/${SHOP}/products.json?limit=50&page=${page}`)).data) byTitle.set(p.title, p.id)

let created = 0, skipped = 0
for (const [designSlug, types] of Object.entries(MATRIX)) {
  const design = designs.get(designSlug)
  if (!design) throw new Error(`No artwork for ${designSlug}`)
  for (const typeKey of types) {
    const listing = `${designSlug}-${typeSlug(typeKey)}`
    if (ONLY && ONLY !== listing) continue
    const t = TYPES[typeKey]
    const title = `${design.name} ${t.label}`
    if (UPDATE && state.products[listing]) {
      // Re-apply print placement to an existing Printify product (regenerates its mockups).
      const variants = await variantsFor(typeKey)
      const imageId = await uploadDesign(designSlug)
      const pos = placement(typeKey, design.aspect, sizeFor(designSlug))
      if (DRY) { console.log('DRY update', listing, JSON.stringify(pos)); continue }
      const current = await api('GET', `/shops/${SHOP}/products/${state.products[listing].printifyId}.json`)
      const allIds = current.variants.map(v => v.id)
      await api('PUT', `/shops/${SHOP}/products/${state.products[listing].printifyId}.json`, {
        variants: current.variants.map(v => ({ id: v.id, price: v.price, is_enabled: v.is_enabled })),
        print_areas: [{ variant_ids: allIds, placeholders: [{ position: 'front', images: [{ id: imageId, x: pos.x, y: pos.y, scale: pos.scale, angle: 0 }] }] }],
      })
      created++
      console.log(`updated placement ${listing} ${JSON.stringify(pos)}`)
      continue
    }
    if (state.products[listing] || byTitle.has(title)) {
      state.products[listing] ??= { printifyId: byTitle.get(title), title }
      skipped++
      continue
    }
    const variants = await variantsFor(typeKey)
    const imageId = await uploadDesign(designSlug)
    const pos = placement(typeKey, design.aspect, sizeFor(designSlug))
    // Printify's own price field is informational here (the website sets its own); keep it near the retail price.
    const printifyPrice = Math.round((PRICES[typeKey] / 0.78))
    const body = {
      title,
      description: describe({ slug: designSlug, collection: design.collection }, typeKey),
      blueprint_id: t.blueprint,
      print_provider_id: t.provider,
      variants: variants.map(v => ({ id: v.id, price: printifyPrice, is_enabled: true })),
      print_areas: [{ variant_ids: variants.map(v => v.id), placeholders: [{ position: 'front', images: [{ id: imageId, x: pos.x, y: pos.y, scale: pos.scale, angle: 0 }] }] }],
    }
    if (DRY) { console.log('DRY', listing, JSON.stringify(pos), `${variants.length} variants`); continue }
    const p = await api('POST', `/shops/${SHOP}/products.json`, body)
    state.products[listing] = { printifyId: p.id, title }
    save()
    created++
    console.log(`created ${listing} -> ${p.id} (${variants.length} variants)`)
  }
}
console.log(`\nDone. created ${created}, already existed ${skipped}. State: ${STATE_FILE}`)
