// Collects public contact emails for every podcast listed on listentruecrime.com.
//
// Source of truth for the podcast list is the live sitemap. For each show we look
// up its RSS feed via the iTunes Search API (exact title match only) and read the
// contact address the publisher put in the feed itself (<itunes:email>,
// <managingEditor>, <webMaster>). Nothing is guessed or scraped from free text
// elsewhere; shows with no confident match are written to the "unmatched" file
// for manual follow-up.
//
// Usage: node scripts/outreach/harvest-contacts.mjs [outDir]
// Resumable: progress is cached in <outDir>/cache.json.

import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://www.listentruecrime.com'
const outDir = path.resolve(process.argv[2] ?? 'outreach-data')
fs.mkdirSync(outDir, { recursive: true })
const cacheFile = path.join(outDir, 'cache.json')
const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {}
const save = () => fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1))
const sleep = ms => new Promise(r => setTimeout(r, ms))
const UA = 'Mozilla/5.0 (compatible; ListenTrueCrimeBot/1.0; +https://www.listentruecrime.com)'

const norm = s =>
  s.toLowerCase().replace(/&amp;/g, '&').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim()

async function get(url, ms = 20000) {
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

async function itunesSearch(term, country) {
  const url = `https://itunes.apple.com/search?media=podcast&entity=podcast&limit=10&country=${country}&term=${encodeURIComponent(term)}`
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(url, { headers: { 'user-agent': UA } }).catch(() => null)
    if (res?.ok) return (await res.json()).results ?? []
    // 403/429 = rate limited; back off and retry rather than treating it as "no results".
    await sleep(res && (res.status === 403 || res.status === 429) ? 15000 + attempt * 10000 : 3000)
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

const sitemap = await get(`${BASE}/sitemap.xml`, 60000)
if (!sitemap) throw new Error('Could not fetch sitemap')
const slugs = [...sitemap.matchAll(/<loc>[^<]*\/podcasts\/([^<\/]+)<\/loc>/g)].map(m => m[1])
console.log(`${slugs.length} podcasts in sitemap`)

let n = 0
for (const slug of slugs) {
  n++
  if (cache[slug]?.done) continue
  const rec = (cache[slug] = { slug, done: false })

  const page = await get(`${BASE}/podcasts/${slug}`)
  const ld = page && [...page.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
    .map(m => { try { return JSON.parse(m[1]) } catch { return null } })
    .find(d => d?.['@type'] === 'PodcastSeries')
  rec.title = ld?.name ?? null
  if (!rec.title) { rec.status = 'page-fetch-failed'; save(); continue }

  // Prefer the show's own website_url if the page exposes one (JSON-LD/Visit link).
  const target = norm(rec.title)
  let hit = null
  let lookupFailed = false
  for (const country of ['us', 'gb']) {
    const results = await itunesSearch(rec.title, country)
    await sleep(4000) // iTunes Search API allows roughly 20 requests/minute
    if (results === null) { lookupFailed = true; continue }
    hit = results.find(r => r.feedUrl && norm(r.collectionName ?? '') === target)
    if (hit) break
  }
  // A lookup that errored out is not evidence of "no match": leave it un-done so a re-run retries it.
  if (!hit && lookupFailed) { rec.status = 'itunes-lookup-failed'; save(); console.log(`[${n}/${slugs.length}] ${rec.title}: lookup failed (will retry on re-run)`); continue }
  if (!hit) { rec.status = 'no-exact-itunes-match'; rec.done = true; save(); console.log(`[${n}/${slugs.length}] ${rec.title}: no match`); continue }

  rec.feedUrl = hit.feedUrl
  rec.itunesName = hit.collectionName
  rec.artist = hit.artistName
  const xml = await get(hit.feedUrl, 30000)
  if (!xml) { rec.status = 'feed-fetch-failed'; rec.done = true; save(); continue }
  rec.emails = feedEmails(xml).filter(x => usable(x.email))
  rec.status = rec.emails.length ? 'ok' : 'no-email-in-feed'
  rec.done = true
  save()
  console.log(`[${n}/${slugs.length}] ${rec.title}: ${rec.emails.map(e => e.email).join(', ') || '-'}`)
}

const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`
const rows = Object.values(cache)
const withEmail = rows.filter(r => r.emails?.length)
fs.writeFileSync(
  path.join(outDir, 'podcast-contacts.csv'),
  ['email,podcast_title,slug,source,feed_url,podcast_page_url',
    ...withEmail.flatMap(r => r.emails.map(e => [e.email, q(r.title), r.slug, e.source, r.feedUrl, `${BASE}/podcasts/${r.slug}`].join(',')))].join('\n') + '\n')
fs.writeFileSync(
  path.join(outDir, 'unmatched.csv'),
  ['podcast_title,slug,status', ...rows.filter(r => !r.emails?.length).map(r => [q(r.title), r.slug, r.status].join(','))].join('\n') + '\n')
const uniq = new Set(withEmail.flatMap(r => r.emails.map(e => e.email)))
console.log(`\nDone. ${withEmail.length}/${rows.length} podcasts with an email; ${uniq.size} unique addresses.`)
