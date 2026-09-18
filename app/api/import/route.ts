import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

interface CSVRow {
  podcast_name?: string
  title?: string
  what_is_it_about?: string
  description?: string
  who_is_it_for?: string
  short_description?: string
  case_types?: string
  format?: string
  format_type?: string
  tone?: string
  factual_style?: string
  host_style?: string
  binge_factor_1_10?: string
  binge_factor?: string
  research_quality_1_10?: string
  host_quality_1_10?: string
  production_audio_1_10?: string
  ethics_respectfulness?: string
  time_commitment?: string
  episode_length?: string
  episode_count?: string
  best_episode_to_start_with?: string
  best_episode_to_start?: string
  if_you_liked_this_try?: string
  warnings_things_to_know?: string
  quick_verdict?: string
  newsletter_summary?: string
  newsletter_worthy_summary?: string
  country?: string
  platforms?: string
  image_url?: string
  website_url?: string
  [key: string]: string | undefined
}

function parseNumber(val: string | undefined): number | null {
  if (!val) return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function parseArray(val: string | undefined): string[] {
  if (!val) return []
  return val.split(/[,;|]/).map(s => s.trim()).filter(Boolean)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { rows } = await req.json() as { rows: CSVRow[] }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  const admin = createAdminClient()
  const results = { inserted: 0, updated: 0, errors: [] as string[] }

  for (const row of rows) {
    const title = row.podcast_name ?? row.title ?? ''
    if (!title.trim()) { results.errors.push('Row missing title'); continue }

    const slug = slugify(title)

    const podcast = {
      title: title.trim(),
      slug,
      description: row.what_is_it_about ?? row.description ?? null,
      short_description: row.who_is_it_for ?? row.short_description ?? null,
      case_types: parseArray(row.case_types),
      format_type: row.format ?? row.format_type ?? null,
      factual_style: row.tone ?? row.factual_style ?? null,
      host_style: row.host_style ?? null,
      binge_factor: parseNumber(row.binge_factor_1_10 ?? row.binge_factor),
      episode_length: row.time_commitment ?? row.episode_length ?? null,
      episode_count: row.episode_count ?? null,
      best_episode_to_start: row.best_episode_to_start_with ?? row.best_episode_to_start ?? null,
      if_you_liked_this: parseArray(row.if_you_liked_this_try),
      quick_verdict: row.quick_verdict ?? null,
      newsletter_worthy_summary: row.newsletter_summary ?? row.newsletter_worthy_summary ?? null,
      country: row.country ?? null,
      platforms: parseArray(row.platforms),
      image_url: row.image_url ?? null,
      website_url: row.website_url ?? null,
      is_published: true,
      // A CSV row that already ships an image_url is treated the same as
      // any other pre-existing artwork — accepted as-is, not re-validated
      // here (bulk import must stay fast); it just becomes eligible for a
      // background artwork-recovery pass like any other podcast. Rows
      // without an image_url keep the column default ('missing').
      ...(row.image_url ? { artwork_status: 'verified' as const, artwork_source: 'existing' as const } : {}),
    }

    const { error } = await admin
      .from('podcasts')
      .upsert(podcast, { onConflict: 'slug' })

    if (error) {
      results.errors.push(`${title}: ${error.message}`)
    } else {
      results.inserted++
    }
  }

  return NextResponse.json(results)
}
