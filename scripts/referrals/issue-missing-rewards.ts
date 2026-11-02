// Repair / catch-up job for referral rewards. Safe to run any number of times.
//
// Rewards are normally issued the moment a referred subscriber confirms (see
// lib/referrals/service.ts). Run this if the REF- campaign was switched off for a while,
// or an email provider was down, or you changed REFERRAL_TIERS and want existing referrers
// to receive the new tier: for every subscriber with confirmed referrals it issues any tier
// they have reached but not yet been given (the database's unique index prevents duplicates)
// and emails any reward that was never emailed.
//
//   npx tsx scripts/referrals/issue-missing-rewards.ts
//
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and an email provider
// (SENDGRID_API_KEY or RESEND_API_KEY), like the other scripts.
import { createDiscoveryClient } from '../discovery/supabaseClient'
import { issueRewards } from '@/lib/referrals/service'

async function main() {
  const supabase = createDiscoveryClient()
  const { data, error } = await supabase.from('referrals').select('referrer_id').eq('status', 'confirmed').limit(50000)
  if (error) throw new Error(`Could not load referrals: ${error.message}`)

  const counts = new Map<string, number>()
  for (const r of (data ?? []) as { referrer_id: string }[]) counts.set(r.referrer_id, (counts.get(r.referrer_id) ?? 0) + 1)

  let issued = 0
  for (const [referrerId, count] of Array.from(counts.entries())) issued += await issueRewards(supabase, referrerId, count)
  console.log(`${counts.size} referrer(s) checked, ${issued} new reward code(s) issued.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
