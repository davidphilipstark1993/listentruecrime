import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { NewsletterIssueReview } from '@/components/admin/newsletter-issue-review'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewsletterIssueDetailPage({ params }: Props) {
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: newsletter }, { data: slots }, { data: shortlist }] = await Promise.all([
    admin.from('newsletters').select('*').eq('id', id).single(),
    admin
      .from('newsletter_podcasts')
      .select('*, discovery:podcast_discoveries(*), podcast:podcasts(title, slug, image_url)')
      .eq('newsletter_id', id)
      .order('position', { ascending: true }),
    admin
      .from('podcast_discoveries')
      .select('id, podcast_name, score, status')
      .eq('newsletter_id', id)
      .eq('status', 'shortlisted'),
  ])

  if (!newsletter) notFound()

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/admin/newsletter-issues" className="text-xs text-stone-muted hover:text-stone transition-colors mb-4 inline-block">
        ← Back to newsletter issues
      </Link>

      <div className="mb-6">
        <h1 className="heading-display text-2xl mb-1">
          Issue #{newsletter.issue_number} — {newsletter.title}
        </h1>
        <p className="text-stone-subtle text-sm">
          Publication date: {new Date(newsletter.publication_date).toLocaleDateString('en-GB')} · Status: {newsletter.status}
        </p>
      </div>

      <NewsletterIssueReview
        newsletter={newsletter}
        slots={slots ?? []}
        shortlist={shortlist ?? []}
      />
    </div>
  )
}
