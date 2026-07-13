import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('favourites')
    .select(`podcast:podcasts(*, rating_stats:podcast_rating_stats(*))`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ favourites: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { podcast_id } = await req.json()
  if (!podcast_id) return NextResponse.json({ error: 'Missing podcast_id' }, { status: 400 })

  const { error } = await supabase
    .from('favourites')
    .insert({ user_id: user.id, podcast_id })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, already: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { podcast_id } = await req.json()
  if (!podcast_id) return NextResponse.json({ error: 'Missing podcast_id' }, { status: 400 })

  const { error } = await supabase
    .from('favourites')
    .delete()
    .eq('user_id', user.id)
    .eq('podcast_id', podcast_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
