'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlogFAQ } from '@/lib/blog'

function FAQItem({ faq, defaultOpen = false }: { faq: BlogFAQ; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-white/[0.07] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-stone leading-snug">{faq.q}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-stone-subtle flex-shrink-0 mt-0.5 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-stone-muted leading-relaxed border-t border-white/[0.06] pt-3">
          {faq.a}
        </div>
      )}
    </div>
  )
}

export function FAQ({ faqs }: { faqs: BlogFAQ[] }) {
  if (!faqs.length) return null

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <section className="mt-12" id="faq">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h2 className="text-xl font-serif font-semibold text-stone mb-6">
        Frequently Asked Questions
      </h2>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <FAQItem key={i} faq={faq} defaultOpen={i === 0} />
        ))}
      </div>
    </section>
  )
}
