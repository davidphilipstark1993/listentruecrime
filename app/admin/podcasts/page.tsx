import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Plus } from 'lucide-react'
import { PodcastsTable } from './podcasts-table'

async function getPodcasts() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('podcasts')
    .select('id, title, slug, is_published, is_featured, binge_factor, country, quick_verdict, image_url, created_at')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function AdminPodcastsPage() {
  const podcasts = await getPodcasts()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl mb-1">Podcasts</h1>
          <p className="text-stone-subtle text-sm">{podcasts.length} in database</p>
        </div>
        <Link href="/admin/podcasts/new" className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add podcast
        </Link>
      </div>

      <PodcastsTable podcasts={podcasts} />
    </div>
  )
}
