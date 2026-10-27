import { cn } from '@/lib/utils'

const TONES: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-400',
  shipped: 'bg-emerald-500/10 text-emerald-400',
  delivered: 'bg-emerald-500/10 text-emerald-400',
  in_production: 'bg-sky-500/10 text-sky-400',
  created: 'bg-sky-500/10 text-sky-400',
  queued: 'bg-amber-500/10 text-amber-400',
  submitting: 'bg-amber-500/10 text-amber-400',
  pending: 'bg-white/5 text-stone-subtle',
  awaiting_payment: 'bg-white/5 text-stone-subtle',
  partially_refunded: 'bg-amber-500/10 text-amber-400',
  refunded: 'bg-amber-500/10 text-amber-400',
  failed: 'bg-red-500/10 text-red-400',
  needs_review: 'bg-red-500/10 text-red-400',
  expired: 'bg-white/5 text-stone-subtle',
  cancelled: 'bg-white/5 text-stone-subtle',
}

export function StatusBadge({ value }: { value: string }) {
  return <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs', TONES[value] ?? 'bg-white/5 text-stone-subtle')}>{value.replace(/_/g, ' ')}</span>
}

export function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className="card p-5">
      <p className={cn('font-serif text-2xl font-semibold', tone === 'bad' ? 'text-red-400' : tone === 'good' ? 'text-emerald-400' : 'text-stone')}>{value}</p>
      <p className="mt-1 text-xs text-stone-subtle">{label}</p>
      {sub && <p className="mt-1 text-2xs text-stone-subtle">{sub}</p>}
    </div>
  )
}
