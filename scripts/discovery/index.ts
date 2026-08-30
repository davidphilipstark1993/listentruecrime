import { createDiscoveryClient } from './supabaseClient'
import { searchPodcastIndex } from './sources/podcastIndex'
import { loadExistingKeys, filterNewCandidates } from './dedupe'
import { researchCandidate } from './research'
import { scoreCandidate } from './score'
import { buildShortlist } from './shortlist'
import { draftBlurb } from './draftCopy'
import { notifyReviewReady } from './notify'
import type { ScoredCandidate } from './types'

async function main() {
  const supabase = createDiscoveryClient()

  console.log('Step 1/6: discovering candidates from Podcast Index…')
  const found = await searchPodcastIndex()
  const existing = await loadExistingKeys(supabase)
  const newCandidates = filterNewCandidates(found, existing).slice(0, 30)
  console.log(`  found ${found.length}, ${newCandidates.length} new after dedupe`)

  if (!newCandidates.length) {
    console.log('No new candidates this run. Exiting.')
    return
  }

  console.log('Step 2/6: inserting discovered candidates…')
  const { data: inserted, error: insertError } = await supabase
    .from('podcast_discoveries')
    .insert(
      newCandidates.map(c => ({
        podcast_name: c.podcastName,
        normalized_name: c.normalizedName,
        rss_url: c.rssUrl,
        website_url: c.websiteUrl,
        apple_url: c.appleUrl,
        artwork_url: c.artworkUrl,
        sources: c.sourceNotes,
        status: 'discovered',
      }))
    )
    .select()

  if (insertError) {
    console.error('Failed to insert discovered candidates:', insertError.message)
    return
  }
  console.log(`  inserted ${inserted?.length ?? 0} rows`)

  console.log('Step 3/6: researching each candidate…')
  let researchFailed = 0
  const scored: ScoredCandidate[] = []
  const discoveryIds: string[] = []

  for (const row of inserted ?? []) {
    try {
      const researched = await researchCandidate({
        podcastName: row.podcast_name,
        normalizedName: row.normalized_name,
        rssUrl: row.rss_url,
        websiteUrl: row.website_url,
        appleUrl: row.apple_url,
        artworkUrl: row.artwork_url,
        sourceNotes: row.sources ?? [],
      })

      if (researched.researchFailed) researchFailed++

      const withScore = scoreCandidate(researched)
      scored.push(withScore)
      discoveryIds.push(row.id)

      await supabase
        .from('podcast_discoveries')
        .update({
          description: withScore.description,
          hosts: withScore.hosts,
          episode_count: withScore.episodeCount,
          launch_date: withScore.launchDate,
          latest_episode_date: withScore.latestEpisodeDate,
          format: withScore.format,
          language: withScore.language,
          country: withScore.country,
          case_focus: withScore.caseFocus,
          research_notes: withScore.researchNotes.join(' '),
          pros: withScore.pros,
          cons: withScore.cons,
          editorial_verdict: withScore.editorialVerdict,
          score: withScore.score,
          apple_url: withScore.appleUrl,
          artwork_url: withScore.artworkUrl,
          sources: withScore.sourceNotes,
          status: withScore.researchFailed ? 'discovered' : 'researched',
          researched_at: withScore.researchFailed ? null : new Date().toISOString(),
        })
        .eq('id', row.id)
    } catch (err) {
      // A single candidate's failure must never abort the run.
      console.error(`Research failed for "${row.podcast_name}":`, err)
      researchFailed++
    }
  }
  console.log(`  researched ${scored.length}, ${researchFailed} failed`)

  console.log('Step 4/6: building shortlist + draft newsletter issue…')
  const shortlistResult = await buildShortlist(supabase, discoveryIds)

  if (shortlistResult) {
    console.log('Step 5/6: drafting blurb copy for the top 5…')
    for (let i = 0; i < shortlistResult.featured.length; i++) {
      const discoveryRow = shortlistResult.featured[i]
      const candidate = scored.find(c => c.podcastName === discoveryRow.podcast_name)
      if (!candidate) continue

      try {
        const blurb = await draftBlurb(candidate)
        await supabase
          .from('newsletter_podcasts')
          .update({ blurb })
          .eq('newsletter_id', shortlistResult.newsletter.id)
          .eq('podcast_discovery_id', discoveryRow.id)
      } catch (err) {
        console.error(`Blurb drafting failed for "${discoveryRow.podcast_name}":`, err)
      }
    }
  }

  console.log('Step 6/6: notifying admin the review is ready…')
  await notifyReviewReady({
    discovered: newCandidates.length,
    researched: scored.length,
    researchFailed,
    shortlisted: shortlistResult?.shortlist.length ?? 0,
    newsletterId: shortlistResult?.newsletter.id ?? null,
  })

  console.log('Discovery run complete.')
}

main().catch(err => {
  console.error('Discovery run failed:', err)
  process.exit(1)
})
