import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

// Allow up to 60s on Vercel — 100 rows with individual roundtrips can be slow
export const maxDuration = 60

interface CSVRow {
  podcast_name?: string
  title?: string
  slug?: string
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
  // Handle "9/10" format — parseFloat stops at the slash
  const n = parseFloat(val)
  return isNaN(n) ? null : Math.round(n)
}

function parseArray(val: string | undefined): string[] {
  if (!val) return []
  return val.split(/[,;|]/).map(s => s.trim()).filter(Boolean)
}

function rowToPodcast(row: CSVRow) {
  const title = (row.podcast_name ?? row.title ?? '').trim()
  if (!title) return null

  // Use explicit slug column from enriched CSV, otherwise generate from title
  const slug = row.slug?.trim() || slugify(title)

  return {
    title,
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
    image_url: row.image_url || null,
    is_published: true,
  }
}

export async function POST(req: Request) {
  // Auth check — uses SSR client (valid in route handlers)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: 'Admin access required. Run: UPDATE profiles SET is_admin = true WHERE id = \'<your-user-id>\'; in Supabase SQL editor.' },
      { status: 403 }
    )
  }

  const body = await req.json() as { rows: CSVRow[] }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  // Parse all rows, collecting any that fail validation
  const podcasts: ReturnType<typeof rowToPodcast>[] = []
  const parseErrors: string[] = []

  for (const row of body.rows) {
    const podcast = rowToPodcast(row)
    if (!podcast) {
      parseErrors.push(`Row skipped — missing title: ${JSON.stringify(row).slice(0, 80)}`)
    } else {
      podcasts.push(podcast)
    }
  }

  if (podcasts.length === 0) {
    return NextResponse.json({
      inserted: 0,
      errors: parseErrors,
      message: 'No valid rows to import'
    })
  }

  // Single batch upsert — the admin RLS policy allows this for authenticated admin users.
  // This is far faster than 100 individual round-trips and avoids Vercel timeout.
  const { data: upserted, error } = await supabase
    .from('podcasts')
    .upsert(podcasts as any[], { onConflict: 'slug', ignoreDuplicates: false })
    .select('id')

  if (error) {
    // Surface the actual Supabase error so it's debuggable
    console.error('Import upsert error:', error)
    return NextResponse.json(
      {
        inserted: 0,
        errors: [
          `Database error: ${error.message}`,
          error.hint ? `Hint: ${error.hint}` : null,
          error.details ? `Details: ${error.details}` : null,
        ].filter(Boolean),
        parseErrors,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    inserted: upserted?.length ?? podcasts.length,
    errors: parseErrors,
    total: body.rows.length,
  })
}
