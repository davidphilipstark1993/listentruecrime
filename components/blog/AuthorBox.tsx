import Link from 'next/link'
import { BASE } from '@/lib/seo/config'
import { getAuthor } from '@/lib/authors'

export function AuthorBox({ date, updated, readingTime, authorSlug }: {
  date: string
  updated?: string
  readingTime: string
  authorSlug?: string
}) {
  const author = getAuthor(authorSlug ?? 'david-stark')

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    jobTitle: author.role,
    url: `${BASE}/authors/${author.slug}`,
    worksFor: { '@type': 'Organization', name: 'ListenTrueCrime', url: BASE },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <div className="flex items-start gap-3 py-4 border-y border-white/[0.07]">
        <Link href={`/authors/${author.slug}`} aria-label={author.name}>
          <div className="w-10 h-10 rounded-full bg-crimson/20 border border-crimson/30 flex items-center justify-center flex-shrink-0 hover:border-crimson/60 transition-colors">
            <span className="text-crimson font-serif font-bold text-sm">{author.initials}</span>
          </div>
        </Link>
        <div className="min-w-0">
          <Link href={`/authors/${author.slug}`} className="text-sm font-semibold text-stone hover:text-crimson transition-colors">
            {author.name}
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <time dateTime={date} className="text-xs text-stone-subtle">{fmt(date)}</time>
            {updated && updated !== date && (
              <span className="text-xs text-stone-subtle">
                Updated <time dateTime={updated}>{fmt(updated)}</time>
              </span>
            )}
            <span className="text-xs text-stone-subtle">{readingTime}</span>
          </div>
        </div>
      </div>
    </>
  )
}
