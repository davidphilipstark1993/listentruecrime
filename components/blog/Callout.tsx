import { Info, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type CalloutType = 'info' | 'warning' | 'tip' | 'verdict'

const styles: Record<CalloutType, { border: string; bg: string; icon: ReactNode; label: string }> = {
  info: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/[0.06]',
    icon: <Info className="w-4 h-4 text-blue-400" />,
    label: 'Note',
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/[0.06]',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    label: 'Heads up',
  },
  tip: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/[0.06]',
    icon: <Lightbulb className="w-4 h-4 text-emerald-400" />,
    label: 'Tip',
  },
  verdict: {
    border: 'border-crimson/30',
    bg: 'bg-crimson/[0.06]',
    icon: <CheckCircle className="w-4 h-4 text-crimson" />,
    label: 'Our verdict',
  },
}

export function Callout({ type = 'info', children }: { type?: CalloutType; children: ReactNode }) {
  const s = styles[type]
  return (
    <div className={cn('rounded-xl border p-4 my-6 not-prose', s.border, s.bg)}>
      <div className="flex items-center gap-2 mb-2">
        {s.icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-muted">
          {s.label}
        </span>
      </div>
      <div className="text-sm text-stone-muted leading-relaxed">{children}</div>
    </div>
  )
}
