import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'

export interface FaqItem {
  q: string
  a: string
  link?: { href: string; label: string }
}

/**
 * Collapsible FAQ. The answer text is rendered exactly as passed so it can
 * be reused verbatim as the FAQPage schema `text`.
 */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((faq, i) => (
        <details key={i} className="card p-5 group">
          <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
            <span className="text-stone font-medium text-sm">{faq.q}</span>
            <ChevronDown size={16} className="text-stone-subtle shrink-0 group-open:hidden" />
            <ChevronUp size={16} className="text-stone-subtle shrink-0 hidden group-open:block" />
          </summary>
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-stone-muted text-sm leading-relaxed">{faq.a}</p>
            {faq.link && (
              <Link href={faq.link.href} className="inline-block mt-2 text-crimson text-sm hover:underline">
                {faq.link.label} →
              </Link>
            )}
          </div>
        </details>
      ))}
    </div>
  )
}
