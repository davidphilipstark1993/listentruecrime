import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strips stray wrapping quotes and a literal trailing "\n" (backslash-n as two
// characters, not a real newline) from an env var value — a copy/paste artifact
// from a malformed .env file that has broken builds when values were pasted
// straight into Vercel's dashboard/CLI.
export function sanitizeEnv(raw: string): string {
  return raw.trim().replace(/^"+|"+$/g, '').replace(/\\n$/g, '').trim()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatRelativeDate(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function scoreColor(score: number | null | undefined): string {
  if (!score) return 'text-stone-subtle'
  if (score >= 8) return 'text-emerald-400'
  if (score >= 6) return 'text-gold-light'
  return 'text-red-400'
}

export function scoreBg(score: number | null | undefined): string {
  if (!score) return 'bg-ink-600'
  if (score >= 8) return 'bg-emerald-900/40 text-emerald-400'
  if (score >= 6) return 'bg-amber-900/40 text-amber-400'
  return 'bg-red-900/40 text-red-400'
}

export function countryFlag(code: string | null | undefined): string {
  if (!code) return ''
  const flags: Record<string, string> = {
    US: '🇺🇸', UK: '🇬🇧', AU: '🇦🇺', CA: '🇨🇦', IE: '🇮🇪', NZ: '🇳🇿',
    ZA: '🇿🇦', KE: '🇰🇪', BE: '🇧🇪', MT: '🇲🇹', BR: '🇧🇷', PH: '🇵🇭', IN: '🇮🇳',
  }
  return flags[code] ?? ''
}

// Podcast descriptions come from imported RSS feeds and often carry raw feed
// markup (<p>, <br>, &nbsp;) that was never meant to reach a browser as text —
// React escapes it rather than rendering it, so it shows up literally on the
// page. Strip tags and decode the handful of entities feeds actually use.
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
