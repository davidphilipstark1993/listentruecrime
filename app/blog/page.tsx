import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Rss } from 'lucide-react'
import { getAllPosts, getAllCategories, getAllTags } from '@/lib/blog'
import { getAllCases } from '@/lib/cases'
import { PostCard } from '@/components/blog/PostCard'
import { Pagination } from '@/components/ui/pagination'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BASE } from '@/lib/seo/config'

const PAGE_SIZE = 12

interface Props {
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page } = await searchParams
  const pageNum = Math.max(1, Number(page ?? 1) || 1)
  const suffix = pageNum > 1 ? ` — Page ${pageNum}` : ''

  return {
    title: `True Crime Podcast Blog — Guides, Reviews & Recommendations${suffix}`,
    description:
      'Expert guides to the best true crime podcasts. Beginner guides, deep dives, comparisons, and recommendations for every type of true crime listener.',
    alternates: {
      canonical: pageNum > 1 ? `${BASE}/blog?page=${pageNum}` : `${BASE}/blog`,
      types: { 'application/rss+xml': `${BASE}/blog/feed.xml` },
    },
    openGraph: {
      title: `True Crime Podcast Blog${suffix} | ListenTrueCrime`,
      description: 'Expert guides, comparisons, and recommendations for true crime podcast lovers.',
      url: `${BASE}/blog`,
    },
  }
}

export default async function BlogIndexPage({ searchParams }: Props) {
  const { page } = await searchParams
  const pageNum = Math.max(1, Number(page ?? 1) || 1)

  const posts = getAllPosts()
  const totalPages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE))
  if (pageNum > totalPages) notFound()

  const categories = getAllCategories()
  const tags = getAllTags()
  const series = getAllCases()
    .map(c => tags.find(t => c.aliases.some(a => a.toLowerCase() === t.name.toLowerCase())))
    .filter((t): t is NonNullable<typeof t> => Boolean(t) && t!.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
  // Featured strip only makes sense as a "start here" on page 1 — later
  // pages are pure chronological pagination of every post.
  const featured = pageNum === 1 ? posts.filter(p => p.featured).slice(0, 3) : []
  const latest = posts.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE)

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'ListenTrueCrime Blog',
    description: 'Expert guides, reviews, and recommendations for true crime podcast lovers.',
    url: `${BASE}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'ListenTrueCrime',
      url: BASE,
    },
    blogPost: posts.slice(0, 10).map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: p.date,
      dateModified: p.updated ?? p.date,
      url: `${BASE}/blog/${p.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Header />
      <main className="min-h-screen bg-ink-950">
        {/* Hero */}
        <section className="pt-28 pb-12 border-b border-white/[0.06]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-widest text-crimson mb-3">
                  The Blog
                </p>
                <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone mb-3">
                  True Crime Podcast Guides
                </h1>
                <p className="text-stone-muted max-w-xl">
                  Expert recommendations, beginner guides, deep dives, and comparisons to help you
                  find your next obsession.
                </p>
              </div>
              <a
                href="/blog/feed.xml"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] text-xs text-stone-subtle hover:text-stone hover:border-white/[0.15] transition-all flex-shrink-0 mt-2"
                title="RSS Feed"
              >
                <Rss className="w-3.5 h-3.5 text-orange-400" />
                RSS
              </a>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
            {/* Main content */}
            <div>
              {/* Featured posts */}
              {featured.length > 0 && (
                <section className="mb-12">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-4 h-px bg-crimson" />
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-subtle">
                      Featured
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {featured.map((post, i) => (
                      <PostCard key={post.slug} post={post} featured={i === 0} />
                    ))}
                  </div>
                </section>
              )}

              {/* All posts */}
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-4 h-px bg-crimson" />
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-subtle">
                    {pageNum === 1 ? 'Latest Articles' : `Articles — Page ${pageNum}`}
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {latest.map(post => (
                    <PostCard key={post.slug} post={post} />
                  ))}
                </div>
                <Pagination currentPage={pageNum} totalPages={totalPages} basePath="/blog" />
              </section>
            </div>

            {/* Sidebar */}
            <aside className="space-y-8">
              {/* Case deep-dive series */}
              {series.length > 0 && (
                <div className="rounded-xl border border-white/[0.07] bg-ink-800/40 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-subtle mb-4">
                    Case Deep Dives
                  </p>
                  <ul className="space-y-2">
                    {series.map(tag => (
                      <li key={tag.slug}>
                        <Link
                          href={`/blog/tag/${tag.slug}`}
                          className="flex items-center justify-between text-sm text-stone-muted hover:text-stone transition-colors"
                        >
                          <span>{tag.name} Case</span>
                          <span className="text-xs text-stone-subtle bg-ink-700 px-1.5 py-0.5 rounded">
                            {tag.count}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Categories */}
              {categories.length > 0 && (
                <div className="rounded-xl border border-white/[0.07] bg-ink-800/40 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-subtle mb-4">
                    Categories
                  </p>
                  <ul className="space-y-2">
                    {categories.map(cat => (
                      <li key={cat.slug}>
                        <Link
                          href={`/blog/category/${cat.slug}`}
                          className="flex items-center justify-between text-sm text-stone-muted hover:text-stone transition-colors"
                        >
                          <span>{cat.name}</span>
                          <span className="text-xs text-stone-subtle bg-ink-700 px-1.5 py-0.5 rounded">
                            {cat.count}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick links */}
              <div className="rounded-xl border border-white/[0.07] bg-ink-800/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-subtle mb-4">
                  Browse Podcasts
                </p>
                <ul className="space-y-2.5">
                  {[
                    { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
                    { href: '/category/cold-cases', label: 'Cold Case Podcasts' },
                    { href: '/category/investigative', label: 'Investigative Podcasts' },
                    { href: '/country/UK', label: 'British True Crime' },
                    { href: '/country/AU', label: 'Australian True Crime' },
                    { href: '/category/fraud-scams', label: 'Fraud & Scam Podcasts' },
                  ].map(link => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-stone-subtle hover:text-stone transition-colors"
                      >
                        → {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
