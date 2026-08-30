import fs from 'node:fs'
import path from 'node:path'
import { createDiscoveryClient } from './supabaseClient'
import { searchPodcastIndex } from './sources/podcastIndex'
import { loadExistingRecords, classifyCandidates } from './dedupe'
import { researchCandidate } from './research'
import { scoreCandidate } from './score'
import { draftBlurb } from './draftCopy'
import type { ScoredCandidate } from './types'

// Manual/local-only test harness — loads .env.local since this isn't run
// through Next.js or the GitHub Action (neither of which use this file).
// Not part of the weekly automation (index.ts is). Never sends email, never
// touches newsletter_subscribers or newsletters — writes only to
// podcast_discoveries, and only ever a small, capped candidate set.
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const CANDIDATE_LIMIT = Number(process.env.TEST_CANDIDATE_LIMIT ?? 5)

// A small, deliberately varied slice of angles (not just one generic term)
// to exercise discovery diversity without the full production term list.
const TEST_SEARCH_TERMS = ['UK true crime', 'unsolved cold case', 'independent true crime podcast']

async function main() {
  console.log(`=== Controlled discovery test run (limit: ${CANDIDATE_LIMIT} candidates, ${TEST_SEARCH_TERMS.length} diverse search angles) ===\n`)

  const supabase = createDiscoveryClient()

  console.log(`Step 1: searching Podcast Index across angles: ${TEST_SEARCH_TERMS.join(' | ')}`)
  const allFound = await searchPodcastIndex(TEST_SEARCH_TERMS, 10)
  console.log(`  Podcast Index returned ${allFound.length} unique results`)

  console.log('Step 2: checking against existing LTC database + prior discoveries (multi-signal duplicate detection)...')
  const existingRecords = await loadExistingRecords(supabase)
  const { newCandidates: allNew, likelyDuplicates, possibleDuplicates } = classifyCandidates(allFound, existingRecords)
  console.log(`  ${allNew.length} new, ${likelyDuplicates.length} likely duplicates, ${possibleDuplicates.length} possible duplicates\n`)

  if (likelyDuplicates.length) {
    console.log('--- Likely duplicates (rejected, recorded with reason) ---')
    for (const { candidate, match } of likelyDuplicates) {
      console.log(`  "${candidate.podcastName}" -> ${match.reason}`)
      await supabase.from('podcast_discoveries').insert({
        podcast_name: candidate.podcastName,
        normalized_name: candidate.normalizedName,
        rss_url: candidate.rssUrl,
        website_url: candidate.websiteUrl,
        apple_url: candidate.appleUrl,
        artwork_url: candidate.artworkUrl,
        sources: candidate.sourceNotes,
        status: 'rejected',
        rejection_reason: match.reason,
      })
    }
    console.log('')
  }

  if (possibleDuplicates.length) {
    console.log('--- Possible duplicates (flagged, will still be researched) ---')
    for (const { candidate, match } of possibleDuplicates) {
      console.log(`  "${candidate.podcastName}" -> ${match.reason}`)
    }
    console.log('')
  }

  const toResearch = [
    ...allNew.map(c => ({ candidate: c, note: null as string | null })),
    ...possibleDuplicates.map(({ candidate, match }) => ({ candidate, note: `POSSIBLE DUPLICATE: ${match.reason}` })),
  ].slice(0, CANDIDATE_LIMIT)

  if (!toResearch.length) {
    console.log('No candidates to research — nothing new this run. Exiting.')
    return
  }

  const results: { candidate: ScoredCandidate; blurb: string; usedAI: boolean; usage?: { inputTokens: number; outputTokens: number }; flagged: string | null }[] = []
  let anthropicCalls = 0
  let anthropicFailures = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const { candidate, note } of toResearch) {
    console.log(`--- Researching: ${candidate.podcastName} ---`)

    const { data: inserted, error: insertError } = await supabase
      .from('podcast_discoveries')
      .insert({
        podcast_name: candidate.podcastName,
        normalized_name: candidate.normalizedName,
        rss_url: candidate.rssUrl,
        website_url: candidate.websiteUrl,
        apple_url: candidate.appleUrl,
        artwork_url: candidate.artworkUrl,
        sources: candidate.sourceNotes,
        research_notes: note,
        status: 'discovered',
      })
      .select()
      .single()

    if (insertError || !inserted) {
      console.error(`  Supabase insert error: ${insertError?.message}`)
      continue
    }

    const researched = await researchCandidate(candidate)
    const scored = scoreCandidate(researched)

    console.log(`  Hosts: ${scored.hosts?.map(h => h.name).join(', ') ?? 'not verified'}`)
    console.log(`  Episodes: ${scored.episodeCount ?? 'unknown'}`)
    console.log(`  Avg episode length: ${scored.averageEpisodeMinutes ? Math.round(scored.averageEpisodeMinutes) + ' min' : 'unknown'}`)
    console.log(`  Score: ${scored.score}/10`)
    if (note) console.log(`  FLAGGED: ${note}`)

    anthropicCalls++
    const draft = await draftBlurb(scored)
    if (!draft.usedAI) anthropicFailures++
    if (draft.usage) {
      totalInputTokens += draft.usage.inputTokens
      totalOutputTokens += draft.usage.outputTokens
    }
    console.log(`  Blurb source: ${draft.usedAI ? 'REAL Anthropic API' : 'template fallback (AI call failed or unavailable)'}\n`)

    const combinedNotes = [note, ...scored.researchNotes].filter(Boolean).join(' ')

    const { error: updateError } = await supabase
      .from('podcast_discoveries')
      .update({
        description: scored.description,
        hosts: scored.hosts,
        episode_count: scored.episodeCount,
        launch_date: scored.launchDate,
        latest_episode_date: scored.latestEpisodeDate,
        format: scored.format,
        language: scored.language,
        country: scored.country,
        case_focus: scored.caseFocus,
        research_notes: combinedNotes,
        pros: scored.pros,
        cons: scored.cons,
        editorial_verdict: scored.editorialVerdict,
        score: scored.score,
        apple_url: scored.appleUrl,
        artwork_url: scored.artworkUrl,
        sources: scored.sourceNotes,
        status: scored.researchFailed ? 'discovered' : 'researched',
        researched_at: scored.researchFailed ? null : new Date().toISOString(),
      })
      .eq('id', inserted.id)

    if (updateError) console.error(`  Supabase update error: ${updateError.message}`)

    results.push({ candidate: scored, blurb: draft.text, usedAI: draft.usedAI, usage: draft.usage, flagged: note })
  }

  console.log('\n=== TEST SUMMARY ===')
  console.log(`Search angles used: ${TEST_SEARCH_TERMS.join(' | ')}`)
  console.log(`Candidates researched: ${results.length}`)
  console.log(`Likely duplicates rejected: ${likelyDuplicates.length}`)
  console.log(`Possible duplicates flagged: ${possibleDuplicates.length}`)
  console.log(`Score range: ${Math.min(...results.map(r => r.candidate.score))} - ${Math.max(...results.map(r => r.candidate.score))}`)
  console.log('\n--- MECHANICAL PIPELINE (Podcast Index / dedupe / RSS / iTunes / Supabase) ---')
  console.log('These do not depend on Anthropic and are reported separately from the AI results below.')
  console.log('\n--- ANTHROPIC API RESULTS ---')
  console.log(`API calls attempted: ${anthropicCalls}`)
  console.log(`API calls that succeeded (real AI blurb): ${anthropicCalls - anthropicFailures}`)
  console.log(`API calls that failed (fell back to template): ${anthropicFailures}`)
  console.log(`Total tokens: ${totalInputTokens} in / ${totalOutputTokens} out`)

  console.log('\n=== RESULTS ===')
  for (const r of results) {
    console.log(`\n### ${r.candidate.podcastName} — score ${r.candidate.score}/10 — ${r.usedAI ? 'AI blurb' : 'TEMPLATE blurb (Anthropic failed)'}`)
    if (r.flagged) console.log(`FLAGGED: ${r.flagged}`)
    console.log(`Sources: ${r.candidate.sourceNotes.map(s => s.url).join(', ')}`)
    console.log(`Pros: ${r.candidate.pros.join(' | ') || '(none)'}`)
    console.log(`Cons: ${r.candidate.cons.join(' | ') || '(none)'}`)
    console.log(`Blurb:\n${r.blurb}`)
  }
}

main().catch(err => {
  console.error('Test run failed:', err)
  process.exit(1)
})
