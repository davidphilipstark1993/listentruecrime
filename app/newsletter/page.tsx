import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/blog/Breadcrumbs'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { buildItemListSchema } from '@/lib/seo/content'
import { BASE } from '@/lib/seo/config'

export const metadata: Metadata = {
  title: 'Newsletter Archive',
  description: 'Every past issue of the ListenTrueCrime newsletter — five true crime podcasts worth listening to, every week.',
  alternates: { canonical: `${BASE}/newsletter` },
  openGraph: {
    title: 'Newsletter Archive | ListenTrueCrime',
    description: 'Every past issue of the ListenTrueCrime newsletter.',
    url: `${BASE}/newsletter`,
  },
}

async function getIssues() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('newsletters')
    .select('id, slug, title, issue_number, publication_date, intro, newsletter_podcasts(position, podcast:podcasts(title), submission:newsletter_submissions(podcast_name))')
    .in('status', ['sent', 'archived'])
    .order('issue_number', { ascending: false })
  return data ?? []
}

export default async function NewsletterArchivePage() {
  const issues = await getIssues()

  const schema = buildItemListSchema(
    'ListenTrueCrime Newsletter Archive',
    'Every past issue of the ListenTrueCrime weekly newsletter.',
    issues.map(i => ({ name: `Issue #${i.issue_number} — ${i.title}`, url: `${BASE}/newsletter/${i.slug}` }))
  )

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Newsletter' }]} />

        <div className="mt-4 mb-10">
          <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">Newsletter Archive</p>
          <h1 className="heading-display text-3xl sm:text-4xl mb-4">Newsletter Archive</h1>
          <p className="text-stone-muted text-base leading-relaxed max-w-2xl">
            &ldquo;5 True Crime Podcasts Worth Listening To&rdquo; — every week, we send subscribers five
            true crime podcasts we&apos;ve discovered and think are worth their time. Browse past issues
            below, or subscribe to get the next one.
          </p>
        </div>

        <div className="card p-6 mb-10">
          <NewsletterForm source="newsletter_archive" showFirstName />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {issues.map(issue => {
            const featuredTitles = (issue.newsletter_podcasts as unknown as { position: number; podcast: { title: string } | null; submission: { podcast_name: string } | null }[] | null)
              ?.sort((a, b) => a.position - b.position)
              .map(np => np.podcast?.title ?? np.submission?.podcast_name)
              .filter(Boolean) as string[] | undefined

            return (
              <Link
                key={issue.id}
                href={`/newsletter/${issue.slug}`}
                className="card-hover p-5 flex flex-col gap-2"
              >
                <p className="text-2xs text-crimson font-semibold uppercase tracking-widest">
                  Issue #{issue.issue_number} · {new Date(issue.publication_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <h2 className="text-stone font-serif font-semibold text-lg">{issue.title}</h2>
                {featuredTitles?.length ? (
                  <p className="text-stone-subtle text-xs line-clamp-2">
                    Featuring: {featuredTitles.join(', ')}
                  </p>
                ) : null}
              </Link>
            )
          })}
          {issues.length === 0 && (
            <p className="text-stone-subtle text-sm sm:col-span-2 text-center py-12">
              No issues have been sent yet — subscribe above to get the first one.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
