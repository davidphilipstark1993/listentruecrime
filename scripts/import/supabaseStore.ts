import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExistingRecord, ImportRowInsert, ImportStore, PodcastInsert } from './importPodcasts'

const PAGE_SIZE = 1000

async function fetchAll<T>(fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

export function createSupabaseStore(supabase: SupabaseClient): ImportStore {
  return {
    async loadExisting() {
      const [podcasts, imports] = await Promise.all([
        fetchAll<{ id: string; title: string; slug: string; apple_podcast_id: string | null }>((from, to) =>
          supabase.from('podcasts').select('id, title, slug, apple_podcast_id').order('id').range(from, to)
        ),
        fetchAll<{ id: string; title: string; slug: string; apple_podcast_id: string | null }>((from, to) =>
          supabase.from('podcast_imports').select('id, title, slug, apple_podcast_id').order('id').range(from, to)
        ),
      ])
      const records: ExistingRecord[] = []
      for (const r of podcasts) records.push({ origin: 'podcasts', id: r.id, title: r.title, slug: r.slug, appleId: r.apple_podcast_id })
      for (const r of imports) records.push({ origin: 'podcast_imports', id: r.id, title: r.title, slug: r.slug, appleId: r.apple_podcast_id })
      return records
    },

    async insertPodcast(row: PodcastInsert) {
      const { data, error } = await supabase.from('podcasts').insert(row).select('id').single()
      if (error) throw Object.assign(new Error(error.message), { code: error.code })
      return data.id as string
    },

    async insertImport(row: ImportRowInsert) {
      const { error } = await supabase.from('podcast_imports').insert(row)
      if (error) throw Object.assign(new Error(error.message), { code: error.code })
    },

    async deletePodcast(id: string) {
      const { error } = await supabase.from('podcasts').delete().eq('id', id)
      if (error) throw new Error(`rollback failed for podcast ${id}: ${error.message}`)
    },
  }
}

/**
 * Fails fast, with the fix, if migration 017 has not been applied — rather
 * than failing on the first insert halfway through a file.
 */
export async function assertMigrationApplied(supabase: SupabaseClient): Promise<void> {
  const checks = [
    supabase.from('podcasts').select('apple_podcast_id, status').limit(1),
    supabase.from('podcast_imports').select('id').limit(1),
  ]
  for (const check of checks) {
    const { error } = await check
    if (error) {
      throw new Error(
        `Database is not ready for import (${error.message}). ` +
          `Run supabase/migrations/017_podcast_imports.sql in the Supabase SQL editor first.`
      )
    }
  }
}
