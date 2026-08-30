import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/blog/Breadcrumbs'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { scoreColor } from '@/lib/utils'
import { BASE } from '@/lib/seo/config'

interface Props {
  params: Promise<{ slug: string }>
}

async function getIssue(slug: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('newsletters')
    .select(`
      *,
      newsletter_podcasts (
        position, blurb,
        podcast:podcasts (title, slug, image_url, website_url),
        discovery:podcast_discoveries (podcast_name, artwork_url, website_url, apple_url, spotify_url, score, hosts, format, episode_count)
      )
    `)
    .eq('slug', slug)
    .in('status', ['sent', 'archived'])
    .single()
  return data
}

export async function generateStaticParams() {
  const admin = createAdminClient()
  const { data } = await admin.from('newsletters').select('slug').in('status', ['sent', 'archived'])
  return (data ?? []).map(n => ({ slug: n.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const issue = await getIssue(slug)
  if (!issue) return {}

  const description = issue.intro ?? `Five true crime podcasts worth listening to — issue #${issue.issue_number} of the ListenTrueCrime newsletter.`

  return {
    title: issue.title,
    description,
    alternates: { canonical: `${BASE}/newsletter/${issue.slug}` },
    openGraph: {
      title: issue.title,
      description,
      url: `${BASE}/newsletter/${issue.slug}`,
      type: 'article',
      publishedTime: issue.sent_at ?? issue.publication_date,
    },
    twitter: {
      card: 'summary_large_image',
      title: issue.title,
      description,
    },
  }
}

export const revalidate = 3600

export default async function NewsletterIssuePage({ params }: Props) {
  const { slug } = await params
  const issue = await getIssue(slug)
  if (!issue) notFound()

  const items = (issue.newsletter_podcasts ?? []).sort((a: any, b: any) => a.position - b.position)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: issue.title,
    datePublished: issue.sent_at ?? issue.publication_date,
    dateModified: issue.updated_at,
    url: `${BASE}/newsletter/${issue.slug}`,
    author: { '@type': 'Organization', name: 'ListenTrueCrime' },
    publisher: { '@type': 'Organization', name: 'ListenTrueCrime' },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Newsletter', href: '/newsletter' }, { label: `Issue #${issue.issue_number}` }]} />

        <div className="mt-4 mb-10">
          <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">
            Issue #{issue.issue_number} · {new Date(issue.publication_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="heading-display text-3xl sm:text-4xl mb-4">{issue.title}</h1>
          {issue.intro && <p className="text-stone-muted text-base leading-relaxed">{issue.intro}</p>}
        </div>

        <div className="space-y-8 mb-12">
          {items.map((item: any) => {
            const title = item.podcast?.title ?? item.discovery?.podcast_name ?? 'Untitled'
            const artwork = item.podcast?.image_url ?? item.discovery?.artwork_url
            const podcastHref = item.podcast?.slug ? `/podcasts/${item.podcast.slug}` : undefined
            const hosts = item.discovery?.hosts?.map((h: { name: string }) => h.name).join(', ')

            return (
              <div key={item.position} className="card p-6">
                <div className="flex items-start gap-4 mb-3">
                  {artwork && (
                    <Image src={artwork} alt={title} width={64} height={64} className="rounded-lg shrink-0" unoptimized />
                  )}
                  <div>
                    <span className="text-2xs text-crimson font-semibold">#{item.position}</span>
                    {podcastHref ? (
                      <Link href={podcastHref} className="block text-stone font-serif font-semibold text-xl hover:text-crimson transition-colors">
                        {title}
                      </Link>
                    ) : (
                      <h2 className="text-stone font-serif font-semibold text-xl">{title}</h2>
                    )}
                    <p className="text-stone-subtle text-xs mt-1">
                      {[hosts, item.discovery?.format, item.discovery?.episode_count != null ? `${item.discovery.episode_count} episodes` : null]
                        .filter(Boolean)
                        .join(' · ')}
                      {item.discovery?.score != null && (
                        <span className={`ml-2 font-medium ${scoreColor(item.discovery.score)}`}>{item.discovery.score}/10</span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="text-stone-muted text-sm leading-relaxed whitespace-pre-line mb-4">{item.blurb}</p>
                <div className="flex flex-wrap gap-4 text-xs">
                  {podcastHref && <Link href={podcastHref} className="text-crimson hover:underline">Full review →</Link>}
                  {item.discovery?.apple_url && <a href={item.discovery.apple_url} target="_blank" className="text-crimson hover:underline">Apple Podcasts →</a>}
                  {item.discovery?.spotify_url && <a href={item.discovery.spotify_url} target="_blank" className="text-crimson hover:underline">Spotify →</a>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="card p-6">
          <p className="text-stone font-semibold text-sm mb-3">Get the next issue</p>
          <NewsletterForm source="newsletter_issue_footer" showFirstName />
        </div>
      </main>
      <Footer />
    </>
  )
}
