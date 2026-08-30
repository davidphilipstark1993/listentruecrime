import { supabasePublic } from '@/lib/supabase/public'

export async function getPodcastCount() {
  const { count } = await supabasePublic
    .from('podcasts')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true)
  return count ?? 0
}

export function roundedPodcastCount(count: number) {
  if (count < 100) return `${count}`
  const floor = count < 1000 ? 50 : 100
  return `${Math.floor(count / floor) * floor}+`
}
