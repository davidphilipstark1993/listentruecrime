// ListenAction for PodcastSeries. Targets are only the editor-entered listen URLs
// (podcasts.platform_urls); nothing is inferred or guessed.

export interface ListenLink {
  name: string
  url: string
}

// Primary platforms first, then the rest in the editor's order.
const PRIMARY_ORDER = ['Apple Podcasts', 'Spotify']

export function listenActionSchema(links: ListenLink[]) {
  const seen = new Set<string>()
  const unique = links.filter(l => (seen.has(l.url) ? false : (seen.add(l.url), true)))
  if (!unique.length) return null
  const rank = (l: ListenLink) => {
    const i = PRIMARY_ORDER.indexOf(l.name)
    return i === -1 ? PRIMARY_ORDER.length : i
  }
  const ordered = [...unique].sort((a, b) => rank(a) - rank(b)) // stable: ties keep editor order
  return {
    '@type': 'ListenAction',
    target: ordered.map(l => ({
      '@type': 'EntryPoint',
      urlTemplate: l.url,
      url: l.url,
      name: l.name,
      actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'],
    })),
  }
}
