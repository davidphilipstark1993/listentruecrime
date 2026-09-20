import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllTags, getPostsByTag } from '@/lib/blog'
import { PostCard } from '@/components/blog/PostCard'
import { Breadcrumbs } from '@/components/blog/Breadcrumbs'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BASE } from '@/lib/seo/config'

export async function generateStaticParams() {
  return getAllTags().map(t => ({ tag: t.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { tag: string }
}): Promise<Metadata> {
  const tags = getAllTags()
  const tag = tags.find(t => t.slug === params.tag)
  if (!tag) return {}
  return {
    title: `${tag.name} — True Crime Podcast Blog`,
    description: `Articles tagged "${tag.name}" on ListenTrueCrime. Expert podcast recommendations and guides.`,
    alternates: { canonical: `${BASE}/blog/tag/${params.tag}` },
  }
}

export default function TagPage({ params }: { params: { tag: string } }) {
  const tags = getAllTags()
  const tag = tags.find(t => t.slug === params.tag)
  if (!tag) notFound()

  const posts = getPostsByTag(tag.name)

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-ink-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: `#${tag.name}` },
            ]}
          />
          <header className="mt-6 mb-10">
            <p className="text-2xs font-semibold uppercase tracking-widest text-crimson mb-2">Tag</p>
            <h1 className="text-3xl font-serif font-bold text-stone mb-2">#{tag.name}</h1>
            <p className="text-stone-subtle text-sm">{tag.count} article{tag.count !== 1 ? 's' : ''}</p>
          </header>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
