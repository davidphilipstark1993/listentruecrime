import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdForm } from '@/components/admin/ad-form'
import type { Ad } from '@/lib/ads/types'

export const dynamic = 'force-dynamic'

export default async function EditAdPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const { data } = await createAdminClient().from('ads').select('*').eq('id', params.id).maybeSingle()
  if (!data) notFound()
  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <h1 className="heading-display text-2xl mb-6">Edit advert</h1>
      <AdForm ad={data as Ad} />
    </div>
  )
}
