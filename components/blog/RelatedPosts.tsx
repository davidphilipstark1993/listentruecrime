import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { BlogPost } from '@/lib/blog'

export function RelatedPosts({ posts }: { posts: BlogPost[] }) {
  if (!posts.length) return null
  return (
    <section className="mt-12 pt-8 border-t border-white/[0.07]">
      <h2 className="text-lg font-serif font-semibold text-stone mb-5">More from our blog</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map(post => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group rounded-xl border border-white/[0.07] bg-ink-800/40 p-4 hover:bg-ink-700/50 hover:border-white/[0.12] transition-all"
          >
            <p className="text-2xs font-semibold uppercase tracking-wider text-crimson mb-2">
              {post.category}
            </p>
            <h3 className="text-sm font-medium text-stone leading-snug group-hover:text-stone transition-colors line-clamp-2 mb-2">
              {post.title}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-stone-subtle">
              <Clock className="w-3 h-3" />
              {post.readingTime}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
