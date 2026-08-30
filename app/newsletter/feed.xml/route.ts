import { createAdminClient } from '@/lib/supabase/admin'
import { BASE } from '@/lib/seo/config'

export const dynamic = 'force-dynamic'

async function getIssues() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('newsletters')
    .select('title, slug, intro, publication_date, sent_at')
    .in('status', ['sent', 'archived'])
    .order('issue_number', { ascending: false })
    .limit(20)
  return data ?? []
}

export async function GET() {
  const issues = await getIssues()

  const items = issues
    .map(
      issue => `
    <item>
      <title><![CDATA[${issue.title}]]></title>
      <link>${BASE}/newsletter/${issue.slug}</link>
      <guid isPermaLink="true">${BASE}/newsletter/${issue.slug}</guid>
      <description><![CDATA[${issue.intro ?? ''}]]></description>
      <pubDate>${new Date(issue.sent_at ?? issue.publication_date).toUTCString()}</pubDate>
    </item>`
    )
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ListenTrueCrime Newsletter</title>
    <link>${BASE}/newsletter</link>
    <description>Five true crime podcasts worth listening to, every week.</description>
    <language>en-gb</language>
    <managingEditor>info@listentruecrime.com (ListenTrueCrime)</managingEditor>
    <webMaster>info@listentruecrime.com</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE}/newsletter/feed.xml" rel="self" type="application/rss+xml"/>
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
