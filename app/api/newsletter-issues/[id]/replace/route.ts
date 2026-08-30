import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { draftBlurb } from '@/scripts/discovery/draftCopy'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Props) {
  const { id } = await params
  const { slotId, newDiscoveryId } = await req.json()
  if (!slotId || !newDiscoveryId) {
    return NextResponse.json({ error: 'slotId and newDiscoveryId are required' }, { status: 400 })
  }

  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: slot } = await admin.from('newsletter_podcasts').select('*').eq('id', slotId).eq('newsletter_id', id).single()
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  const { data: newDiscovery } = await admin.from('podcast_discoveries').select('*').eq('id', newDiscoveryId).single()
  if (!newDiscovery) return NextResponse.json({ error: 'Replacement candidate not found' }, { status: 404 })

  const blurb = await draftBlurb({
    podcastName: newDiscovery.podcast_name,
    description: newDiscovery.description,
    hosts: newDiscovery.hosts,
    episodeCount: newDiscovery.episode_count,
    latestEpisodeDate: newDiscovery.latest_episode_date,
    caseFocus: newDiscovery.case_focus ?? [],
    pros: newDiscovery.pros ?? [],
    cons: newDiscovery.cons ?? [],
    editorialVerdict: newDiscovery.editorial_verdict ?? '',
    researchNotes: newDiscovery.research_notes ? [newDiscovery.research_notes] : [],
  })

  const { error: slotError } = await admin
    .from('newsletter_podcasts')
    .update({ podcast_discovery_id: newDiscoveryId, podcast_id: null, blurb })
    .eq('id', slotId)

  if (slotError) return NextResponse.json({ error: slotError.message }, { status: 500 })

  // The outgoing candidate stays in the shortlist (still linked to this
  // newsletter) rather than being silently dropped.
  if (slot.podcast_discovery_id) {
    await admin.from('podcast_discoveries').update({ status: 'shortlisted' }).eq('id', slot.podcast_discovery_id)
  }

  return NextResponse.json({ ok: true, blurb })
}
