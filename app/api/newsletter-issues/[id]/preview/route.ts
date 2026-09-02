import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { renderNewsletterHtml, type NewsletterRenderItem } from '@/lib/newsletter/render'

interface Props {
  params: Promise<{ id: string }>
}

// Read-only preview of a discovery-built issue — no podcast-page creation,
// no discovery status changes, no DB writes at all (unlike the approve
// route, which does all of that). Works with however many slots/blurbs
// exist so far, not just once all 5 are filled.
export async function GET(_req: Request, { params }: Props) {
  const { id } = await params
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: newsletter } = await admin.from('newsletters').select('*').eq('id', id).single()
  if (!newsletter) return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })

  const { data: slots } = await admin
    .from('newsletter_podcasts')
    .select('*, discovery:podcast_discoveries(*), podcast:podcasts(title, slug, image_url, website_url)')
    .eq('newsletter_id', id)
    .order('position', { ascending: true })

  const renderItems: NewsletterRenderItem[] = (slots ?? []).map(slot => ({
    position: slot.position,
    title: slot.podcast?.title ?? slot.discovery?.podcast_name ?? 'Untitled',
    slug: slot.podcast?.slug ?? null,
    artworkUrl: slot.podcast?.image_url ?? slot.discovery?.artwork_url ?? null,
    hosts: slot.discovery?.hosts?.map((h: { name: string }) => h.name).join(', ') ?? null,
    format: slot.discovery?.format ?? null,
    episodeCount: slot.discovery?.episode_count ?? null,
    score: slot.discovery?.score ?? null,
    blurb: slot.blurb ?? '(blurb not yet drafted)',
    appleUrl: slot.discovery?.apple_url ?? null,
    spotifyUrl: slot.discovery?.spotify_url ?? null,
    listenUrl: null,
    websiteUrl: slot.podcast?.website_url ?? slot.discovery?.website_url ?? null,
  }))

  const html = renderNewsletterHtml({ title: newsletter.title, intro: newsletter.intro, items: renderItems })
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
