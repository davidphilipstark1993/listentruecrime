import { Mic } from 'lucide-react'

export function AuthorBox({ date, updated, readingTime }: {
  date: string
  updated?: string
  readingTime: string
}) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="flex items-start gap-3 py-4 border-y border-white/[0.07]">
      <div className="w-10 h-10 rounded-full bg-crimson/20 border border-crimson/30 flex items-center justify-center flex-shrink-0">
        <Mic className="w-4 h-4 text-crimson" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stone">ListenTrueCrime Editorial</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
          <span className="text-xs text-stone-subtle">{fmt(date)}</span>
          {updated && updated !== date && (
            <span className="text-xs text-stone-subtle">Updated {fmt(updated)}</span>
          )}
          <span className="text-xs text-stone-subtle">{readingTime}</span>
        </div>
      </div>
    </div>
  )
}
