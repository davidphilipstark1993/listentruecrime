import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 3600

const TIER_COLOURS: Record<string, { bg: string; label: string }> = {
  'Must listen': { bg: '#be123c', label: '★ Must Listen' },
  'Recommended': { bg: '#1d4ed8', label: '✓ Recommended' },
  'Worth a go':  { bg: '#374151', label: 'Worth a Go' },
  'Avoid':       { bg: '#1f2937', label: 'Avoid' },
}

// Two independent axes so podcasters can pick whatever fits their site —
// dark/light to match their page, full/compact to match the space they have.
const THEMES = {
  dark: { pageBg: '#111827', titleText: '#f9fafb', scoreText: '#fbbf24', brandText: '#6b7280', tierLabelText: '#fff' },
  light: { pageBg: '#ffffff', titleText: '#111827', scoreText: '#b45309', brandText: '#9ca3af', tierLabelText: '#fff' },
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

function renderFullBadge(theme: typeof THEMES.dark, tier: { bg: string; label: string }, title: string, scoreText: string) {
  const width = 240
  const height = 64
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><style>text { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }</style></defs>
  <rect width="${width}" height="${height}" rx="8" fill="${theme.pageBg}" ${theme.pageBg === '#ffffff' ? 'stroke="#e5e7eb"' : ''}/>
  <rect x="0" y="0" width="6" height="${height}" rx="4" fill="${tier.bg}"/>
  <rect x="14" y="10" width="96" height="18" rx="4" fill="${tier.bg}"/>
  <text x="62" y="23" text-anchor="middle" fill="${theme.tierLabelText}" font-size="10" font-weight="700">${escapeXml(tier.label)}</text>
  <text x="14" y="48" fill="${theme.titleText}" font-size="11" font-weight="600">${title}</text>
  ${scoreText ? `<text x="${width - 10}" y="23" text-anchor="end" fill="${theme.scoreText}" font-size="11" font-weight="700">${scoreText}</text>` : ''}
  <text x="${width - 10}" y="${height - 10}" text-anchor="end" fill="${theme.brandText}" font-size="9">ListenTrueCrime.com</text>
</svg>`
}

function renderCompactBadge(theme: typeof THEMES.dark, tier: { bg: string; label: string }, scoreText: string) {
  const width = 150
  const height = 32
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><style>text { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }</style></defs>
  <rect width="${width}" height="${height}" rx="6" fill="${theme.pageBg}" ${theme.pageBg === '#ffffff' ? 'stroke="#e5e7eb"' : ''}/>
  <rect x="0" y="0" width="4" height="${height}" rx="3" fill="${tier.bg}"/>
  <rect x="10" y="7" width="${scoreText ? 88 : 130}" height="18" rx="4" fill="${tier.bg}"/>
  <text x="${10 + (scoreText ? 44 : 65)}" y="20" text-anchor="middle" fill="${theme.tierLabelText}" font-size="10" font-weight="700">${escapeXml(tier.label)}</text>
  ${scoreText ? `<text x="${width - 10}" y="20" text-anchor="end" fill="${theme.scoreText}" font-size="11" font-weight="700">${scoreText}</text>` : ''}
</svg>`
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { searchParams } = new URL(req.url)
  const theme = searchParams.get('theme') === 'light' ? THEMES.light : THEMES.dark
  const compact = searchParams.get('size') === 'compact'

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('podcasts')
    .select('title, quick_verdict, rating_stats:podcast_rating_stats(avg_overall)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!data) {
    return new NextResponse('Not found', { status: 404 })
  }

  const tier = TIER_COLOURS[data.quick_verdict ?? ''] ?? TIER_COLOURS['Worth a go']
  const title = escapeXml(truncate(data.title ?? slug, 32))
  const score = (data.rating_stats as any)?.avg_overall
  const scoreText = score ? escapeXml(`${Number(score).toFixed(1)}/10`) : ''

  const svg = compact
    ? renderCompactBadge(theme, tier, scoreText)
    : renderFullBadge(theme, tier, title, scoreText)

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
