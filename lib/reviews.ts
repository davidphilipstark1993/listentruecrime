import { getAuthor, type Author } from '@/lib/authors'

export interface ReviewMeta {
  author: Author
  /** ISO timestamp the review was written (falls back to the row's created_at). */
  reviewedAt: string
  /** ISO timestamp of the last edit, only when it is a later day than the review. */
  updatedAt: string | null
}

const day = (iso: string) => iso.slice(0, 10)

/**
 * Who reviewed a podcast and when. `reviewed_by` / `reviewed_at` are the
 * stored fields (migration 017); until they are filled in, this falls back to
 * the site's one author and the row's created_at, which is what the page
 * already showed as the review date.
 */
export function getReviewMeta(podcast: {
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at?: string | null
}): ReviewMeta {
  const reviewedAt = podcast.reviewed_at ?? podcast.created_at
  const updated = podcast.updated_at
  return {
    author: getAuthor(podcast.reviewed_by ?? 'david-stark'),
    reviewedAt,
    updatedAt: updated && day(updated) > day(reviewedAt) ? updated : null,
  }
}

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
