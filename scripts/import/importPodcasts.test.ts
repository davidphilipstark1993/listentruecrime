import { describe, it, expect } from 'vitest'
import {
  extractAppleId,
  prepareRecord,
  renderMarkdownReport,
  runImport,
  type ExistingRecord,
  type ImportRowInsert,
  type ImportStore,
  type PodcastInsert,
  type PreparedRecord,
} from './importPodcasts'

function memoryStore(seed: ExistingRecord[] = [], opts: { failImportFor?: string } = {}) {
  const podcasts: (PodcastInsert & { id: string })[] = []
  const imports: ImportRowInsert[] = []
  const store: ImportStore = {
    async loadExisting() {
      return [
        ...seed,
        ...podcasts.map(p => ({ origin: 'podcasts' as const, id: p.id, title: p.title, slug: p.slug, appleId: p.apple_podcast_id })),
        ...imports.map(i => ({ origin: 'podcast_imports' as const, id: i.slug, title: i.title, slug: i.slug, appleId: i.apple_podcast_id })),
      ]
    },
    async insertPodcast(row) {
      const id = `p${podcasts.length + 1}`
      podcasts.push({ ...row, id })
      return id
    },
    async insertImport(row) {
      if (row.slug === opts.failImportFor) throw new Error('import insert failed')
      imports.push(row)
    },
    async deletePodcast(id) {
      podcasts.splice(podcasts.findIndex(p => p.id === id), 1)
    },
  }
  return { store, podcasts, imports }
}

const COMPLETE = {
  title: 'Complete Show',
  slug: 'complete-show',
  country_code: 'GB',
  categories: ['Murder', 'Missing Persons', 'Scams'],
  description: 'A description.',
  short_description: 'Short.',
  host: 'A Host',
  official_website: 'https://example.com/show',
  apple_podcasts_url: 'https://podcasts.apple.com/gb/podcast/complete-show/id111',
  contact_email: 'hello@example.com',
  episode_count_at_research: 12,
  rating: 4.5,
  rating_count: 10,
  source_urls: ['https://example.com/source'],
  source_checked: '2026-10-18',
  verification_status: null,
}

function prepared(overrides: Record<string, unknown> = {}): PreparedRecord {
  const result = prepareRecord({ ...COMPLETE, ...overrides })
  if ('error' in result) throw new Error(result.error)
  return result
}

const opts = { apply: true, sourceFile: 'test.json' }

describe('extractAppleId', () => {
  it('reads the id from a show URL', () => {
    expect(extractAppleId('https://podcasts.apple.com/us/podcast/strange-but-true-crime/id1815708242')).toBe('1815708242')
  })
  it('ignores an episode query string', () => {
    expect(extractAppleId('https://podcasts.apple.com/gb/podcast/x/id42?i=1000758938509')).toBe('42')
  })
  it('does not treat a genre URL as a show id', () => {
    expect(extractAppleId('https://podcasts.apple.com/gb/genre/1488')).toBeNull()
  })
  it('returns null for null, blank, non-Apple and malformed URLs', () => {
    expect(extractAppleId(null)).toBeNull()
    expect(extractAppleId('  ')).toBeNull()
    expect(extractAppleId('https://example.com/podcast/x/id42')).toBeNull()
    expect(extractAppleId('not a url')).toBeNull()
  })
})

describe('prepareRecord — nulls and no guessing', () => {
  it('keeps unknown values as null, never empty strings', () => {
    const p = prepared({ host: null, official_website: '   ', description: '', episode_count_at_research: null, categories: [] })
    expect(p.podcast.host_name).toBeNull()
    expect(p.podcast.website_url).toBeNull()
    expect(p.podcast.description).toBeNull()
    expect(p.podcast.episode_count).toBeNull()
    expect(p.podcast.case_types).toBeNull()
    for (const value of [...Object.values(p.podcast), ...Object.values(p.importRow)]) expect(value).not.toBe('')
  })

  it('does not invent artwork, ratings, episode counts or hosts', () => {
    const p = prepared({ host: null, episode_count_at_research: null, rating: undefined, rating_count: undefined })
    expect(p.podcast).not.toHaveProperty('image_url')
    expect(p.podcast).not.toHaveProperty('rating')
    expect(p.podcast.host_name).toBeNull()
    expect(p.importRow.source_rating).toBeNull()
    expect(p.importRow.source_rating_count).toBeNull()
  })

  it("keeps the source's Apple rating out of the public podcasts row", () => {
    const p = prepared()
    expect(JSON.stringify(p.podcast)).not.toContain('4.5')
    expect(p.importRow.source_rating).toBe(4.5)
  })

  it('stores contact_email only when explicitly present and valid, and only in the admin table', () => {
    expect(prepared().importRow.contact_email).toBe('hello@example.com')
    expect(prepared().podcast).not.toHaveProperty('contact_email')
    expect(prepared({ contact_email: null }).importRow.contact_email).toBeNull()
    expect(prepared({ contact_email: undefined }).importRow.contact_email).toBeNull()
    const bad = prepared({ contact_email: 'Advertising email available on Apple' })
    expect(bad.importRow.contact_email).toBeNull()
    expect(bad.warnings.join(' ')).toMatch(/not a valid address/)
  })

  it('preserves provenance verbatim', () => {
    const p = prepared({ verification_status: 'Verify RSS', source_checked: '2026-10-18' })
    expect(p.importRow.source_urls).toEqual(['https://example.com/source'])
    expect(p.importRow.source_checked).toBe('2026-10-18')
    expect(p.importRow.verification_status).toBe('Verify RSS')
    expect(p.importRow.raw).toMatchObject({ title: 'Complete Show', contact_email: 'hello@example.com' })
  })

  it('nulls an impossible source_checked date instead of failing the insert', () => {
    expect(prepared({ source_checked: '2026-02-31' }).importRow.source_checked).toBeNull()
    expect(prepared({ source_checked: 'yesterday' }).importRow.source_checked).toBeNull()
  })

  it('maps GB to the site code UK and aligns case type spellings', () => {
    const p = prepared()
    expect(p.podcast.country).toBe('UK')
    expect(p.podcast.case_types).toEqual(['Murder', 'Missing Person', 'Scam'])
  })

  it('only claims Apple Podcasts as a platform when a show id was found', () => {
    expect(prepared().podcast.platforms).toEqual(['Apple Podcasts'])
    expect(prepared({ apple_podcasts_url: 'https://podcasts.apple.com/gb/genre/1488' }).podcast.platforms).toBeNull()
    expect(prepared({ apple_podcasts_url: null }).podcast.platforms).toBeNull()
  })

  it('rejects records without a title or with a bad slug', () => {
    expect(prepareRecord({ title: '  ' })).toHaveProperty('error')
    expect(prepareRecord({ ...COMPLETE, slug: 'Bad Slug!' })).toHaveProperty('error')
    expect(prepareRecord(null)).toHaveProperty('error')
  })
})

describe('prepareRecord — import status', () => {
  it('is ready only when every required field is present and no verification is outstanding', () => {
    const p = prepared()
    expect(p.podcast.status).toBe('ready')
    expect(p.missingFields).toEqual([])
  })
  it('needs verification when a required site field is missing', () => {
    const p = prepared({ host: null, official_website: null })
    expect(p.podcast.status).toBe('needs_verification')
    expect(p.missingFields).toEqual(['host_name', 'website_url'])
  })
  it("needs verification when the source's own verification_status asks for a check", () => {
    expect(prepared({ verification_status: 'Verify RSS feed' }).podcast.status).toBe('needs_verification')
  })
  it('is never published automatically', () => {
    expect(prepared().podcast.is_published).toBe(false)
  })
})

describe('runImport', () => {
  it('inserts new records, unpublished, with an audit row each', async () => {
    const { store, podcasts, imports } = memoryStore()
    const report = await runImport([COMPLETE, { ...COMPLETE, title: 'Other', slug: 'other', apple_podcasts_url: null }], store, opts)
    expect(report.totals).toMatchObject({ records: 2, inserted: 2, skippedDuplicates: 0, errors: 0 })
    expect(podcasts).toHaveLength(2)
    expect(imports).toHaveLength(2)
    expect(podcasts.every(p => p.is_published === false)).toBe(true)
    expect(imports[0].podcast_id).toBe('p1')
  })

  it('is idempotent: a second run inserts nothing', async () => {
    const { store, podcasts, imports } = memoryStore()
    const records = [COMPLETE, { ...COMPLETE, title: 'Other', slug: 'other', apple_podcasts_url: null }]
    await runImport(records, store, opts)
    const second = await runImport(records, store, opts)
    expect(second.totals).toMatchObject({ inserted: 0, skippedDuplicates: 2 })
    expect(podcasts).toHaveLength(2)
    expect(imports).toHaveLength(2)
  })

  it('skips an existing show matched by Apple Podcasts ID even when the title differs', async () => {
    const { store, podcasts } = memoryStore([{ origin: 'podcasts', id: 'x', title: 'Renamed Show', slug: 'renamed', appleId: '111' }])
    const report = await runImport([COMPLETE], store, opts)
    expect(podcasts).toHaveLength(0)
    expect(report.skippedDuplicates[0].reason).toMatch(/Apple Podcasts ID 111/)
  })

  it('skips an existing show matched by normalized title', async () => {
    const { store, podcasts } = memoryStore([{ origin: 'podcasts', id: 'x', title: 'COMPLETE SHOW — Podcast!', slug: 'other-slug', appleId: null }])
    const report = await runImport([COMPLETE], store, opts)
    expect(podcasts).toHaveLength(0)
    expect(report.skippedDuplicates[0].reason).toMatch(/normalized title/)
  })

  it('skips, not overwrites, when only the slug collides with a different show', async () => {
    const { store, podcasts } = memoryStore([{ origin: 'podcasts', id: 'x', title: 'Totally Different', slug: 'complete-show', appleId: null }])
    const report = await runImport([COMPLETE], store, opts)
    expect(podcasts).toHaveLength(0)
    expect(report.skippedDuplicates[0].reason).toMatch(/slug "complete-show" is taken/)
  })

  it('does not treat records that share a genre URL as duplicates of each other', async () => {
    const genre = 'https://podcasts.apple.com/au/genre/1488'
    const { store, podcasts } = memoryStore()
    const report = await runImport(
      [
        { ...COMPLETE, title: 'One', slug: 'one', apple_podcasts_url: genre },
        { ...COMPLETE, title: 'Two', slug: 'two', apple_podcasts_url: genre },
      ],
      store,
      opts
    )
    expect(report.totals.inserted).toBe(2)
    expect(podcasts.map(p => p.apple_podcast_id)).toEqual([null, null])
  })

  it('catches duplicates inside the same file', async () => {
    const { store, podcasts } = memoryStore()
    const report = await runImport([COMPLETE, { ...COMPLETE, slug: 'complete-show-2' }], store, opts)
    expect(podcasts).toHaveLength(1)
    expect(report.skippedDuplicates).toHaveLength(1)
  })

  it('writes nothing in a dry run, but still reports and still detects duplicates', async () => {
    const { store, podcasts, imports } = memoryStore([{ origin: 'podcasts', id: 'x', title: 'Other', slug: 'other', appleId: null }])
    const report = await runImport([COMPLETE, { ...COMPLETE, title: 'Other', slug: 'other', apple_podcasts_url: null }], store, { ...opts, apply: false })
    expect(report.mode).toBe('dry-run')
    expect(report.totals).toMatchObject({ inserted: 1, skippedDuplicates: 1 })
    expect(podcasts).toHaveLength(0)
    expect(imports).toHaveLength(0)
  })

  it('rolls back the podcast row if its audit row cannot be written', async () => {
    const { store, podcasts, imports } = memoryStore([], { failImportFor: 'complete-show' })
    const report = await runImport([COMPLETE], store, opts)
    expect(report.totals.errors).toBe(1)
    expect(podcasts).toHaveLength(0)
    expect(imports).toHaveLength(0)
  })

  it('treats a unique-constraint race as a skipped duplicate, not an error', async () => {
    const { store } = memoryStore()
    store.insertPodcast = async () => {
      throw Object.assign(new Error('duplicate key value'), { code: '23505' })
    }
    const report = await runImport([COMPLETE], store, opts)
    expect(report.totals).toMatchObject({ inserted: 0, skippedDuplicates: 1, errors: 0 })
  })

  it('keeps going after a bad record', async () => {
    const { store, podcasts } = memoryStore()
    const report = await runImport([{ title: '' }, COMPLETE], store, opts)
    expect(report.totals).toMatchObject({ inserted: 1, errors: 1 })
    expect(podcasts).toHaveLength(1)
  })
})

describe('report', () => {
  it('lists missing website, missing email and manual verification, without printing emails', async () => {
    const { store } = memoryStore()
    const report = await runImport(
      [
        COMPLETE,
        { ...COMPLETE, title: 'No Site', slug: 'no-site', apple_podcasts_url: null, official_website: null, contact_email: null, verification_status: 'Check it' },
      ],
      store,
      opts
    )
    expect(report.needsManualVerification.map(e => e.title)).toEqual(['No Site'])
    expect(report.missingOfficialWebsite.map(e => e.title)).toEqual(['No Site'])
    expect(report.missingContactEmail.map(e => e.title)).toEqual(['No Site'])
    const md = renderMarkdownReport(report)
    expect(md).toContain('## Inserted (2)')
    expect(md).toContain('source note: Check it')
    expect(md).not.toContain('hello@example.com')
    expect(JSON.stringify(report)).not.toContain('hello@example.com')
  })

  it('says plainly that an offline dry run did not compare against the database', async () => {
    const { store } = memoryStore()
    const report = await runImport([COMPLETE], store, { ...opts, apply: false, offline: true })
    expect(renderMarkdownReport(report)).toMatch(/OFFLINE/)
  })
})
