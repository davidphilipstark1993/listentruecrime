// Creates a SendGrid Marketing list and loads the harvested podcast contacts into it.
//
// Usage:
//   node scripts/outreach/sendgrid-import.mjs outreach-data/podcast-contacts.csv            # dry run
//   SENDGRID_API_KEY=... node scripts/outreach/sendgrid-import.mjs <csv> --apply
//
// Needs an API key with Marketing > Lists + Contacts + Custom Fields access.
// This only builds the list. It never sends anything: create the Single Send in
// the SendGrid UI (see emails/podcast-backlinks-oct26/email-notes.md) and review it first.

import fs from 'node:fs'

const LIST_NAME = 'Podcast backlink outreach (Oct 2026)'
const [csvPath, ...flags] = process.argv.slice(2)
const apply = flags.includes('--apply')
if (!csvPath) throw new Error('Usage: sendgrid-import.mjs <podcast-contacts.csv> [--apply]')

// Minimal RFC4180 parser (quoted fields, doubled quotes).
function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = '' }
    else if (c !== '\r') f += c
  }
  const [head, ...body] = rows
  return body.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])))
}

// One contact per email address; if an address covers several shows (networks), join titles.
// Platform relay / metadata mailboxes aren't the show's own team and tend to bounce.
const RELAY = /@(anchor\.fm|mg-eu\.acast\.com|mg\.acast\.com|audible\.com)$|^podcast_metadata@/
const byEmail = new Map()
for (const r of parseCsv(fs.readFileSync(csvPath, 'utf8'))) {
  const e = r.email.trim().toLowerCase()
  if (RELAY.test(e)) continue
  const cur = byEmail.get(e)
  if (!cur) byEmail.set(e, { email: e, titles: [r.podcast_title], url: r.podcast_page_url })
  else if (!cur.titles.includes(r.podcast_title)) cur.titles.push(r.podcast_title)
}
const contacts = [...byEmail.values()].map(c => ({
  email: c.email,
  custom_fields: { podcast_title: c.titles[0], podcast_url: c.url },
}))
console.log(`${contacts.length} unique contacts to load into "${LIST_NAME}"`)
if (!apply) { console.log('Dry run. Pass --apply to create the list and upload.'); process.exit(0) }

const key = process.env.SENDGRID_API_KEY?.trim()
if (!key) throw new Error('SENDGRID_API_KEY not set')
const api = async (method, path, body) => {
  const res = await fetch(`https://api.sendgrid.com/v3${path}`, {
    method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`)
  return text ? JSON.parse(text) : {}
}

// Custom fields used as {{podcast_title}} / {{podcast_url}} merge tags in the template.
const existing = await api('GET', '/marketing/field_definitions')
const have = new Set((existing.custom_fields ?? []).map(f => f.name))
const ids = {}
for (const name of ['podcast_title', 'podcast_url']) {
  if (!have.has(name)) await api('POST', '/marketing/field_definitions', { name, field_type: 'Text' })
}
const fields = await api('GET', '/marketing/field_definitions')
for (const f of fields.custom_fields ?? []) ids[f.name] = f.id

const lists = await api('GET', '/marketing/lists?page_size=1000')
let list = (lists.result ?? []).find(l => l.name === LIST_NAME)
if (!list) list = await api('POST', '/marketing/lists', { name: LIST_NAME })
console.log(`List "${LIST_NAME}": ${list.id}`)

for (let i = 0; i < contacts.length; i += 100) {
  const batch = contacts.slice(i, i + 100).map(c => ({
    email: c.email,
    custom_fields: { [ids.podcast_title]: c.custom_fields.podcast_title, [ids.podcast_url]: c.custom_fields.podcast_url },
  }))
  const { job_id } = await api('PUT', '/marketing/contacts', { list_ids: [list.id], contacts: batch })
  console.log(`Uploaded ${Math.min(i + 100, contacts.length)}/${contacts.length} (job ${job_id})`)
}
console.log('Done. SendGrid processes uploads asynchronously; check the list count in the UI after a few minutes.')
