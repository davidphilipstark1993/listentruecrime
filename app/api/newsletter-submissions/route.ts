import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import { getOrCreateThisWeeksNewsletter, recomputeNewsletterStatus } from '@/lib/newsletter/week'
import { findDuplicate, type ComparableRecord } from '@/scripts/discovery/duplicateCheck'

async function requireAdmin() {
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  return { error: null }
}

// GET: this week's newsletter + its submissions, each annotated with a
// possible-duplicate warning against the main podcasts table (informational
// only — never blocks anything).
export async function GET() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const admin = createAdminClient()
  const newsletter = await getOrCreateThisWeeksNewsletter(admin)

  const [{ data: submissions }, { data: podcasts }] = await Promise.all([
    admin.from('newsletter_submissions').select('*').eq('newsletter_id', newsletter.id).order('created_at', { ascending: true }),
    admin.from('podcasts').select('id, title, slug, website_url'),
  ])

  const podcastById = new Map((podcasts ?? []).map(p => [p.id, p]))
  const podcastRecords: ComparableRecord[] = (podcasts ?? []).map(p => ({
    id: p.id, name: p.title, rssUrl: null, appleUrl: null, websiteUrl: p.website_url,
  }))

  const annotated = (submissions ?? []).map(s => {
    if (s.matched_podcast_id) {
      // Already linked/published — surface the directory entry, no need to warn about a possible match.
      return { ...s, possibleDbMatch: null, directoryEntry: podcastById.get(s.matched_podcast_id) ?? null }
    }
    const match = findDuplicate(s.podcast_name, s.rss_url, s.podcast_url, s.website_url, podcastRecords)
    return {
      ...s,
      possibleDbMatch: match.confidence !== 'none' ? { name: match.matchedName, id: match.matchedId, reason: match.reason } : null,
      directoryEntry: null,
    }
  })

  return NextResponse.json({ newsletter, submissions: annotated })
}

// POST: add a podcast to this week's newsletter. Blocks exact/near-certain
// duplicates within the same week's list; never blocks on a possible match
// against the main podcasts table (that's informational only, surfaced by GET).
export async function POST(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const body = await req.json()
  const podcastName = typeof body.podcast_name === 'string' ? body.podcast_name.trim() : ''
  if (!podcastName) {
    return NextResponse.json({ error: 'Podcast name is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const newsletter = await getOrCreateThisWeeksNewsletter(admin)

  const { data: existingSubmissions } = await admin
    .from('newsletter_submissions')
    .select('id, podcast_name, rss_url, podcast_url, website_url')
    .eq('newsletter_id', newsletter.id)

  const existingRecords: ComparableRecord[] = (existingSubmissions ?? []).map(s => ({
    id: s.id, name: s.podcast_name, rssUrl: s.rss_url, appleUrl: s.podcast_url, websiteUrl: s.website_url,
  }))

  const dupMatch = findDuplicate(podcastName, body.rss_url ?? null, body.podcast_url ?? null, body.website_url ?? null, existingRecords)
  if (dupMatch.confidence === 'high') {
    return NextResponse.json({ error: `Already added to this week's newsletter: ${dupMatch.reason}` }, { status: 409 })
  }

  const { data: created, error } = await admin
    .from('newsletter_submissions')
    .insert({
      newsletter_id: newsletter.id,
      podcast_name: podcastName,
      normalized_name: slugify(podcastName),
      podcast_url: body.podcast_url || null,
      website_url: body.website_url || null,
      rss_url: body.rss_url || null,
      hosts: body.hosts || null,
      description: body.description || null,
      recommendation: body.recommendation || null,
      notes: body.notes || null,
      curator_rating: body.curator_rating ?? null,
      artwork_url: body.artwork_url || null,
      additional_info: body.additional_info || null,
      status: 'draft',
    })
    .select()
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? 'Failed to save' }, { status: 500 })
  }

  await recomputeNewsletterStatus(admin, newsletter.id)

  return NextResponse.json({ ok: true, submission: created })
}
