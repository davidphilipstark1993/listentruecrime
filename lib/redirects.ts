// Admin-managed 301 redirects (public.redirects). Looked up in middleware, so
// this file must stay edge-safe: no Node APIs, no supabase-js, just fetch.
import { sanitizeEnv } from '@/lib/utils'

export type RedirectMap = Record<string, string>

/** Canonical form used for both storage and lookup: leading slash, no query/hash, no trailing slash. */
export function normalisePath(input: string): string {
  let p = input.trim().split(/[?#]/)[0]
  if (!p.startsWith('/')) p = `/${p}`
  if (p.length > 1) p = p.replace(/\/+$/, '')
  return p
}

/** Returns an error message, or null when the redirect is safe to add. */
export function validateRedirect(from: string, to: string, existing: RedirectMap): string | null {
  const f = normalisePath(from)
  const t = normalisePath(to)
  if (f === '/') return 'The homepage cannot be redirected.'
  if (f === t) return 'From and to are the same path.'
  if (f.startsWith('/admin') || f.startsWith('/api') || f.startsWith('/auth')) return 'Admin, API and auth paths cannot be redirected.'
  if (existing[t] !== undefined) return `The target is itself redirected (${t} → ${existing[t]}); point at the final page instead.`
  // Any existing redirect that already lands on `from` would become a two-hop chain
  const chained = Object.entries(existing).find(([, dst]) => dst === f)
  if (chained) return `${chained[0]} already redirects to ${f}; update it to point at ${t} first.`
  return null
}

const TTL_MS = 60_000
const FAILURE_TTL_MS = 15_000
let cache: { map: RedirectMap; expires: number } | null = null

async function loadRedirects(): Promise<RedirectMap> {
  if (cache && cache.expires > Date.now()) return cache.map
  try {
    const base = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    const key = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const res = await fetch(`${base}/rest/v1/redirects?select=from_path,to_path`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) throw new Error(String(res.status))
    const rows = (await res.json()) as { from_path: string; to_path: string }[]
    const map: RedirectMap = {}
    for (const r of rows) map[normalisePath(r.from_path)] = normalisePath(r.to_path)
    cache = { map, expires: Date.now() + TTL_MS }
    return map
  } catch {
    // Table missing (migration not yet applied) or Supabase slow: never block
    // page requests on this. Keep serving the last good map if there is one.
    cache = { map: cache?.map ?? {}, expires: Date.now() + FAILURE_TTL_MS }
    return cache.map
  }
}

/** Target path for an admin-defined redirect, or null. Changes take effect within ~60s per server instance. */
export async function lookupRedirect(pathname: string): Promise<string | null> {
  const map = await loadRedirects()
  const target = map[normalisePath(pathname)]
  return target ?? null
}
