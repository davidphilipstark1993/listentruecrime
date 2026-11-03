import Link from 'next/link'
import { supabasePublic } from '@/lib/supabase/public'
import { cleanPlatformUrls } from '@/lib/platform-urls'

interface WhereToListenProps {
  /** Comma-separated podcast slugs (a string, because MDX props are most reliable as plain values). */
  slugs: string
}

/**
 * Platform table for a blog list, read from podcasts.platforms /
 * podcasts.platform_urls. Shows with no platform data are left out rather
 * than guessed at.
 */
export async function WhereToListen({ slugs: slugList }: WhereToListenProps) {
  const slugs = slugList.split(',').map(s => s.trim()).filter(Boolean)
  const { data } = await supabasePublic
    .from('podcasts')
    .select('slug, title, platforms, platform_urls')
    .eq('is_published', true)
    .in('slug', slugs)

  const bySlug = new Map((data ?? []).map(p => [p.slug as string, p]))
  const rows = slugs
    .map(slug => bySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => !!p && (p.platforms?.length ?? 0) > 0)

  if (rows.length === 0) return null

  return (
    <div className="not-prose overflow-x-auto my-6">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="text-stone-subtle border-b border-white/[0.07]">
            <th className="py-2 pr-4 font-semibold">Show</th>
            <th className="py-2 font-semibold">Listed on</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => {
            const urls = cleanPlatformUrls(p.platform_urls)
            return (
              <tr key={p.slug} className="border-b border-white/[0.04]">
                <td className="py-2 pr-4">
                  <Link href={`/podcasts/${p.slug}`} className="text-crimson hover:underline">{p.title}</Link>
                </td>
                <td className="py-2 text-stone-muted">
                  {(p.platforms as string[]).map((name, i) => (
                    <span key={name}>
                      {i > 0 && ', '}
                      {urls[name] ? (
                        <a href={urls[name]} target="_blank" rel="noopener noreferrer" className="hover:underline">{name}</a>
                      ) : name}
                    </span>
                  ))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
