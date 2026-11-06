// Verifies that every catalogue product is genuinely fulfillable, then (optionally) publishes.
//
//   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… PRINTIFY_API_TOKEN=… PRINTIFY_SHOP_ID=… \
//     node scripts/shop/catalogue/verify-and-publish.mjs [--mark-verified] [--publish] [--only=<slug>]
//
// For each collection product still in draft it checks, without placing any order:
//   - the Printify product exists and every enabled variant maps to a real Printify variant
//   - every enabled variant has a price and a cost, and margin is reported
//   - at least one image, and a description, SEO title and SEO description exist
//   - Printify returns a real UK delivery quote for the product's variants (read-only call)
//   - the print provider is in the UK
// Default run is a report only. --mark-verified clears is_placeholder on products that pass.
// --publish additionally sets is_published=true (only for products that pass).
import { COLLECTIONS } from './range.mjs'

const { NEXT_PUBLIC_SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: KEY, PRINTIFY_API_TOKEN: PT, PRINTIFY_SHOP_ID: SHOP } = process.env
if (!SB || !KEY || !PT || !SHOP) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PRINTIFY_API_TOKEN, PRINTIFY_SHOP_ID')
const MARK = process.argv.includes('--mark-verified') || process.argv.includes('--publish')
const PUBLISH = process.argv.includes('--publish')
const ONLY = (process.argv.find(a => a.startsWith('--only=')) ?? '').slice(7)
const GBP_PER_USD = 0.78

const sb = async (path, init = {}) => {
  const res = await fetch(`${SB}/rest/v1/${path}`, { ...init, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...init.headers } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}
const pf = async (method, path, body) => {
  const res = await fetch(`https://api.printify.com/v1${path}`, { method, headers: { Authorization: `Bearer ${PT}`, 'Content-Type': 'application/json', 'User-Agent': 'ltc-catalogue' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  return { ok: res.ok, status: res.status, json: text ? JSON.parse(text) : null }
}

const providerCache = new Map()
async function providerCountry(id) {
  if (!providerCache.has(id)) providerCache.set(id, (await pf('GET', `/catalog/print_providers/${id}.json`)).json?.location?.country)
  return providerCache.get(id)
}

const slugs = COLLECTIONS.map(c => c.slug).join(',')
const products = await sb(`shop_products?collection=in.(${slugs})&select=*&order=sort_order${ONLY ? `&slug=eq.${ONLY}` : ''}`)
const rows = []
let passed = 0
for (const p of products) {
  const problems = []
  const variants = (await sb(`shop_variants?product_id=eq.${p.id}&is_enabled=eq.true&select=*`))
  const remote = await pf('GET', `/shops/${SHOP}/products/${p.printify_product_id}.json`)
  if (!remote.ok) problems.push(`Printify product not found (${remote.status})`)
  else {
    const remoteIds = new Set(remote.json.variants.filter(v => v.is_enabled).map(v => v.id))
    for (const v of variants) if (!v.printify_variant_id || !remoteIds.has(v.printify_variant_id)) problems.push(`variant ${v.size} not mapped to an enabled Printify variant`)
    const country = await providerCountry(remote.json.print_provider_id)
    if (country !== 'GB') problems.push(`print provider is in ${country}, not the UK`)
  }
  if (!variants.length) problems.push('no enabled variants')
  if (variants.some(v => !v.price_pence)) problems.push('a variant has no price')
  if (variants.some(v => v.cost_minor == null)) problems.push('a variant has no cost')
  if (!(p.images?.length)) problems.push('no images')
  if (!p.description || !p.seo_title || !p.seo_description) problems.push('missing description or SEO fields')
  let quote = '-'
  if (!problems.length) {
    const q = await pf('POST', `/shops/${SHOP}/orders/shipping.json`, { line_items: [{ product_id: p.printify_product_id, variant_id: variants[0].printify_variant_id, quantity: 1 }], address_to: { country: 'GB' } })
    if (!q.ok || typeof q.json?.standard !== 'number') problems.push(`no UK delivery quote (${q.status})`)
    else quote = `£${((q.json.standard * GBP_PER_USD) / 100).toFixed(2)}`
  }
  const minMargin = variants.length ? Math.min(...variants.map(v => 1 - (v.cost_minor * GBP_PER_USD) / v.price_pence)) : 0
  const ok = problems.length === 0
  if (ok) passed++
  rows.push({ slug: p.slug, ok: ok ? 'PASS' : 'FAIL', 'min margin': `${Math.round(minMargin * 100)}%`, 'UK delivery': quote, state: p.is_published ? 'published' : p.is_placeholder ? 'draft' : 'verified draft', problems: problems.join('; ') })
  if (ok && MARK) {
    const patch = { is_placeholder: false }
    if (PUBLISH) patch.is_published = true
    await sb(`shop_products?id=eq.${p.id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }
}
console.table(rows)
console.log(`${passed}/${products.length} products pass.${MARK ? (PUBLISH ? ' Passing products were published.' : ' Passing products were marked verified (still drafts).') : ' Report only: nothing changed.'}`)
if (passed !== products.length) process.exitCode = 1
