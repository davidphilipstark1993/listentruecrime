import Link from 'next/link'
import Image from 'next/image'
import { Clock, Tag } from 'lucide-react'
import type { BlogPost } from '@/lib/blog'
import { cn } from '@/lib/utils'

export function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  const dateStr = new Date(post.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        'group block rounded-xl border border-white/[0.07] bg-ink-800/40 overflow-hidden',
        'hover:bg-ink-700/50 hover:border-white/[0.12] hover:shadow-card transition-all',
        featured && 'sm:col-span-2'
      )}
    >
      {post.image && (
        <div className={cn('relative overflow-hidden border-b border-white/[0.07] bg-ink-900', featured ? 'aspect-[16/9] sm:aspect-[21/9]' : 'aspect-[16/9]')}>
          <Image
            src={post.image}
            alt={post.imageAlt ?? ''}
            fill
            sizes={featured ? '(min-width: 1024px) 640px, 100vw' : '(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw'}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xs font-semibold uppercase tracking-widest text-crimson">
            {post.category}
          </span>
          {post.featured && (
            <span className="text-2xs px-1.5 py-0.5 rounded bg-gold/10 text-gold-light border border-gold/20">
              Featured
            </span>
          )}
        </div>
        <h3
          className={cn(
            'font-serif font-semibold text-stone group-hover:text-white transition-colors leading-snug mb-2',
            featured ? 'text-xl' : 'text-base'
          )}
        >
          {post.title}
        </h3>
        <p className="text-sm text-stone-subtle leading-relaxed line-clamp-2 mb-4">
          {post.description}
        </p>
        <div className="flex items-center gap-3 text-xs text-stone-subtle">
          <span>{dateStr}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {post.readingTime}
          </span>
          {post.tags[0] && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {post.tags[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
