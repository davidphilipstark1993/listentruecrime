'use client'
import { sendGAEvent } from '@next/third-parties/google'

// Browser-side helpers for advert tracking. Everything here is best-effort:
// it can never throw into the page or delay a click.

let memorySession: string | null = null

/** Random id for this browser tab session. Not stored server-side (only hashed into a dedupe key). */
export function getSessionId(): string {
  const make = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  try {
    let id = sessionStorage.getItem('ltc-ad-sid')
    if (!id) {
      id = make()
      sessionStorage.setItem('ltc-ad-sid', id)
    }
    return id
  } catch {
    return (memorySession ??= make())
  }
}

type TrackEvent = 'impression' | 'click'

export function sendAdEvent(event: TrackEvent, adId: string, placement: string) {
  const body = JSON.stringify({
    ad_id: adId,
    event,
    placement,
    page_path: window.location.pathname,
    session_id: getSessionId(),
  })
  try {
    const ok = navigator.sendBeacon?.('/api/ads/track', new Blob([body], { type: 'application/json' }))
    if (!ok) fetch('/api/ads/track', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
  } catch {
    // tracking is best-effort
  }
  if (event === 'click') {
    try {
      sendGAEvent('event', 'ad_click', { ad_id: adId, ad_placement: placement, page_path: window.location.pathname })
    } catch {
      // analytics must never break the page
    }
  }
}

const lastClick = new Map<string, number>()

/** Ignores repeat clicks on the same advert within 2 s (double-taps, rage clicks). */
export function trackAdClick(adId: string, placement: string) {
  const key = `${adId}:${placement}`
  const now = Date.now()
  if (now - (lastClick.get(key) ?? 0) < 2000) return
  lastClick.set(key, now)
  sendAdEvent('click', adId, placement)
}

export const VIEW_THRESHOLD = 0.5 // at least half the advert on screen…
export const VIEW_DURATION_MS = 1000 // …for one continuous second, with the tab in the foreground

/**
 * Calls onViewed once when the element has been genuinely visible
 * (see thresholds above). Returns a cleanup function.
 */
export function observeViewable(el: Element, onViewed: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {}
  let inView = false
  let done = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const stop = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
  }
  const start = () => {
    if (done || timer || !inView || document.visibilityState !== 'visible') return
    timer = setTimeout(() => {
      timer = undefined
      if (inView && document.visibilityState === 'visible') {
        done = true
        onViewed()
      }
    }, VIEW_DURATION_MS)
  }
  const io = new IntersectionObserver(
    entries => {
      inView = entries[entries.length - 1].isIntersecting
      inView ? start() : stop()
    },
    { threshold: VIEW_THRESHOLD }
  )
  const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop())
  io.observe(el)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    stop()
    io.disconnect()
    document.removeEventListener('visibilitychange', onVisibility)
  }
}
