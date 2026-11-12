import { createAdminClient } from '@/lib/supabase/admin'
import { BASE } from '@/lib/seo/config'
import { llmsBlurb } from '@/lib/seo/llms'

export const revalidate = 3600

export async function GET() {
  const supabase = createAdminClient()
  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('title, slug, short_description, quick_verdict, binge_factor, case_types, country')
    .eq('is_published', true)
    .order('binge_factor', { ascending: false })

  if (!podcasts?.length) {
    return new Response('No podcasts found.\n', { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }

  const header = [
    '# ListenTrueCrime — Full Podcast Listing',
    '',
    // Generated from the query above (published listings), not a marketing figure.
    `> ${podcasts.length} published podcasts in our directory, ordered by editorial Binge Factor`,
    `> Full reviews at ${BASE}/browse`,
    '',
    '---',
    '',
  ].join('\n')

  const entries = podcasts.map(p => [
    `## ${p.title}`,
    `- Verdict: ${p.quick_verdict?.trim() || 'Not yet rated'}`,
    `- Binge score: ${p.binge_factor != null ? `${p.binge_factor}/10` : 'Not yet rated'}`,
    `- Type: ${p.case_types?.filter(Boolean).join(', ') || 'True Crime'}`,
    `- ${llmsBlurb(p.short_description) ?? 'See full review for details'}`,
    `- URL: ${BASE}/podcasts/${p.slug}`,
    '',
  ].join('\n')).join('\n')

  return new Response(header + entries, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600',
    },
  })
}
