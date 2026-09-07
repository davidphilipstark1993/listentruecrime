// Runs early in the week (Monday) so there's time to notice and override in
// /admin/weekly-newsletter before Sunday's send job (weekly-send.ts) picks
// up whatever the newsletter is left at. Only touches the Sunday-dated
// manual newsletter (lib/newsletter/week.ts) — entirely separate from the
// Monday-dated AI discovery pipeline (scripts/discovery/index.ts), which
// still runs independently and is reviewed at /admin/newsletter-issues.
import { createDiscoveryClient } from '../discovery/supabaseClient'
import { getOrCreateThisWeeksNewsletter } from '@/lib/newsletter/week'
import { autoFeatureFromCatalog } from '@/lib/newsletter/autoFeature'
import { notifyAdmin } from '@/lib/email/adminNotify'

async function main() {
  const supabase = createDiscoveryClient()
  const newsletter = await getOrCreateThisWeeksNewsletter(supabase)

  const result = await autoFeatureFromCatalog(supabase, newsletter.id)

  if (result.filled) {
    console.log(`Auto-filled issue #${newsletter.issue_number} with 5 podcasts from the directory and approved it for Sunday sending.`)
    return
  }

  if (result.reason === 'already_has_submissions') {
    console.log('This week already has podcasts added — leaving it alone.')
    return
  }

  console.log(`Only ${result.remaining} unfeatured published podcasts left — not enough for a full issue.`)
  await notifyAdmin(
    'Newsletter auto-fill stopped — catalog exhausted',
    `Every published podcast has now been featured in the newsletter at least once (only ${result.remaining} unfeatured podcasts remain, need 5).\n\n` +
    `This week's newsletter (issue #${newsletter.issue_number}) was NOT auto-filled. Add podcasts manually at /admin/weekly-newsletter, or publish more podcasts to the directory to refill the queue.`
  )
}

main().catch(async err => {
  console.error('Newsletter auto-fill failed:', err)
  await notifyAdmin('Newsletter auto-fill FAILED', `The weekly newsletter auto-fill job crashed:\n\n${err instanceof Error ? err.stack ?? err.message : String(err)}`)
  process.exit(1)
})
