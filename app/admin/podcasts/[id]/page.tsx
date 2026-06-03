import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { PodcastForm } from '@/components/admin/podcast-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPodcastPage({ params }: Props) {
  const { id } = await params

  if (id === 'new') {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl mb-8">Add podcast</h1>
        <PodcastForm />
      </div>
    )
  }

  const admin = createAdminClient()
  const { data: podcast } = await admin
    .from('podcasts')
    .select('*')
    .eq('id', id)
    .single()

  if (!podcast) notFound()

  return (
    <div className="p-8">
      <h1 className="heading-display text-2xl mb-1">Edit podcast</h1>
      <p className="text-stone-subtle text-sm mb-8">{podcast.title}</p>
      <PodcastForm podcast={podcast} />
    </div>
  )
}
