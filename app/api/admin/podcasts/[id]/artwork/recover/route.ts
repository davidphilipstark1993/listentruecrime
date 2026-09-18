import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePodcastArtwork } from '@/lib/artwork/resolve'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: Props) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { force?: boolean }

  const admin = createAdminClient()
  const result = await resolvePodcastArtwork(admin, id, { force: body.force === true })

  return NextResponse.json(result)
}
