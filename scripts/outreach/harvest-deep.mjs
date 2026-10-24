// Deep pass for shows the feed-only passes found no email for.
//
// Sources, in order, all of them public contact details the show itself publishes
// or that the owner sent to us:
//   1. feed URLs we already hold in Supabase (podcasts, podcast_discoveries, newsletter_submissions)
//   2. Podcast Index lookup with a looser title match (subtitle after " - ", ":" or "|" ignored)
//   3. any address in the feed's channel header text (e.g. "contact us at ...")
//   4. the show's website: home page plus its contact/about/press/sponsor pages (mailto links and visible addresses)
//   5. podcast_promotion_enquiries: owners who emailed us directly
//
// Needs the same env vars as harvest-podcastindex.mjs.
// Usage: node scripts/outreach/harvest-deep.mjs [outDir]    (resumable via <outDir>/deep-cache.json)

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const { NEXT_PUBLIC_SUPABASE_URL: SB, SUPABASE_SERVICE_ROLE_KEY: SBKEY, PODCASTINDEX_API_KEY: PIKEY, PODCASTINDEX_API_SECRET: PISECRET } = process.env
if (!SB || !SBKEY || !PIKEY || !PISECRET) throw new Error('Missing Supabase or Podcast Index env vars')

const outDir = path.resolve(process.argv[2] ?? 'outreach-data')
const readJson = f => (fs.existsSync(path.join(outDir, f)) ? JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8')) : {})
const cacheFile = path.join(outDir, 'deep-cache.json')
const cache = readJson('deep-cache.json')
const save = () => fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1))
const sleep = ms => new Promise(r => setTimeout(r, ms))
const UA = 'Mozilla/5.0 (compatible; ListenTrueCrimeBot/1.0; +https://www.listentruecrime.com)'

const norm = s => s.toLowerCase().replace(/&amp;/g, '&').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim()
const stem = s => norm(s.split(/\s[-–—:|]\s|:\s/)[0])

async function getText(url, ms = 20000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { 'user-agent': UA }, redirect: 'follow' })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (/^(image|audio|video)\//.test(type)) return null
    return (await res.text()).slice(0, 2_000_000)
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

async function piSearch(title) {
  const url = `https://api.podcastindex.org/api/1.0/search/bytitle?max=20&similar=false&q=${encodeURIComponent(title)}`
  for (let attempt = 0; attempt < 4; attempt++) {
    const date = Math.floor(Date.now() / 1000)
    const auth = crypto.createHash('sha1').update(PIKEY + PISECRET + date).digest('hex')
    const res = await fetch(url, { headers: { 'user-agent': UA, 'X-Auth-Key': PIKEY, 'X-Auth-Date': String(date), Authorization: auth } }).catch(() => null)
    if (res?.ok) return (await res.json()).feeds ?? []
    await sleep(res?.status === 429 ? 20000 : 3000)
  }
  return null
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/gi
const BAD_DOMAIN = /(^|\.)(example\.com|domain\.com|email\.com|yourdomain\.com|sentry\.io|sentry-next\.wixpress\.com|wixpress\.com|wix\.com|squarespace\.com|godaddy\.com|wordpress\.com|w3\.org|schema\.org|anchor\.fm|mg-eu\.acast\.com|mg\.acast\.com|audible\.com)$/i
const BAD_LOCAL = /^(noreply|no-reply|donotreply|do-not-reply|name|yourname|you|user|username|email|test|john|jane|your|someone)$|^podcast_metadata$/i
const BAD_TLD = /\.(png|jpe?g|gif|webp|svg|css|js|woff2?|ico)$/i
const clean = e => e.toLowerCase().replace(/^mailto:/, '').replace(/[.,;:)>\]]+$/, '')
const okEmail = e => !BAD_TLD.test(e) && !BAD_DOMAIN.test(e.split('@')[1]) && !BAD_LOCAL.test(e.split('@')[0]) && e.length < 80

function textEmails(html) {
  const out = new Set()
  const deob = html
    .replace(/&#0*64;|&commat;|%40/gi, '@')
    .replace(/\s*[\[(]\s*at\s*[\])]\s*/gi, '@')
    .replace(/\s*[\[(]\s*dot\s*[\])]\s*/gi, '.')
  for (const m of deob.matchAll(/mailto:([^"'?>\s]+)/gi)) for (const e of m[1].match(EMAIL_RE) ?? []) out.add(clean(e))
  for (const e of deob.replace(/<[^>]+>/g, ' ').match(EMAIL_RE) ?? []) out.add(clean(e))
  return [...out].filter(okEmail)
}

const sb = async p => {
  const res = await fetch(`${SB}/rest/v1/${p}`, { headers: { apikey: SBKEY, Authorization: `Bearer ${SBKEY}` } })
  if (!res.ok) throw new Error(`Supabase ${p} -> ${res.status}`)
  return res.json()
}
const shows = await sb('podcasts?select=title,slug,website_url,rss_url&is_published=eq.true&order=slug&limit=2000')
const extra = new Map() // normalized name -> { rss, site }
for (const [table, nameCol, siteCol] of [['podcast_discoveries', 'podcast_name', 'website_url'], ['newsletter_submissions', 'podcast_name', 'website_url']])
  for (const r of await sb(`${table}?select=${nameCol},rss_url,${siteCol}&limit=2000`)) extra.set(norm(r[nameCol] ?? ''), { rss: r.rss_url, site: r[siteCol] })
const enquiries = new Map()
for (const r of await sb('podcast_promotion_enquiries?select=email,podcast_name,podcast_website,rss_feed&limit=500'))
  if (r.podcast_name && r.email) enquiries.set(norm(r.podcast_name), r)

const have = new Set()
for (const f of ['cache.json', 'pi-cache.json']) for (const r of Object.values(readJson(f))) if (r.emails?.length) have.add(r.slug)
const todo = shows.filter(s => !have.has(s.slug))
console.log(`${shows.length} shows, ${have.size} already have an email, ${todo.length} to deep-search`)

const feedInfo = xml => {
  const head = xml.split(/<item[\s>]/i)[0]
  const link = head.match(/<link>\s*(?:<!\[CDATA\[)?\s*(https?:[^<\]\s]+)/i)?.[1]
  return { link, emails: textEmails(head) }
}

async function siteEmails(site) {
  let origin
  try { origin = new URL(site) } catch { return [] }
  const home = await getText(origin.href)
  if (!home) return []
  const pages = new Map([[origin.href, home]])
  const links = [...home.matchAll(/href=["']([^"'#]+)["']/gi)].map(m => m[1])
    .filter(h => /contact|about|press|sponsor|advertis|business|connect|reach|work-with|get-in-touch/i.test(h))
  for (const h of links) {
    let u
    try { u = new URL(h, origin) } catch { continue }
    if (u.hostname.replace(/^www\./, '') !== origin.hostname.replace(/^www\./, '') || pages.has(u.href)) continue
    if (pages.size >= 4) break
    const html = await getText(u.href)
    if (html) pages.set(u.href, html)
  }
  const host = origin.hostname.replace(/^www\./, '')
  const found = new Map()
  for (const html of pages.values()) for (const e of textEmails(html)) if (!found.has(e)) found.set(e, e.split('@')[1].endsWith(host) ? 'website:same-domain' : 'website:other-domain')
  return [...found].map(([email, source]) => ({ email, source }))
}

let done = 0
async function worker() {
  for (let s; (s = todo.shift()); ) {
    done++
    if (cache[s.slug]?.done) continue
    const rec = (cache[s.slug] = { slug: s.slug, title: s.title, done: false, emails: [], via: [] })
    const add = (list, via) => { for (const e of list) if (!rec.emails.some(x => x.email === e.email)) rec.emails.push(e); if (list.length) rec.via.push(via) }
    const ex = extra.get(norm(s.title))
    let feedUrl = s.rss_url || ex?.rss
    const sites = new Set([s.website_url, ex?.site].filter(Boolean))

    const enq = enquiries.get(norm(s.title))
    if (enq) { add([{ email: clean(enq.email), source: 'enquiry' }], 'enquiry'); if (enq.podcast_website) sites.add(enq.podcast_website); feedUrl ||= enq.rss_feed }

    if (!feedUrl) {
      const feeds = await piSearch(s.title)
      await sleep(1000)
      const want = stem(s.title)
      const m = [...new Map((feeds ?? []).filter(f => f.url && stem(f.title ?? '') === want).map(f => [f.url, f])).values()]
      if (m.length === 1) { feedUrl = m[0].url; if (m[0].link) sites.add(m[0].link); rec.matchedAs = m[0].title }
    }
    if (feedUrl) {
      rec.feedUrl = feedUrl
      const xml = await getText(feedUrl, 30000)
      if (xml) {
        const { link, emails } = feedInfo(xml)
        add(emails.map(email => ({ email, source: 'feed-text' })), 'feed')
        if (link) sites.add(link)
      }
    }
    if (!rec.emails.some(e => e.source !== 'enquiry')) {
      for (const site of sites) {
        if (/(^|\.)(facebook|instagram|twitter|x|youtube|spotify|apple|podcasts\.apple|linktr\.ee|anchor\.fm|buzzsprout|podbean|simplecast|libsyn|megaphone|acast)\./i.test(new URL(site, 'https://x').hostname + '.')) continue
        add(await siteEmails(site), 'website')
        if (rec.emails.length) break
      }
    }
    rec.sites = [...sites]
    rec.done = true
    save()
    console.log(`[${done}] ${s.title}: ${rec.emails.map(e => `${e.email} (${e.source})`).join(', ') || '-'}`)
  }
}
await Promise.all(Array.from({ length: 4 }, worker))
const hits = Object.values(cache).filter(r => r.emails?.length)
console.log(`\nDone. ${hits.length} more podcasts with an email from the deep pass.`)
