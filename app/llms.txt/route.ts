import { BASE } from '@/lib/seo/config'
import { getAllPosts } from '@/lib/blog'
import { buildLlmsTxt } from '@/lib/seo/llms'

export async function GET() {
  const guides = getAllPosts().map(p => ({ slug: p.slug, title: p.title, featured: p.featured }))

  return new Response(buildLlmsTxt(BASE, guides), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  })
}
