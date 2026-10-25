// Per-platform listen URLs (podcasts.platform_urls). A platform only counts as
// available when it has an http(s) URL here, so every consumer goes through
// these helpers rather than reading podcasts.platforms directly.

export type PlatformUrls = Record<string, string>

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Parse the jsonb column defensively; drops anything that isn't a valid http(s) URL. */
export function cleanPlatformUrls(raw: unknown): PlatformUrls {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: PlatformUrls = {}
  for (const [name, url] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof url === 'string' && isHttpUrl(url)) out[name] = url.trim()
  }
  return out
}

/** Platforms with a real URL, in the order of `platforms` (the editor's ticked list). */
export function listenLinks(platforms: string[] | null, raw: unknown): { name: string; url: string }[] {
  const urls = cleanPlatformUrls(raw)
  return (platforms ?? []).filter(p => urls[p]).map(p => ({ name: p, url: urls[p] }))
}
