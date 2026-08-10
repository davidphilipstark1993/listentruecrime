import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getAuthor, getAllAuthors } from '@/lib/authors'
import { getAllPosts } from '@/lib/blog'
import { PostCard } from '@/components/blog/PostCard'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BASE } from '@/lib/seo/config'
import { buildBreadcrumbSchema } from '@/lib/seo/content'

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getAllAuthors().map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const author = getAuthor(slug)
  return {
    title: `${author.name} — Author at ListenTrueCrime`,
    description: author.bio.slice(0, 160),
    alternates: { canonical: `${BASE}/authors/${slug}` },
  }
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params
  const author = getAuthor(slug)
  if (!author) notFound()

  const posts = getAllPosts().filter(p => (p.author ?? 'david-stark') === slug)

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    url: `${BASE}/authors/${author.slug}`,
    worksFor: { '@type': 'Organization', name: 'ListenTrueCrime', url: BASE },
  }

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Blog', url: `${BASE}/blog` },
    { name: author.name, url: `${BASE}/authors/${author.slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <Header />
      <main className="min-h-screen bg-ink-950 pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-8">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-stone transition-colors">Blog</Link>
            <span>/</span>
            <span className="text-stone-muted">{author.name}</span>
          </nav>

          {/* Author card */}
          <div className="flex items-start gap-5 mb-12 pb-12 border-b border-white/[0.07]">
            <div className="w-16 h-16 rounded-full bg-crimson/20 border border-crimson/30 flex items-center justify-center shrink-0">
              <span className="text-crimson font-serif font-bold text-lg">{author.initials}</span>
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-stone mb-1">{author.name}</h1>
              <p className="text-crimson text-sm font-semibold uppercase tracking-widest mb-3">{author.role}</p>
              <p className="text-stone-muted text-sm leading-relaxed max-w-2xl">{author.bio}</p>
            </div>
          </div>

          {/* Posts */}
          <h2 className="font-serif text-xl text-stone mb-6">
            Articles by {author.name.split(' ')[0]} ({posts.length})
          </h2>

          {posts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {posts.map(post => <PostCard key={post.slug} post={post} />)}
            </div>
          ) : (
            <p className="text-stone-subtle text-sm">No articles yet.</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
