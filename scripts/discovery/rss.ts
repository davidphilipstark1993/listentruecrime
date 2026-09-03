import Parser from 'rss-parser'

// rss-parser only supports requesting feed-level custom fields by their raw
// parsed key (no renaming, unlike item-level fields) — accessed via bracket
// notation below since colons aren't valid identifier characters.
interface FeedFields {
  'itunes:author'?: string
  language?: string
}

interface ItemFields {
  itunesDuration?: string
}

const parser = new Parser<FeedFields, ItemFields>({
  customFields: {
    feed: ['itunes:author', 'language'],
    item: [['itunes:duration', 'itunesDuration']],
  },
})

export interface ParsedFeed {
  description: string | null
  hostName: string | null // only ever set from an explicit RSS field, never inferred
  language: string | null
  itemCount: number
  earliestItemDate: string | null
  latestItemDate: string | null
  /** Average duration (minutes) of the most recent episodes that publish a duration — null if none do. */
  averageEpisodeMinutes: number | null
}

/**
 * Podcast RSS <description>/<itunes:summary> fields are frequently authored
 * as HTML (podcast apps render them as such) — strip markup so this text is
 * safe to drop straight into a plain-text template or hand to the AI
 * blurb-drafter as a "fact" without leaking tags into the output.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parses itunes:duration, which may be "HH:MM:SS", "MM:SS", or a plain seconds integer. */
function parseDurationToMinutes(raw: string): number | null {
  const trimmed = raw.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed) / 60
  const parts = trimmed.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) / 60
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) / 60
  return null
}

/**
 * Parses a podcast's own RSS feed — the first-party ground truth for
 * discovery. Only structured fields are extracted; nothing here is ever
 * inferred or guessed from free text.
 */
export async function parseFeed(rssUrl: string): Promise<ParsedFeed | null> {
  try {
    const feed = await parser.parseURL(rssUrl)
    const dates = feed.items
      .map(item => (item.isoDate ? new Date(item.isoDate).getTime() : null))
      .filter((t): t is number => t !== null)
      .sort((a, b) => a - b)

    const recentDurations = feed.items
      .slice(0, 10)
      .map(item => (item.itunesDuration ? parseDurationToMinutes(item.itunesDuration) : null))
      .filter((m): m is number => m !== null && m > 0)

    const averageEpisodeMinutes = recentDurations.length
      ? recentDurations.reduce((sum, m) => sum + m, 0) / recentDurations.length
      : null

    return {
      description: feed.description ? stripHtml(feed.description) : null,
      hostName: feed['itunes:author'] ?? null,
      language: feed.language ?? null,
      itemCount: feed.items.length,
      earliestItemDate: dates.length ? new Date(dates[0]).toISOString().slice(0, 10) : null,
      latestItemDate: dates.length ? new Date(dates[dates.length - 1]).toISOString().slice(0, 10) : null,
      averageEpisodeMinutes,
    }
  } catch (err) {
    console.error(`RSS parse error for ${rssUrl}:`, err)
    return null
  }
}
