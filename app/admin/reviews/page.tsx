import { createAdminClient } from '@/lib/supabase/admin'
import { ReviewManager } from '@/components/admin/review-manager'

async function getAllReviews() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('reviews')
    .select(`*, profile:profiles(username), podcast:podcasts(title, slug)`)
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function AdminReviewsPage() {
  const reviews = await getAllReviews()
  const pending = reviews.filter((r: any) => !r.approved && !r.flagged).length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Reviews</h1>
        <p className="text-stone-subtle text-sm">{reviews.length} total · {pending} pending moderation</p>
      </div>
      <ReviewManager initialReviews={reviews} />
    </div>
  )
}
