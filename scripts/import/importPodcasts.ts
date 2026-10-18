import { normalizeName } from '../discovery/normalize'
import { slugify } from '@/lib/utils'

// Bulk podcast import. Pure logic lives here so it can be tested without a
// database; the Supabase-backed ImportStore is in supabaseStore.ts.
//
// Rules this module enforces (see migration 017_podcast_imports.sql):
//  - null / blank = unknown. Nothing is ever defaulted, guessed or inferred
//    beyond a fixed, documented mapping (country code, case-type spelling).
//  - Rows are matched to existing records by Apple Podcasts show ID, then by
//    normalized title, then by slug. Matches are skipped, never updated.
//  - New podcasts are always inserted unpublished (is_published = false).
//  - Contact details and provenance go to the admin-only podcast_imports
//    table, never to the world-readable podcasts table.

export type ImportStatus = 'needs_verification' | 'ready'

/** Site fields a podcast must have to be import_status = 'ready'. */
export const REQUIRED_SITE_FIELDS = [
  'title',
  'slug',
  'description',
  'short_description',
  'country',
  'case_types',
  'host_name',
  'website_url',
] as const
export type RequiredSiteField = (typeof REQUIRED_SITE_FIELDS)[number]

export interface PodcastInsert {
  title: string
  slug: string
  description: string | null
  short_description: string | null
  country: string | null
  case_types: string[] | null
  host_name: string | null
  website_url: string | null
  episode_count: string | null
  platforms: string[] | null
  apple_podcast_id: string | null
  status: ImportStatus
  is_published: false
}

export interface ImportRowInsert {
  slug: string
  title: string
  normalized_title: string
  apple_podcast_id: string | null
  apple_podcasts_url: string | null
  podcast_id: string
  import_status: ImportStatus
  missing_fields: string[]
  contact_email: string | null
  contact_note: string | null
  contact_url: string | null
  official_website: string | null
  source_urls: string[] | null
  source_checked: string | null
  verification_status: string | null
  show_status: string | null
  source_rating: number | null
  source_rating_count: number | null
  raw: Record<string, unknown>
}

export interface ExistingRecord {
  origin: 'podcasts' | 'podcast_imports'
  id: string
  title: string
  slug: string | null
  appleId: string | null
}

export interface ImportStore {
  loadExisting(): Promise<ExistingRecord[]>
  insertPodcast(row: PodcastInsert): Promise<string>
  insertImport(row: ImportRowInsert): Promise<void>
  deletePodcast(id: string): Promise<void>
}

export interface PreparedRecord {
  podcast: PodcastInsert
  importRow: Omit<ImportRowInsert, 'podcast_id'>
  normalizedTitle: string
  missingFields: RequiredSiteField[]
  warnings: string[]
}

// ---------- field cleaning ----------

/** Trimmed string, or null for null/undefined/blank/non-string. Never ''. */
export function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function cleanNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function cleanStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items = value.map(cleanString).filter((v): v is string => v !== null)
  return items.length ? Array.from(new Set(items)) : null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanEmail(value: unknown): { email: string | null; warning?: string } {
  const raw = cleanString(value)
  if (raw === null) return { email: null }
  if (!EMAIL_RE.test(raw)) return { email: null, warning: 'contact_email is present but not a valid address; not stored' }
  return { email: raw }
}

function cleanDate(value: unknown): string | null {
  const raw = cleanString(value)
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const d = new Date(`${raw}T00:00:00Z`)
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw ? null : raw
}

/**
 * Apple Podcasts show ID from a *show* URL, e.g.
 * https://podcasts.apple.com/us/podcast/name/id1815708242 -> "1815708242".
 * Genre/charts URLs (…/genre/1488) have no show ID and return null: a genre
 * number is not a podcast identifier and must never be used for matching.
 */
export function extractAppleId(url: unknown): string | null {
  const raw = cleanString(url)
  if (!raw) return null
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.hostname !== 'podcasts.apple.com') return null
  const segments = parsed.pathname.split('/').filter(Boolean)
  if (!segments.includes('podcast')) return null
  for (const segment of segments) {
    const match = /^id(\d+)$/.exec(segment)
    if (match) return match[1]
  }
  return null
}

// The site stores 'UK' (see CATEGORY_TO_CASE_TYPES in lib/types/database.ts),
// the source file uses ISO 3166 'GB'. Anything else passes through as given.
function mapCountry(countryCode: unknown): string | null {
  const code = cleanString(countryCode)?.toUpperCase() ?? null
  if (code === null) return null
  return code === 'GB' ? 'UK' : code
}

// Align the source's plural spellings with the case types the site already
// filters on (CATEGORY_TO_CASE_TYPES). Unlisted categories pass through.
const CASE_TYPE_ALIASES: Record<string, string> = {
  'missing persons': 'Missing Person',
  scams: 'Scam',
}

function mapCaseTypes(categories: unknown): string[] | null {
  const list = cleanStringList(categories)
  if (!list) return null
  const mapped = list.map(c => CASE_TYPE_ALIASES[c.toLowerCase()] ?? c)
  return Array.from(new Set(mapped))
}

// ---------- preparation ----------

export function prepareRecord(input: unknown): PreparedRecord | { error: string } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { error: 'record is not an object' }
  }
  const src = input as Record<string, unknown>

  const title = cleanString(src.title)
  if (!title) return { error: 'record has no title' }

  const slug = cleanString(src.slug) ?? slugify(title)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { error: `"${title}": slug "${slug}" is not kebab-case` }

  const appleUrl = cleanString(src.apple_podcasts_url)
  const appleId = extractAppleId(appleUrl)
  const { email, warning: emailWarning } = cleanEmail(src.contact_email)
  const episodes = cleanNumber(src.episode_count_at_research)
  const verificationStatus = cleanString(src.verification_status)
  const normalizedTitle = normalizeName(title)

  const warnings: string[] = []
  if (emailWarning) warnings.push(emailWarning)
  if (appleUrl && !appleId) warnings.push('apple_podcasts_url is not a show URL (no id…); Apple ID matching skipped')

  const podcast: Omit<PodcastInsert, 'status'> & { status?: ImportStatus } = {
    title,
    slug,
    description: cleanString(src.description),
    short_description: cleanString(src.short_description),
    country: mapCountry(src.country_code),
    case_types: mapCaseTypes(src.categories),
    host_name: cleanString(src.host),
    website_url: cleanString(src.official_website),
    episode_count: episodes === null ? null : `${episodes} episodes`,
    platforms: appleId ? ['Apple Podcasts'] : null,
    apple_podcast_id: appleId,
    is_published: false,
  }

  const missingFields = REQUIRED_SITE_FIELDS.filter(field => {
    const value = podcast[field]
    return value === null || value === undefined
  })

  // A record whose own verification_status still asks for a check is not
  // complete, even if every field is filled in.
  const importStatus: ImportStatus = missingFields.length === 0 && verificationStatus === null ? 'ready' : 'needs_verification'

  return {
    podcast: { ...podcast, status: importStatus } as PodcastInsert,
    importRow: {
      slug,
      title,
      normalized_title: normalizedTitle,
      apple_podcast_id: appleId,
      apple_podcasts_url: appleUrl,
      import_status: importStatus,
      missing_fields: [...missingFields],
      contact_email: email,
      contact_note: cleanString(src.contact_note),
      contact_url: cleanString(src.contact_url),
      official_website: podcast.website_url,
      source_urls: cleanStringList(src.source_urls),
      source_checked: cleanDate(src.source_checked),
      verification_status: verificationStatus,
      show_status: cleanString(src.status),
      source_rating: cleanNumber(src.rating),
      source_rating_count: cleanNumber(src.rating_count),
      raw: src,
    },
    normalizedTitle,
    missingFields,
    warnings,
  }
}

// ---------- duplicate matching ----------

export interface DuplicateMatch {
  by: 'apple_id' | 'title' | 'slug'
  existing: ExistingRecord
}

export function findExisting(prepared: PreparedRecord, existing: ExistingRecord[]): DuplicateMatch | null {
  const appleId = prepared.podcast.apple_podcast_id
  if (appleId) {
    const hit = existing.find(e => e.appleId === appleId)
    if (hit) return { by: 'apple_id', existing: hit }
  }
  const byTitle = existing.find(e => normalizeName(e.title) === prepared.normalizedTitle)
  if (byTitle) return { by: 'title', existing: byTitle }
  // Different show, same slug: inserting would violate podcasts_slug_key.
  const bySlug = existing.find(e => e.slug === prepared.podcast.slug)
  if (bySlug) return { by: 'slug', existing: bySlug }
  return null
}

// ---------- run + report ----------

export interface ReportEntry {
  title: string
  slug: string
  importStatus?: ImportStatus
  reason?: string
  missingFields?: string[]
  verificationStatus?: string | null
  hasContactEmail?: boolean
  hasOfficialWebsite?: boolean
  warnings?: string[]
}

export interface ImportReport {
  mode: 'apply' | 'dry-run'
  compared: 'database' | 'nothing (offline)'
  generatedAt: string
  sourceFile: string
  totals: { records: number; inserted: number; skippedDuplicates: number; errors: number }
  inserted: ReportEntry[]
  skippedDuplicates: ReportEntry[]
  needsManualVerification: ReportEntry[]
  missingOfficialWebsite: ReportEntry[]
  missingContactEmail: ReportEntry[]
  errors: ReportEntry[]
}

export interface RunOptions {
  apply: boolean
  sourceFile: string
  /** Skip loading existing records (dry-run only). */
  offline?: boolean
  now?: () => Date
}

function describeMatch(match: DuplicateMatch): string {
  const where = match.existing.origin === 'podcast_imports' ? 'previous import' : 'podcasts table'
  switch (match.by) {
    case 'apple_id':
      return `Apple Podcasts ID ${match.existing.appleId} already exists as "${match.existing.title}" (${where})`
    case 'title':
      return `normalized title matches "${match.existing.title}" (${where})`
    case 'slug':
      return `slug "${match.existing.slug}" is taken by a different title, "${match.existing.title}" (${where})`
  }
}

export async function runImport(records: unknown[], store: ImportStore, options: RunOptions): Promise<ImportReport> {
  const existing: ExistingRecord[] = options.offline ? [] : await store.loadExisting()
  const report: ImportReport = {
    mode: options.apply ? 'apply' : 'dry-run',
    compared: options.offline ? 'nothing (offline)' : 'database',
    generatedAt: (options.now?.() ?? new Date()).toISOString(),
    sourceFile: options.sourceFile,
    totals: { records: records.length, inserted: 0, skippedDuplicates: 0, errors: 0 },
    inserted: [],
    skippedDuplicates: [],
    needsManualVerification: [],
    missingOfficialWebsite: [],
    missingContactEmail: [],
    errors: [],
  }

  for (const input of records) {
    const prepared = prepareRecord(input)
    if ('error' in prepared) {
      report.errors.push({ title: cleanString((input as Record<string, unknown>)?.title) ?? '(untitled)', slug: '', reason: prepared.error })
      continue
    }

    const entry: ReportEntry = {
      title: prepared.podcast.title,
      slug: prepared.podcast.slug,
      importStatus: prepared.podcast.status,
      missingFields: prepared.missingFields,
      verificationStatus: prepared.importRow.verification_status,
      hasContactEmail: prepared.importRow.contact_email !== null,
      hasOfficialWebsite: prepared.podcast.website_url !== null,
      warnings: prepared.warnings,
    }

    const match = findExisting(prepared, existing)
    if (match) {
      report.skippedDuplicates.push({ ...entry, reason: describeMatch(match) })
      continue
    }

    if (options.apply) {
      try {
        const podcastId = await store.insertPodcast(prepared.podcast)
        try {
          await store.insertImport({ ...prepared.importRow, podcast_id: podcastId })
        } catch (err) {
          // Keep the two tables in step: no podcast without its audit row.
          await store.deletePodcast(podcastId)
          throw err
        }
      } catch (err) {
        const code = (err as { code?: string }).code
        const message = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err)
        if (code === '23505') {
          // Unique-constraint race: another run inserted it after we loaded.
          report.skippedDuplicates.push({ ...entry, reason: `unique constraint hit on insert (${message})` })
        } else {
          report.errors.push({ ...entry, reason: message })
        }
        continue
      }
    }

    // Later records in the same file are compared against this one too.
    existing.push({
      origin: 'podcast_imports',
      id: prepared.podcast.slug,
      title: prepared.podcast.title,
      slug: prepared.podcast.slug,
      appleId: prepared.podcast.apple_podcast_id,
    })
    report.inserted.push(entry)
  }

  report.totals.inserted = report.inserted.length
  report.totals.skippedDuplicates = report.skippedDuplicates.length
  report.totals.errors = report.errors.length
  report.needsManualVerification = report.inserted.filter(e => e.importStatus === 'needs_verification')
  report.missingOfficialWebsite = report.inserted.filter(e => !e.hasOfficialWebsite)
  report.missingContactEmail = report.inserted.filter(e => !e.hasContactEmail)
  return report
}

// ---------- report rendering ----------

function listOrNone(entries: ReportEntry[], line: (e: ReportEntry) => string): string {
  return entries.length ? entries.map(line).join('\n') : '_None._'
}

/**
 * Markdown for the admin review. Deliberately prints no contact details
 * (only whether one exists), so the report is safe to share or commit.
 */
export function renderMarkdownReport(r: ImportReport): string {
  const verb = r.mode === 'apply' ? 'Inserted' : 'Would insert'
  const banner =
    r.mode === 'dry-run'
      ? `> **Dry run${r.compared === 'database' ? '' : ', OFFLINE'}.** Nothing was written.${
          r.compared === 'database' ? '' : ' Existing records were NOT loaded, so duplicates against the database are not detected below.'
        }\n\n`
      : ''
  return [
    `# Podcast import review`,
    ``,
    banner + `- Source: \`${r.sourceFile}\``,
    `- Generated: ${r.generatedAt}`,
    `- Mode: ${r.mode} (compared against: ${r.compared})`,
    `- Records in file: ${r.totals.records}`,
    `- ${verb}: ${r.totals.inserted}`,
    `- Skipped as duplicates: ${r.totals.skippedDuplicates}`,
    `- Errors: ${r.totals.errors}`,
    `- All imported podcasts are unpublished (is_published = false) until an admin publishes them.`,
    ``,
    `## ${verb} (${r.inserted.length})`,
    listOrNone(r.inserted, e => `- **${e.title}** (\`${e.slug}\`): ${e.importStatus}`),
    ``,
    `## Skipped duplicates (${r.skippedDuplicates.length})`,
    listOrNone(r.skippedDuplicates, e => `- **${e.title}** (\`${e.slug}\`): ${e.reason}`),
    ``,
    `## Needs manual verification (${r.needsManualVerification.length})`,
    listOrNone(r.needsManualVerification, e => {
      const bits = [
        e.missingFields?.length ? `missing: ${e.missingFields.join(', ')}` : null,
        e.verificationStatus ? `source note: ${e.verificationStatus}` : null,
        ...(e.warnings ?? []),
      ].filter(Boolean)
      return `- **${e.title}**: ${bits.join('; ') || 'no detail'}`
    }),
    ``,
    `## Missing official website (${r.missingOfficialWebsite.length})`,
    listOrNone(r.missingOfficialWebsite, e => `- ${e.title}`),
    ``,
    `## Missing contact email (${r.missingContactEmail.length})`,
    listOrNone(r.missingContactEmail, e => `- ${e.title}`),
    ``,
    `## Errors (${r.errors.length})`,
    listOrNone(r.errors, e => `- ${e.title}: ${e.reason}`),
    ``,
  ].join('\n')
}
