import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArtworkReview } from '@/components/admin/artwork-review'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ArtworkReviewPage({ params }: Props) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: podcast } = await admin
    .from('podcasts')
    .select('id, title, slug, host_name, website_url, rss_url, image_url, artwork_status, artwork_source, artwork_confidence, artwork_score, artwork_match_reason, artwork_error, artwork_checked_at, artwork_verified_at, artwork_manual_override, artwork_candidate, artwork_attempts')
    .eq('id', id)
    .single()

  if (!podcast) notFound()

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/artwork" className="flex items-center gap-1.5 text-stone-subtle hover:text-stone transition-colors text-xs mb-6">
        <ArrowLeft size={12} /> Back to artwork dashboard
      </Link>

      <h1 className="heading-display text-2xl mb-1">{podcast.title}</h1>
      <p className="text-stone-subtle text-sm mb-8">Artwork management</p>

      <ArtworkReview podcast={podcast} />
    </div>
  )
}
