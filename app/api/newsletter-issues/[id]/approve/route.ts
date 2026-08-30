import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import { renderNewsletterHtml, renderNewsletterPlainText, type NewsletterRenderItem } from '@/lib/newsletter/render'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, { params }: Props) {
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

  if (!slots || slots.length < 5) {
    return NextResponse.json({ error: 'All 5 slots must be filled before approving' }, { status: 400 })
  }
  if (slots.some(s => !s.blurb?.trim())) {
    return NextResponse.json({ error: 'Every slot needs a blurb before approving' }, { status: 400 })
  }

  const renderItems: NewsletterRenderItem[] = []

  for (const slot of slots) {
    let podcastId = slot.podcast_id
    let slug = slot.podcast?.slug ?? null
    let title = slot.podcast?.title ?? slot.discovery?.podcast_name ?? 'Untitled'
    let imageUrl = slot.podcast?.image_url ?? slot.discovery?.artwork_url ?? null
    let websiteUrl = slot.podcast?.website_url ?? slot.discovery?.website_url ?? null

    // Create the podcast's own LTC page if it doesn't already exist, so
    // the newsletter's internal links are real by send time.
    if (!podcastId && slot.discovery) {
      const d = slot.discovery
      let candidateSlug = slugify(d.podcast_name)
      let suffix = 1
      while (true) {
        const { data: existing } = await admin.from('podcasts').select('id').eq('slug', candidateSlug).maybeSingle()
        if (!existing) break
        suffix += 1
        candidateSlug = `${slugify(d.podcast_name)}-${suffix}`
      }

      const platforms = [
        d.apple_url ? 'Apple Podcasts' : null,
        d.spotify_url ? 'Spotify' : null,
      ].filter((p): p is string => p !== null)

      const { data: created, error: createError } = await admin
        .from('podcasts')
        .insert({
          title: d.podcast_name,
          slug: candidateSlug,
          description: d.description,
          short_description: d.description?.slice(0, 200) ?? null,
          image_url: d.artwork_url,
          website_url: d.website_url,
          country: d.country,
          case_types: d.case_focus,
          format_type: d.format,
          host_name: d.hosts?.[0]?.name ?? null,
          episode_count: d.episode_count != null ? String(d.episode_count) : null,
          platforms,
          quick_verdict: d.editorial_verdict,
          newsletter_worthy_summary: d.editorial_verdict,
          is_published: true,
          is_featured: false,
        })
        .select('id, slug, title, image_url, website_url')
        .single()

      if (createError || !created) {
        return NextResponse.json({ error: `Failed to create podcast page for "${d.podcast_name}": ${createError?.message}` }, { status: 500 })
      }

      podcastId = created.id
      slug = created.slug
      title = created.title
      imageUrl = created.image_url
      websiteUrl = created.website_url

      await admin.from('newsletter_podcasts').update({ podcast_id: podcastId }).eq('id', slot.id)
      await admin.from('podcast_discoveries').update({ matched_podcast_id: podcastId, status: 'featured' }).eq('id', d.id)
    } else if (slot.discovery) {
      await admin.from('podcast_discoveries').update({ status: 'featured' }).eq('id', slot.discovery.id)
    }

    renderItems.push({
      position: slot.position,
      title,
      slug,
      artworkUrl: imageUrl,
      hosts: slot.discovery?.hosts?.map((h: { name: string }) => h.name).join(', ') ?? null,
      format: slot.discovery?.format ?? null,
      episodeCount: slot.discovery?.episode_count ?? null,
      score: slot.discovery?.score ?? null,
      blurb: slot.blurb!,
      appleUrl: slot.discovery?.apple_url ?? null,
      spotifyUrl: slot.discovery?.spotify_url ?? null,
      websiteUrl,
    })
  }

  const renderInput = { title: newsletter.title, intro: newsletter.intro, items: renderItems }
  const html_content = renderNewsletterHtml(renderInput)
  const plain_text_content = renderNewsletterPlainText(renderInput)

  const { error: updateError } = await admin
    .from('newsletters')
    .update({ status: 'approved', html_content, plain_text_content })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
