import type { SupabaseClient } from '@supabase/supabase-js'

const SHORTLIST_SIZE = 10
const FEATURED_SIZE = 5

/** Next Monday at (or after) today, as an ISO date string. */
export function nextMonday(from = new Date()): string {
  const d = new Date(from)
  const day = d.getUTCDay()
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7
  d.setUTCDate(d.getUTCDate() + daysUntilMonday)
  return d.toISOString().slice(0, 10)
}

/**
 * Ranks all `researched` candidates from this run, marks the top 10 as
 * `shortlisted`, creates a new draft newsletter issue, and slots the top 5
 * into newsletter_podcasts (blurbs are filled in separately by draftCopy).
 */
export async function buildShortlist(supabase: SupabaseClient, discoveryIds: string[]) {
  const { data: researched } = await supabase
    .from('podcast_discoveries')
    .select('id, podcast_name, score')
    .in('id', discoveryIds)
    .eq('status', 'researched')
    .order('score', { ascending: false, nullsFirst: false })

  const ranked = researched ?? []
  const shortlist = ranked.slice(0, SHORTLIST_SIZE)
  const featured = shortlist.slice(0, FEATURED_SIZE)

  if (!shortlist.length) {
    console.log('No researched candidates to shortlist this run.')
    return null
  }

  await supabase
    .from('podcast_discoveries')
    .update({ status: 'shortlisted' })
    .in('id', shortlist.map(c => c.id))

  const { data: lastIssue } = await supabase
    .from('newsletters')
    .select('issue_number')
    .order('issue_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const issueNumber = (lastIssue?.issue_number ?? 0) + 1
  const publicationDate = nextMonday()
  const slug = `issue-${issueNumber}-${publicationDate}`

  const { data: newsletter, error: newsletterError } = await supabase
    .from('newsletters')
    .insert({
      title: '5 True Crime Podcasts Worth Listening To',
      slug,
      issue_number: issueNumber,
      publication_date: publicationDate,
      status: 'review',
    })
    .select()
    .single()

  if (newsletterError || !newsletter) {
    throw new Error(`Failed to create newsletter issue: ${newsletterError?.message}`)
  }

  await Promise.all(
    featured.map((candidate, i) =>
      supabase.from('newsletter_podcasts').insert({
        newsletter_id: newsletter.id,
        podcast_discovery_id: candidate.id,
        position: i + 1,
      })
    )
  )

  await supabase
    .from('podcast_discoveries')
    .update({ newsletter_id: newsletter.id })
    .in('id', featured.map(c => c.id))

  return { newsletter, shortlist, featured }
}
