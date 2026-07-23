import { getAllPosts } from '@/lib/blog'
import { BASE } from '@/lib/seo/config'

export const dynamic = 'force-static'

export async function GET() {
  const posts = getAllPosts().slice(0, 20)

  const items = posts
    .map(
      post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${BASE}/blog/${post.slug}</link>
      <guid isPermaLink="true">${BASE}/blog/${post.slug}</guid>
      <description><![CDATA[${post.description}]]></description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <category><![CDATA[${post.category}]]></category>
      ${post.tags.map(t => `<tag><![CDATA[${t}]]></tag>`).join('\n      ')}
    </item>`
    )
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>ListenTrueCrime Blog</title>
    <link>${BASE}/blog</link>
    <description>Expert guides, reviews, and recommendations for true crime podcast lovers.</description>
    <language>en-gb</language>
    <managingEditor>info@listentruecrime.com (ListenTrueCrime)</managingEditor>
    <webMaster>info@listentruecrime.com</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE}/og</url>
      <title>ListenTrueCrime Blog</title>
      <link>${BASE}/blog</link>
    </image>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  })
}
