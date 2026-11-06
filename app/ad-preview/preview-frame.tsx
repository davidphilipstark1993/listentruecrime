'use client'
import { useEffect, useRef, useState } from 'react'
import { AdCard } from '@/components/ads/ad-card'
import type { AdLayout } from '@/lib/ads/placements'
import type { PublicAd } from '@/lib/ads/types'

interface Draft { ad: PublicAd; layout: AdLayout; placement: string }

export function AdPreviewFrame() {
  const [draft, setDraft] = useState<Draft | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'ad-preview-draft') return
      setDraft(e.data.draft as Draft)
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'ad-preview-ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const send = () => window.parent.postMessage({ type: 'ad-preview-height', height: el.offsetHeight }, window.location.origin)
    const ro = new ResizeObserver(send)
    ro.observe(el)
    send()
    return () => ro.disconnect()
  }, [draft])

  return (
    <div ref={ref} className="p-4 bg-ink-950">
      {draft ? (
        <AdCard ad={draft.ad} layout={draft.layout} placement={draft.placement} preview />
      ) : (
        <p className="text-stone-subtle text-sm p-6 text-center">Upload an image and fill in the details to see a preview.</p>
      )}
    </div>
  )
}
