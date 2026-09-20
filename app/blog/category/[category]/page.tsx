import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllPosts, getAllCategories, getPostsByCategory, slugifyCategory } from '@/lib/blog'
import { PostCard } from '@/components/blog/PostCard'
import { Breadcrumbs } from '@/components/blog/Breadcrumbs'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BASE } from '@/lib/seo/config'

export async function generateStaticParams() {
  return getAllCategories().map(c => ({ category: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { category: string }
}): Promise<Metadata> {
  const categories = getAllCategories()
  const cat = categories.find(c => c.slug === params.category)
  if (!cat) return {}
  return {
    title: `${cat.name} — True Crime Podcast Blog`,
    description: `Browse all ${cat.name.toLowerCase()} articles on ListenTrueCrime. Guides, recommendations, and deep dives to help you find the perfect podcast.`,
    alternates: { canonical: `${BASE}/blog/category/${params.category}` },
  }
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  const categories = getAllCategories()
  const cat = categories.find(c => c.slug === params.category)
  if (!cat) notFound()

  const posts = getPostsByCategory(cat.name)

  return (
    <>
      <Header />
      <main id="main-content" className="min-h-screen bg-ink-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: cat.name },
            ]}
          />
          <header className="mt-6 mb-10">
            <p className="text-2xs font-semibold uppercase tracking-widest text-crimson mb-2">
              Category
            </p>
            <h1 className="text-3xl font-serif font-bold text-stone mb-2">{cat.name}</h1>
            <p className="text-stone-subtle text-sm">{cat.count} article{cat.count !== 1 ? 's' : ''}</p>
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
