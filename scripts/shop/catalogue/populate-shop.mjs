// Adds the merchandise range to the existing shop catalogue (Supabase).
//
//   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… PRINTIFY_API_TOKEN=… PRINTIFY_SHOP_ID=… \
//     node scripts/shop/catalogue/populate-shop.mjs [--dry-run]
//
// Needs migration 021_shop_collections.sql applied first.
// Reads printify-state.json (written by create-printify-products.mjs).
//
// Rerunnable: products are matched by slug and variants by Printify variant id,
// so nothing is duplicated. On a rerun it refreshes copy, costs and enabled flags
// but never overwrites a price, an image list or a published/placeholder flag that
// already has a value. New products are inserted as DRAFTS (is_published=false,
// is_placeholder=true) until verify-and-publish.mjs has checked fulfilment.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { COLLECTIONS, TYPES, PRICES, MATRIX, FEATURED, DESIGN_COPY, describe, typeSlug } from './range.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const DRY = process.argv.includes('--dry-run')
const { NEXT_PUBLIC_SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: KEY, PRINTIFY_API_TOKEN: PT, PRINTIFY_SHOP_ID: SHOP } = process.env
if (!SB || !KEY || !PT || !SHOP) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRINTIFY_API_TOKEN, PRINTIFY_SHOP_ID')

const GBP_PER_USD = 0.78 // matches shop_settings.printify_to_gbp_rate; costs are USD cents
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']

const sb = (path, init = {}) => fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...init.headers } })
async function sbJson(path, init) {
  const res = await sb(path, init)
  const text = await res.text()
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}
async function printify(path) {
  const res = await fetch(`https://api.printify.com/v1${path}`, { headers: { Authorization: `Bearer ${PT}`, 'User-Agent': 'ltc-catalogue' } })
  if (!res.ok) throw new Error(`Printify ${path} -> ${res.status}`)
  return res.json()
}

const roundUp99 = gbp => Math.ceil(gbp) - 0.01 // e.g. 12.2 -> 12.99
/** Retail price in pence: the type's base price, raised for sizes that cost more so margin never falls below ~40%. */
const priceFor = (typeKey, costMinor) => {
  const floor = Math.round(roundUp99((costMinor * GBP_PER_USD) / 100 / 0.6) * 100)
  return Math.max(PRICES[typeKey], floor)
}

const state = JSON.parse(readFileSync(join(HERE, 'printify-state.json'), 'utf8')).products
const manifest = new Map(JSON.parse(readFileSync(join(HERE, '../../../assets/shop-artwork/designs/manifest.json'), 'utf8')).map(d => [d.slug, d]))

// Mock-ups worth showing: front and lifestyle shots. Back/neck/sleeve views are blank on these designs.
function pickImages(remote, title) {
  const keep = (remote.images ?? []).filter(i => i.src && ['front', 'other'].includes(i.position))
  const seen = new Set(), out = []
  for (const i of keep.sort((a, b) => Number(b.is_default) - Number(a.is_default))) {
    const url = i.src.replace(/^http:/, 'https:')
    const key = url.split('?')[0].split('/').slice(-2).join('/')
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ url, alt: `${title}${out.length ? ` - view ${out.length + 1}` : ' - front'}` })
    if (out.length >= 6) break
  }
  return out
}

const collectionOrder = new Map(COLLECTIONS.map((c, i) => [c.slug, i]))
const listings = []
for (const [designSlug, types] of Object.entries(MATRIX)) {
  const d = manifest.get(designSlug)
  for (const typeKey of types) listings.push({ designSlug, design: d, typeKey, slug: `${designSlug}-${typeSlug(typeKey)}` })
}
const rank = l => (FEATURED.includes(l.slug) ? FEATURED.indexOf(l.slug) : 100 + collectionOrder.get(l.design.collection) * 100 + Object.keys(TYPES).indexOf(l.typeKey) * 10)
listings.sort((a, b) => rank(a) - rank(b))

let inserted = 0, updated = 0, variantsWritten = 0
const report = []
for (const [idx, l] of listings.entries()) {
  const t = TYPES[l.typeKey]
  // No full stop before the product type: "Just One More Episode T-Shirt", not "Episode. T-Shirt".
  const title = `${l.design.name.replace(/\.+$/, '')} ${t.label}`
  const pid = state[l.slug]?.printifyId
  if (!pid) throw new Error(`No Printify product for ${l.slug} — run create-printify-products.mjs`)
  const remote = await printify(`/shops/${SHOP}/products/${pid}.json`)
  const copy = DESIGN_COPY[l.designSlug]
  const collection = COLLECTIONS.find(c => c.slug === l.design.collection)

  const row = {
    slug: l.slug,
    title,
    category: t.category,
    short_description: copy.blurb.split('. ')[0].replace(/\.?$/, '.'),
    description: describe({ slug: l.designSlug, collection: l.design.collection }, l.typeKey),
    printify_product_id: pid,
    is_featured: FEATURED.includes(l.slug),
    is_new: true,
    sort_order: idx + 1,
    seo_title: `${title} | True Crime ${t.label} UK`.slice(0, 118),
    seo_description: `${copy.blurb.split('. ')[0].replace(/\.?$/, '.')} ${t.label} printed to order in the UK by Listen True Crime.`.slice(0, 318),
    specs: [t.base[0].toUpperCase() + t.base.slice(1), t.colour ? `Colour: ${t.colour}` : 'Colour: black', 'Printed to order by a UK print provider'],
    admin_notes: `Collection: ${collection.label}. Created ${new Date().toISOString().slice(0, 10)} by populate-shop.mjs. DRAFT until verify-and-publish.mjs has checked fulfilment.`,
    collection: l.design.collection,
    design: l.designSlug,
    tags: [...copy.tags, collection.label.toLowerCase(), t.label.toLowerCase()],
  }

  const incoming = remote.variants.filter(v => v.is_enabled && v.is_available !== false)
  const valueById = new Map()
  for (const o of remote.options ?? []) for (const v of o.values ?? []) valueById.set(v.id, { type: o.type, title: v.title, hex: v.colors?.[0] ?? null })
  const parsed = incoming.map((v, i) => {
    const vals = (v.options ?? []).map(id => valueById.get(id)).filter(Boolean)
    const colour = vals.find(x => x.type === 'color')
    const rest = vals.filter(x => x.type !== 'color')
    const size = rest.length ? rest.map(r => r.title).join(' / ') : 'One size'
    return { printify_variant_id: v.id, sku: v.sku ?? null, colour: colour?.title ?? 'Black', colour_hex: colour?.hex ?? null, size, cost_minor: v.cost, is_enabled: true, price_pence: priceFor(l.typeKey, v.cost) }
  }).sort((a, b) => SIZE_ORDER.indexOf(a.size) - SIZE_ORDER.indexOf(b.size)).map((v, i) => ({ ...v, sort_order: i + 1 }))

  const costs = parsed.map(v => v.cost_minor)
  const lo = Math.min(...parsed.map(v => v.price_pence)), hi = Math.max(...parsed.map(v => v.price_pence))
  const worst = Math.min(...parsed.map(v => 1 - (v.cost_minor * GBP_PER_USD) / v.price_pence))
  report.push({ slug: l.slug, price: lo === hi ? `£${(lo / 100).toFixed(2)}` : `£${(lo / 100).toFixed(2)}-£${(hi / 100).toFixed(2)}`, variants: parsed.length, minMargin: `${Math.round(worst * 100)}%` })
  if (DRY) continue

  const [existing] = await sbJson(`shop_products?slug=eq.${l.slug}&select=id,images`)
  let productId
  if (existing) {
    productId = existing.id
    const patch = { ...row }
    delete patch.slug
    delete patch.sort_order // keep any manual ordering changes
    if (!(existing.images?.length)) patch.images = pickImages(remote, title)
    await sbJson(`shop_products?id=eq.${productId}`, { method: 'PATCH', body: JSON.stringify(patch) })
    updated++
  } else {
    const [created] = await sbJson('shop_products', { method: 'POST', body: JSON.stringify({ ...row, images: pickImages(remote, title), is_published: false, is_placeholder: true }) })
    productId = created.id
    inserted++
  }

  const have = await sbJson(`shop_variants?product_id=eq.${productId}&select=id,printify_variant_id,price_pence`)
  for (const v of parsed) {
    const match = have.find(h => h.printify_variant_id === v.printify_variant_id)
    if (match) {
      const { price_pence, ...rest } = v // never overwrite a price that is already set
      await sbJson(`shop_variants?id=eq.${match.id}`, { method: 'PATCH', body: JSON.stringify(match.price_pence ? rest : v) })
    } else {
      await sbJson('shop_variants', { method: 'POST', body: JSON.stringify({ product_id: productId, ...v }) })
    }
    variantsWritten++
  }
}
console.table(report)
console.log(DRY ? 'DRY RUN: nothing written.' : `Inserted ${inserted}, updated ${updated}, variant rows written ${variantsWritten}.`)
