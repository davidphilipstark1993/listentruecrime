import { createClient } from '@supabase/supabase-js'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://listentruecrime.com'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('title, slug, description, short_description, image_url, created_at, case_types')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = (podcasts ?? []).map(p => {
    const description = (p.short_description ?? p.description ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const title = p.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const url = `${BASE}/podcasts/${p.slug}`
    const pubDate = new Date(p.created_at).toUTCString()
    const categories = (p.case_types ?? []).map((t: string) => `<category>${t.replace(/&/g, '&amp;')}</category>`).join('')
    const image = p.image_url ? `<media:content url="${p.image_url}" medium="image"/>` : ''
    return `<item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      ${categories}
      ${image}
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>ListenTrueCrime — Latest Podcast Reviews</title>
    <link>${BASE}</link>
    <description>The latest true crime podcast reviews from ListenTrueCrime. Expert reviews, community ratings, and curated recommendations.</description>
    <language>en-gb</language>
    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE}/logo.png</url>
      <title>ListenTrueCrime</title>
      <link>${BASE}</link>
    </image>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
