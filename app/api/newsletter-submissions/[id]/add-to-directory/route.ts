import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

// Explicit, separate action from the weekly newsletter send — a podcast
// being featured in the newsletter does NOT automatically add it to the
// main podcast directory. This is the only thing that creates a podcasts
// row from a submission, and only when the admin clicks it.
export async function POST(_req: Request, { params }: Props) {
  const { id } = await params
  const cookieClient = await createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await cookieClient.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()

  const { data: submission } = await admin.from('newsletter_submissions').select('*').eq('id', id).single()
  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

  if (submission.matched_podcast_id) {
    const { data: existing } = await admin.from('podcasts').select('id, slug, title').eq('id', submission.matched_podcast_id).maybeSingle()
    if (existing) {
      return NextResponse.json({ ok: true, alreadyInDirectory: true, podcast: existing })
    }
    // matched_podcast_id pointed at a since-deleted podcast — fall through and create a fresh one.
  }

  let candidateSlug = slugify(submission.podcast_name)
  let suffix = 1
  while (true) {
    const { data: clash } = await admin.from('podcasts').select('id').eq('slug', candidateSlug).maybeSingle()
    if (!clash) break
    suffix += 1
    candidateSlug = `${slugify(submission.podcast_name)}-${suffix}`
  }

  const { data: created, error } = await admin
    .from('podcasts')
    .insert({
      title: submission.podcast_name,
      slug: candidateSlug,
      description: submission.description,
      short_description: submission.description ? submission.description.slice(0, 200) : null,
      image_url: submission.artwork_url,
      website_url: submission.website_url,
      host_name: submission.hosts,
      newsletter_worthy_summary: submission.recommendation,
      is_published: true,
      is_featured: false,
    })
    .select('id, slug, title')
    .single()

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create podcast' }, { status: 500 })
  }

  await admin.from('newsletter_submissions').update({ matched_podcast_id: created.id }).eq('id', id)

  return NextResponse.json({ ok: true, alreadyInDirectory: false, podcast: created })
}
