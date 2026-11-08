#!/usr/bin/env node
// Read-only report of published podcast records that are missing editorial data,
// so an editor can fill them in. Writes nothing to the database.
//
//   node scripts/seo/incomplete-records-report.mjs
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (reads .env.local).
// Outputs docs/data/incomplete-podcast-records.csv and prints a summary.

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const { createClient } = require('@supabase/supabase-js')

const clean = v => String(v ?? '').trim().replace(/^"+|"+$/g, '').replace(/\\n$/g, '').trim()
const env = { ...process.env }
if (fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const i = line.indexOf('=')
    if (i > 0 && !line.startsWith('#') && env[line.slice(0, i)] === undefined) env[line.slice(0, i)] = line.slice(i + 1)
  }
}
const sb = createClient(clean(env.NEXT_PUBLIC_SUPABASE_URL), clean(env.SUPABASE_SERVICE_ROLE_KEY), { auth: { persistSession: false } })

const { data, error } = await sb.from('podcasts').select('*').eq('is_published', true).limit(5000)
if (error) { console.error(error.message); process.exit(1) }

const empty = v => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '')
const UNVERIFIABLE = /\b(awards?|winner|winning|won|shortlist(?:ed)?|nominat\w*|peabody|pulitzer|emmy|bafta|prize|most[- ](?:downloaded|listened|popular|streamed)|millions?|billions?|#\s?1|number (?:one|1)|charts?|top[- ]ranked|biggest)\b/i
const GENERIC = new Set(['must listen', 'worth a listen', 'worth your time', 'for fans of the genre', 'approach with caution'])

// [field-or-test label, weight, test]. Weight 3 = affects what ranks/is shown on key pages.
const CHECKS = [
  ['no editorial verdict', 3, p => empty(p.quick_verdict)],
  ['no Binge Factor', 3, p => p.binge_factor == null],
  ['no artwork', 2, p => empty(p.image_url)],
  ['no best episode to start', 2, p => empty(p.best_episode_to_start)],
  ['no short description', 2, p => empty(p.short_description)],
  ['no country', 2, p => empty(p.country)],
  ['no case types', 2, p => empty(p.case_types)],
  ['no format', 1, p => empty(p.format_type)],
  ['no host name', 1, p => empty(p.host_name)],
  ['no editor rating', 0, p => p.rating == null],           // not scored per show; reported, not weighted
  ['no "if you liked this" picks', 1, p => empty(p.if_you_liked_this)],
  ['no newsletter summary', 1, p => empty(p.newsletter_worthy_summary)],
  ['no episode length', 0, p => empty(p.episode_length)],
  ['no custom SEO title/description', 0, p => empty(p.seo_title) && empty(p.meta_description)],
  ['award/popularity wording needs checking', 2, p => UNVERIFIABLE.test(`${p.short_description ?? ''} ${p.newsletter_worthy_summary ?? ''}`)],
  ['verdict is audience-fit text but binge missing', 0, p => p.binge_factor == null && !empty(p.quick_verdict) && !GENERIC.has(p.quick_verdict.trim().toLowerCase())],
]

const rows = []
const totals = Object.fromEntries(CHECKS.map(c => [c[0], 0]))
for (const p of data) {
  const gaps = CHECKS.filter(([, , t]) => t(p))
  gaps.forEach(([l]) => totals[l]++)
  const weight = gaps.reduce((a, [, w]) => a + w, 0)
  if (weight > 0) rows.push({ slug: p.slug, title: p.title, must: String(p.quick_verdict ?? '').trim().toLowerCase() === 'must listen', weight, gaps: gaps.filter(g => g[1] > 0).map(g => g[0]) })
}
// Must-listen shows first (they feed the best-of page), then by weight
rows.sort((a, b) => (b.must - a.must) || (b.weight - a.weight) || a.title.localeCompare(b.title))

const q = v => `"${String(v).replace(/"/g, '""')}"`
const csv = ['slug,title,must_listen,priority_score,gaps', ...rows.map(r => [r.slug, q(r.title), r.must, r.weight, q(r.gaps.join('; '))].join(','))].join('\n') + '\n'
fs.mkdirSync('docs/data', { recursive: true })
fs.writeFileSync('docs/data/incomplete-podcast-records.csv', csv)

console.log(`Published podcasts: ${data.length}`)
console.log(`Records with at least one weighted gap: ${rows.length} (Must listen: ${rows.filter(r => r.must).length})`)
for (const [label, n] of Object.entries(totals)) console.log(`${String(n).padStart(5)}  ${label}`)
// Data-quality observations that are not per-field gaps
const variants = {}
for (const p of data) for (const t of p.case_types ?? []) { const k = t.trim().toLowerCase(); (variants[k] ??= new Set()).add(t.trim()) }
const split = Object.values(variants).filter(s => s.size > 1).map(s => [...s].join(' / '))
console.log(`Case-type spelling variants: ${split.join(' | ')}`)
const fmt = {}
for (const p of data) fmt[p.format_type ?? '(none)'] = (fmt[p.format_type ?? '(none)'] ?? 0) + 1
console.log('Format values:', JSON.stringify(fmt))
