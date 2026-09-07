import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils'

export type AutoFeatureResult =
  | { filled: true; podcastIds: string[] }
  | { filled: false; reason: 'already_has_submissions' }
  | { filled: false; reason: 'catalog_exhausted'; remaining: number }

/**
 * Auto-populates this week's newsletter with 5 not-yet-featured podcasts
 * from the site's own directory (in their newsletter_queue_position order —
 * see migration 011), using each podcast's own newsletter_worthy_summary as
 * the recommendation copy. Skips entirely if the curator has already
 * started manually adding picks for the week — this only fills a blank
 * newsletter, never overrides one in progress.
 */
export async function autoFeatureFromCatalog(supabase: SupabaseClient, newsletterId: string): Promise<AutoFeatureResult> {
  const { count: existingCount } = await supabase
    .from('newsletter_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('newsletter_id', newsletterId)

  if (existingCount) return { filled: false, reason: 'already_has_submissions' }

  // A podcast counts as "already featured" once it went out in a newsletter
  // that actually sent — an abandoned/never-approved draft doesn't block it
  // from being picked again.
  const { data: sentNewsletters } = await supabase.from('newsletters').select('id').eq('status', 'sent')
  const sentIds = (sentNewsletters ?? []).map(n => n.id)

  let featuredPodcastIds = new Set<string>()
  if (sentIds.length) {
    const { data: featured } = await supabase
      .from('newsletter_podcasts')
      .select('podcast_id')
      .in('newsletter_id', sentIds)
      .not('podcast_id', 'is', null)
    featuredPodcastIds = new Set((featured ?? []).map(f => f.podcast_id as string))
  }

  const { data: candidates } = await supabase
    .from('podcasts')
    .select('id, title, short_description, newsletter_worthy_summary, image_url, website_url, host_name, binge_factor')
    .eq('is_published', true)
    .not('newsletter_queue_position', 'is', null)
    .order('newsletter_queue_position', { ascending: true })

  const unfeatured = (candidates ?? []).filter(p => !featuredPodcastIds.has(p.id))

  if (unfeatured.length < 5) {
    return { filled: false, reason: 'catalog_exhausted', remaining: unfeatured.length }
  }

  const picks = unfeatured.slice(0, 5)

  const { error: insertError } = await supabase.from('newsletter_submissions').insert(
    picks.map(p => ({
      newsletter_id: newsletterId,
      podcast_name: p.title,
      normalized_name: slugify(p.title),
      podcast_url: null,
      website_url: p.website_url,
      rss_url: null,
      hosts: p.host_name,
      description: p.short_description,
      recommendation: p.newsletter_worthy_summary,
      notes: null,
      curator_rating: p.binge_factor,
      artwork_url: p.image_url,
      additional_info: null,
      matched_podcast_id: p.id,
      status: 'approved',
    }))
  )

  if (insertError) throw new Error(`Failed to auto-fill newsletter submissions: ${insertError.message}`)

  // Mirrors app/api/newsletters/[id]/approve-for-sending: exactly 5 approved
  // submissions is the same precondition that route enforces, so this skips
  // straight to 'approved' — the curator can still edit/unapprove any pick in
  // /admin/weekly-newsletter, which drops it back to 'draft' as normal.
  await supabase.from('newsletters').update({ status: 'approved' }).eq('id', newsletterId)

  return { filled: true, podcastIds: picks.map(p => p.id) }
}
