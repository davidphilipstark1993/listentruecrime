// Second-pass contact harvest using Podcast Index instead of iTunes.
//
// Takes the published podcast titles from Supabase and looks each one up on
// Podcast Index (exact normalized title match only; ambiguous matches are
// skipped). The feed's own channel-level contact address is then read exactly as
// in harvest-contacts.mjs. Output is merged with the iTunes pass by merge-contacts.mjs.
//
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PODCASTINDEX_API_KEY,
// PODCASTINDEX_API_SECRET in the environment.
//
// Usage: node scripts/outreach/harvest-podcastindex.mjs [outDir]
// Resumable: progress is cached in <outDir>/pi-cache.json.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const { NEXT_PUBLIC_SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: SBKEY, PODCASTINDEX_API_KEY: PIKEY, PODCASTINDEX_API_SECRET: PISECRET } = process.env
if (!SB || !SBKEY || !PIKEY || !PISECRET) throw new Error('Missing Supabase or Podcast Index env vars')

const outDir = path.resolve(process.argv[2] ?? 'outreach-data')
fs.mkdirSync(outDir, { recursive: true })
const cacheFile = path.join(outDir, 'pi-cache.json')
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {}
const save = () => fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1))
const sleep = ms => new Promise(r => setTimeout(r, ms))
const UA = 'Mozilla/5.0 (compatible; ListenTrueCrimeBot/1.0; +https://www.listentruecrime.com)'

const norm = s =>
  s.toLowerCase().replace(/&amp;/g, '&').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim()

async function getText(url, ms = 30000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { 'user-agent': UA }, redirect: 'follow' })
    return res.ok ? await res.text() : null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

async function piSearch(title) {
  const url = `https://api.podcastindex.org/api/1.0/search/bytitle?max=20&similar=false&q=${encodeURIComponent(title)}`
  for (let attempt = 0; attempt < 5; attempt++) {
    const date = Math.floor(Date.now() / 1000)
    const auth = crypto.createHash('sha1').update(PIKEY + PISECRET + date).digest('hex')
    const res = await fetch(url, {
      headers: { 'user-agent': UA, 'X-Auth-Key': PIKEY, 'X-Auth-Date': String(date), Authorization: auth },
    }).catch(() => null)
    if (res?.ok) return (await res.json()).feeds ?? []
    await sleep(res?.status === 429 ? 20000 : 3000)
  }
  return null
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
function feedEmails(xml) {
  const head = xml.split(/<item[\s>]/i)[0] // channel-level only, not per-episode
  const found = new Map()
  const add = (e, src) => {
    e = e.toLowerCase().replace(/^mailto:/, '')
    if (!found.has(e)) found.set(e, src)
  }
  for (const m of head.matchAll(/<itunes:email>\s*(?:<!\[CDATA\[)?([^<\]]+)/gi)) for (const e of m[1].match(EMAIL_RE) ?? []) add(e, 'itunes:email')
  for (const m of head.matchAll(/<(managingEditor|webMaster)>\s*(?:<!\[CDATA\[)?([^<\]]+)/gi)) for (const e of m[2].match(EMAIL_RE) ?? []) add(e, m[1])
  return [...found].map(([email, source]) => ({ email, source }))
}

const BAD_DOMAINS = /(^|\.)(example\.com|sentry\.io|wixpress\.com)$/i
const PLACEHOLDER = /^(noreply|no-reply|donotreply|do-not-reply|podcast@anchor\.fm)/i
const usable = e => !BAD_DOMAINS.test(e.split('@')[1]) && !PLACEHOLDER.test(e)

const sbRes = await fetch(`${SB}/rest/v1/podcasts?select=title,slug&is_published=eq.true&order=slug&limit=2000`, {
  headers: { apikey: SBKEY, Authorization: `Bearer ${SBKEY}` },
})
if (!sbRes.ok) throw new Error(`Supabase ${sbRes.status}`)
const shows = await sbRes.json()
console.log(`${shows.length} published podcasts in Supabase`)

let n = 0
for (const { title, slug } of shows) {
  n++
  if (cache[slug]?.done) continue
  const rec = (cache[slug] = { slug, title, done: false })

  const feeds = await piSearch(title)
  await sleep(500)
  if (feeds === null) { rec.status = 'pi-lookup-failed'; save(); console.log(`[${n}/${shows.length}] ${title}: lookup failed (will retry on re-run)`); continue }

  const target = norm(title)
  // Distinct feeds whose title matches exactly. More than one means we can't tell which is the show.
  const exact = [...new Map(feeds.filter(f => f.url && norm(f.title ?? '') === target).map(f => [f.url, f])).values()]
  if (exact.length !== 1) {
    rec.status = exact.length ? 'ambiguous-pi-match' : 'no-exact-pi-match'
    rec.done = true; save()
    console.log(`[${n}/${shows.length}] ${title}: ${rec.status}`)
    continue
  }

  rec.feedUrl = exact[0].url
  rec.piAuthor = exact[0].author
  const xml = await getText(exact[0].url)
  if (!xml) { rec.status = 'feed-fetch-failed'; rec.done = true; save(); continue }
  rec.emails = feedEmails(xml).filter(x => usable(x.email))
  rec.status = rec.emails.length ? 'ok' : 'no-email-in-feed'
  rec.done = true
  save()
  console.log(`[${n}/${shows.length}] ${title}: ${rec.emails.map(e => e.email).join(', ') || '-'}`)
}

const rows = Object.values(cache)
const withEmail = rows.filter(r => r.emails?.length)
console.log(`\nDone. ${withEmail.length}/${rows.length} podcasts with an email via Podcast Index.`)
