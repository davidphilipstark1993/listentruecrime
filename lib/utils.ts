import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
  }
  return flags[code] ?? ''
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 1) + '…'
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
