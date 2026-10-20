/**
 * One-off: registers the Printify webhooks that drive dispatch emails and
 * status updates. Run ONCE per Printify shop, after the site is deployed:
 *
 *   PRINTIFY_API_TOKEN=… PRINTIFY_SHOP_ID=… PRINTIFY_WEBHOOK_SECRET=… \
 *   NEXT_PUBLIC_SITE_URL=https://www.listentruecrime.com \
 *   npx tsx scripts/shop/register-printify-webhooks.ts
 *
 * Running it twice creates duplicate subscriptions (Printify would then call us
 * twice per event — harmless because the handler de-duplicates, but untidy).
 * Pass --list to see existing webhooks first.
 */
const TOPICS = ['order:updated', 'order:sent-to-production', 'order:shipment:created', 'order:shipment:delivered']

async function main() {
  const token = process.env.PRINTIFY_API_TOKEN
  const shop = process.env.PRINTIFY_SHOP_ID
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '')
  if (!token || !shop || !base) throw new Error('Set PRINTIFY_API_TOKEN, PRINTIFY_SHOP_ID and NEXT_PUBLIC_SITE_URL')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const api = `https://api.printify.com/v1/shops/${shop}/webhooks.json`

  if (process.argv.includes('--list')) {
    console.log(JSON.stringify(await (await fetch(api, { headers })).json(), null, 2))
    return
  }
  if (!secret || secret.length < 16) throw new Error('Set PRINTIFY_WEBHOOK_SECRET (16+ random characters) — the same value you put in Vercel')

  const url = `${base}/api/shop/webhooks/printify`
  for (const topic of TOPICS) {
    const res = await fetch(api, { method: 'POST', headers, body: JSON.stringify({ topic, url, secret }) })
    console.log(topic, res.status, await res.text())
  }
}

main().catch(err => { console.error(err); process.exit(1) })
