import Parser from 'rss-parser'

// rss-parser only supports requesting feed-level custom fields by their raw
// parsed key (no renaming, unlike item-level fields) — accessed via bracket
// notation below since colons aren't valid identifier characters.
interface FeedFields {
  'itunes:author'?: string
  language?: string
}

const parser = new Parser<FeedFields>({
  customFields: {
    feed: ['itunes:author', 'language'],
  },
})

export interface ParsedFeed {
  description: string | null
  hostName: string | null // only ever set from an explicit RSS field, never inferred
  language: string | null
  itemCount: number
  earliestItemDate: string | null
  latestItemDate: string | null
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

    return {
      description: feed.description ?? null,
      hostName: feed['itunes:author'] ?? null,
      language: feed.language ?? null,
      itemCount: feed.items.length,
      earliestItemDate: dates.length ? new Date(dates[0]).toISOString().slice(0, 10) : null,
      latestItemDate: dates.length ? new Date(dates[dates.length - 1]).toISOString().slice(0, 10) : null,
    }
  } catch (err) {
    console.error(`RSS parse error for ${rssUrl}:`, err)
    return null
  }
}
