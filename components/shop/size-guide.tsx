import type { SizeGuide } from '@/lib/shop/types'

export function SizeGuideTable({ guide }: { guide: SizeGuide | null }) {
  if (!guide) {
    return <p className="text-sm text-stone-muted">The size chart for this product will appear here once the final item is confirmed. Until then, please check back before ordering.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-white/10 text-xs uppercase tracking-wider text-stone-muted">{guide.columns.map(c => <th key={c} className="py-2 pr-4 font-medium">{c}</th>)}</tr></thead>
        <tbody>{guide.rows.map((r, i) => <tr key={i} className="border-b border-white/[0.05]">{r.map((cell, j) => <td key={j} className="py-2 pr-4 text-stone-muted">{cell}</td>)}</tr>)}</tbody>
      </table>
      {guide.unit && <p className="mt-2 text-xs text-stone-subtle">Measurements in {guide.unit}.</p>}
    </div>
  )
}
