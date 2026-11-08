import { createAdminClient } from '@/lib/supabase/admin'
import { BASE } from '@/lib/seo/config'

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
    `> ${podcasts.length} true crime podcasts in the ListenTrueCrime directory, ordered by editorial Binge Factor.`,
    `> Verdicts and Binge Factor are the editor's opinion; method at ${BASE}/how-we-review`,
    `> Curated picks: ${BASE}/best-true-crime-podcasts · Browse and filter: ${BASE}/browse`,
    '',
    '---',
    '',
  ].join('\n')

  const entries = podcasts.map(p => [
    `## ${p.title}`,
    `- Verdict: ${p.quick_verdict?.trim() || 'No verdict yet'}`,
    `- Binge Factor (editorial): ${p.binge_factor != null ? `${p.binge_factor}/10` : 'not scored'}`,
    `- Type: ${p.case_types?.join(', ') ?? 'True Crime'}`,
    `- ${p.short_description ?? 'See full review for details'}`,
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
