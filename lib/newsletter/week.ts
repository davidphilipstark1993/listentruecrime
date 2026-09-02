import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Next Sunday at (or including) today, as an ISO date string. If today is
 * Sunday, returns today — so the admin UI and the Sunday send job agree on
 * which newsletter "this week" refers to.
 */
export function nextSunday(from = new Date()): string {
  const d = new Date(from)
  const day = d.getUTCDay() // 0 = Sunday
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  d.setUTCDate(d.getUTCDate() + daysUntilSunday)
  return d.toISOString().slice(0, 10)
}

/**
 * Finds the draft/review/approved newsletter targeting the upcoming Sunday,
 * or creates one. This is the single "this week's newsletter" that the
 * manual submission admin UI and the Sunday send job both operate on.
 */
export async function getOrCreateThisWeeksNewsletter(supabase: SupabaseClient) {
  const publicationDate = nextSunday()

  const { data: existing } = await supabase
    .from('newsletters')
    .select('*')
    .eq('publication_date', publicationDate)
    .in('status', ['draft', 'review', 'approved'])
    .maybeSingle()

  if (existing) return existing

  const { data: lastIssue } = await supabase
    .from('newsletters')
    .select('issue_number')
    .order('issue_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const issueNumber = (lastIssue?.issue_number ?? 0) + 1
  const slug = `issue-${issueNumber}-${publicationDate}`

  const { data: created, error } = await supabase
    .from('newsletters')
    .insert({
      title: '5 True Crime Podcasts Worth Listening To',
      slug,
      issue_number: issueNumber,
      publication_date: publicationDate,
      status: 'draft',
    })
    .select()
    .single()

  if (error || !created) {
    throw new Error(`Failed to create this week's newsletter: ${error?.message}`)
  }
  return created
}

/**
 * Recomputes a newsletter's status from its current submissions: 'review'
 * once exactly 5 are approved, 'draft' otherwise. Never advances past
 * 'review' on its own — the curator's explicit "approve for Sunday
 * sending" action is the only thing that can set 'approved', and any
 * change to submissions after that always drops back to 'draft'/'review'
 * so a last-minute edit can never sneak past re-confirmation.
 */
export async function recomputeNewsletterStatus(supabase: SupabaseClient, newsletterId: string) {
  const { data: submissions } = await supabase
    .from('newsletter_submissions')
    .select('status')
    .eq('newsletter_id', newsletterId)

  const approvedCount = (submissions ?? []).filter(s => s.status === 'approved').length
  const nextStatus = approvedCount === 5 ? 'review' : 'draft'

  await supabase.from('newsletters').update({ status: nextStatus }).eq('id', newsletterId).in('status', ['draft', 'review', 'approved'])

  return { approvedCount, status: nextStatus }
}
