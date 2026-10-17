import { LinkedText } from '@/components/seo/linked-text'
import type { Segment } from '@/lib/seo/text'

/**
 * Data-driven hub intro. Generated as a first draft — the data attribute
 * marks it for the owner's editorial pass (hand-edited copy goes in
 * lib/seo/hub-overrides.ts).
 */
export function HubIntro({ paragraphs }: { paragraphs: Segment[][] }) {
  return (
    <div className="space-y-3 max-w-2xl" data-todo="TODO(owner): review">
      {paragraphs.map((segments, i) => (
        <p key={i} className="text-stone-muted text-sm sm:text-base leading-relaxed">
          <LinkedText segments={segments} />
        </p>
      ))}
    </div>
  )
}
