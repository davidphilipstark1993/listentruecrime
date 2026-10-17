import Link from 'next/link'
import type { Segment } from '@/lib/seo/text'

/** Renders answer-first copy built by lib/seo, linking the segments that carry an href. */
export function LinkedText({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((seg, i) =>
        typeof seg === 'string' ? (
          <span key={i}>{seg}</span>
        ) : (
          <Link key={i} href={seg.href} className="text-stone hover:text-crimson underline decoration-white/20 underline-offset-2 transition-colors">
            {seg.text}
          </Link>
        )
      )}
    </>
  )
}
