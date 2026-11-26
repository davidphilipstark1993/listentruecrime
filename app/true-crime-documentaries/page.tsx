import type { Metadata } from 'next'
import Link from 'next/link'
import { getDocumentaryPosts } from '@/lib/blog'
import { PostCard } from '@/components/blog/PostCard'
import { Breadcrumbs } from '@/components/blog/Breadcrumbs'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BASE } from '@/lib/seo/config'

const URL = `${BASE}/true-crime-documentaries`

export const metadata: Metadata = {
  title: 'True Crime Documentaries: Netflix and TV Case Guides',
  description:
    'Just watched a true crime documentary on Netflix? Our guides explain the real case, what the film leaves out, where it stands now and the podcasts to hear next.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'True Crime Documentaries: Netflix and TV Case Guides',
    description:
      'The real cases behind Netflix and TV true crime documentaries, what each film adds, and the podcasts worth hearing next.',
    url: URL,
    type: 'website',
  },
}

export default function DocumentariesPage() {
  const posts = getDocumentaryPosts()

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'True Crime Documentaries: Netflix and TV Case Guides',
    url: URL,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: posts.length,
      itemListElement: posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${BASE}/blog/${p.slug}`,
        name: p.title,
      })),
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Header />
      <main id="main-content" className="min-h-screen bg-ink-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'Netflix & TV Documentaries' },
            ]}
          />
          <header className="mt-6 mb-10 max-w-3xl">
            <p className="text-2xs font-semibold uppercase tracking-widest text-crimson mb-2">
              Netflix &amp; TV documentaries
            </p>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone mb-4">
              True Crime Documentaries: Netflix and TV Case Guides
            </h1>
            <p className="text-stone-muted leading-relaxed mb-3">
              A documentary is one telling of a case. Each guide here starts from a Netflix or TV true crime
              documentary and sets out the real case behind it: what happened, what the courts decided, what
              the film adds and what it leaves out, where things stand now, and the podcasts worth hearing next.
            </p>
            <p className="text-sm text-stone-subtle leading-relaxed">
              Facts are checked against court records and reputable reporting, and we separate what was proved
              from what is still argued. {posts.length} guide{posts.length !== 1 ? 's' : ''} so far, newest first.
            </p>
          </header>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>

          <div className="mt-12 rounded-xl border border-white/[0.07] bg-ink-800/40 p-6 text-sm text-stone-muted">
            Looking for something to listen to instead? Try our guides to the{' '}
            <Link href="/best-true-crime-podcasts" className="text-crimson hover:underline">best true crime podcasts</Link>{' '}
            and{' '}
            <Link href="/new-true-crime-podcasts" className="text-crimson hover:underline">new true crime podcasts</Link>, or browse{' '}
            <Link href="/cases" className="text-crimson hover:underline">podcasts by case</Link>.
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
