import type { DayCounts } from '@/lib/ads/stats'

// One measure per chart (impressions and clicks differ ~50x in scale, so they
// never share an axis). Pure SVG, no client JS: hover a bar for its value,
// and the same numbers are in the table underneath.

const W = 640
const H = 120
const PAD = { top: 8, right: 4, bottom: 18, left: 4 }

function shortDay(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export function AdBarChart({ title, data, field }: { title: string; data: DayCounts[]; field: 'impressions' | 'clicks' }) {
  const total = data.reduce((s, d) => s + d[field], 0)
  const max = Math.max(1, ...data.map(d => d[field]))
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const step = data.length ? plotW / data.length : plotW
  const barW = Math.max(1.5, Math.min(14, step - 2))
  const ticks = data.length > 1 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : [0]

  return (
    <figure className="card p-5">
      <figcaption className="flex items-baseline justify-between mb-3">
        <span className="text-sm font-medium text-stone">{title}</span>
        <span className="text-xs text-stone-muted tabular-nums">{total.toLocaleString('en-GB')} total</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${title} per day, ${total} in total`}>
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.12)" />
        {data.map((d, i) => {
          const h = (d[field] / max) * plotH
          const x = PAD.left + i * step + (step - barW) / 2
          return (
            <g key={d.day}>
              <rect x={PAD.left + i * step} y={PAD.top} width={step} height={plotH} fill="transparent" />
              {d[field] > 0 && <rect x={x} y={PAD.top + plotH - h} width={barW} height={h} rx={Math.min(2, barW / 2)} fill="#be123c" />}
              <title>{`${shortDay(d.day)}: ${d[field].toLocaleString('en-GB')}`}</title>
            </g>
          )
        })}
        {ticks.map(i => (
          <text key={i} x={PAD.left + i * step + step / 2} y={H - 4} fontSize="10" fill="#9ca3af"
            textAnchor={i === 0 && ticks.length > 1 ? 'start' : i === data.length - 1 && ticks.length > 1 ? 'end' : 'middle'}>
            {data[i] ? shortDay(data[i].day) : ''}
          </text>
        ))}
        <text x={W - PAD.right} y={PAD.top + 8} fontSize="10" fill="#6b7280" textAnchor="end">peak {max.toLocaleString('en-GB')}</text>
      </svg>
    </figure>
  )
}
