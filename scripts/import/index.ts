import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { createDiscoveryClient } from '../discovery/supabaseClient'
import { runImport, renderMarkdownReport, type ImportStore } from './importPodcasts'
import { assertMigrationApplied, createSupabaseStore } from './supabaseStore'

// Usage:
//   npx tsx scripts/import/index.ts [--file path.json] [--apply] [--offline]
//
// Default is a DRY RUN against the real database: it reports what would be
// inserted and writes nothing. Pass --apply to insert. --offline (dry run
// only) skips the database entirely and does NOT detect duplicates.
// Running with --apply twice is safe: the second run skips every record.

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const offline = args.includes('--offline')
const fileArg = args.indexOf('--file')
const sourceFile = fileArg >= 0 ? args[fileArg + 1] : 'scripts/import/data/new-podcasts.json'

async function main() {
  if (apply && offline) throw new Error('--offline cannot be combined with --apply')
  if (!sourceFile) throw new Error('--file needs a path')

  const parsed: unknown = JSON.parse(readFileSync(sourceFile, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${sourceFile} must contain a JSON array of podcasts`)

  let store: ImportStore
  if (offline) {
    store = { loadExisting: async () => [], insertPodcast: async () => '', insertImport: async () => {}, deletePodcast: async () => {} }
  } else {
    const supabase = createDiscoveryClient()
    await assertMigrationApplied(supabase)
    store = createSupabaseStore(supabase)
  }

  const report = await runImport(parsed, store, { apply, sourceFile, offline })

  const reportDir = 'scripts/import/reports'
  mkdirSync(reportDir, { recursive: true })
  const stamp = report.generatedAt.replace(/[:.]/g, '-')
  const base = path.join(reportDir, `${stamp}-${report.mode}${offline ? '-offline' : ''}`)
  writeFileSync(`${base}.md`, renderMarkdownReport(report))
  writeFileSync(`${base}.json`, JSON.stringify(report, null, 2))

  console.log(renderMarkdownReport(report))
  console.log(`Report written to ${base}.md and ${base}.json`)
  if (report.totals.errors > 0) process.exitCode = 1
}

main().catch(err => {
  console.error('Import failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
