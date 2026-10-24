// Merges the iTunes pass (cache.json) and the Podcast Index pass (pi-cache.json)
// into one podcast-contacts-merged.csv in the same shape sendgrid-import.mjs reads.
//
// Usage: node scripts/outreach/merge-contacts.mjs [outDir]

import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://www.listentruecrime.com'
const outDir = path.resolve(process.argv[2] ?? 'outreach-data')
const load = f => (fs.existsSync(path.join(outDir, f)) ? Object.values(JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'))) : [])
const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`

const bySlug = new Map()
for (const [pass, rows] of [['itunes', load('cache.json')], ['podcastindex', load('pi-cache.json')], ['deep', load('deep-cache.json')]]) {
  for (const r of rows) {
    if (!r.emails?.length) continue
    const cur = bySlug.get(r.slug) ?? { title: r.title, slug: r.slug, emails: new Map() }
    for (const e of r.emails) if (!cur.emails.has(e.email)) cur.emails.set(e.email, { source: e.source, feedUrl: r.feedUrl, pass })
    bySlug.set(r.slug, cur)
  }
}

const lines = ['email,podcast_title,slug,source,feed_url,podcast_page_url']
for (const s of bySlug.values())
  for (const [email, e] of s.emails) lines.push([email, q(s.title), s.slug, `${e.pass === 'deep' ? '' : e.pass + ':'}${e.source}`, e.feedUrl ?? "", `${BASE}/podcasts/${s.slug}`].join(','))
fs.writeFileSync(path.join(outDir, 'podcast-contacts-merged.csv'), lines.join('\n') + '\n')

const only = pass => [...bySlug.values()].filter(s => [...s.emails.values()].every(e => e.pass === pass)).length
console.log(`${bySlug.size} podcasts with an email (${only('itunes')} iTunes only, ${only('podcastindex')} Podcast Index only); ${lines.length - 1} rows written to podcast-contacts-merged.csv`)
