'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { scoreColor } from '@/lib/utils'
import type { Newsletter, NewsletterPodcast, PodcastDiscovery } from '@/lib/types/database'

type Slot = NewsletterPodcast & {
  discovery: PodcastDiscovery | null
  podcast: { title: string; slug: string; image_url: string | null } | null
}

interface ShortlistCandidate {
  id: string
  podcast_name: string
  score: number | null
  status: string
}

interface Props {
  newsletter: Newsletter
  slots: Slot[]
  shortlist: ShortlistCandidate[]
}

export function NewsletterIssueReview({ newsletter, slots: initialSlots, shortlist }: Props) {
  const [slots, setSlots] = useState(initialSlots)
  const [status, setStatus] = useState(newsletter.status)
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const featuredDiscoveryIds = new Set(slots.map(s => s.podcast_discovery_id))
  const replacementOptions = shortlist.filter(c => !featuredDiscoveryIds.has(c.id))

  const saveBlurb = async (slotId: string, blurb: string) => {
    const { error } = await supabase.from('newsletter_podcasts').update({ blurb }).eq('id', slotId)
    if (error) {
      toast.error('Could not save blurb')
      return
    }
    toast.success('Blurb saved')
  }

  const replace = async (slotId: string, newDiscoveryId: string) => {
    setBusy(slotId)
    try {
      const res = await fetch(`/api/newsletter-issues/${newsletter.id}/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, newDiscoveryId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Replace failed')
      toast.success('Slot replaced — redrafting blurb')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Replace failed')
    } finally {
      setBusy(null)
    }
  }

  const approve = async () => {
    setBusy('approve')
    try {
      const res = await fetch(`/api/newsletter-issues/${newsletter.id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Approve failed')
      setStatus('approved')
      toast.success('Issue approved — ready to send')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setBusy(null)
    }
  }

  const send = async () => {
    if (!confirm(`Send issue #${newsletter.issue_number} to all active subscribers? This cannot be undone.`)) return
    setBusy('send')
    try {
      const res = await fetch(`/api/newsletter-issues/${newsletter.id}/send`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      setStatus('sent')
      toast.success(`Sent to ${data.sentCount} subscribers`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="space-y-4 mb-6">
        {slots.map(slot => {
          const title = slot.podcast?.title ?? slot.discovery?.podcast_name ?? 'Untitled'
          const artwork = slot.podcast?.image_url ?? slot.discovery?.artwork_url
          return (
            <div key={slot.id} className="card p-5">
              <div className="flex items-start gap-4">
                {artwork && (
                  <Image src={artwork} alt={title} width={56} height={56} className="rounded-lg shrink-0" unoptimized />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xs text-crimson font-semibold">#{slot.position}</span>
                    <span className="text-stone font-semibold text-sm">{title}</span>
                    {slot.discovery?.score != null && (
                      <span className={`text-xs font-medium ${scoreColor(slot.discovery.score)}`}>{slot.discovery.score}/10</span>
                    )}
                  </div>
                  <textarea
                    defaultValue={slot.blurb ?? ''}
                    onBlur={e => saveBlurb(slot.id, e.target.value)}
                    rows={4}
                    placeholder="Blurb not yet drafted"
                    className="input-base w-full text-sm mb-2"
                  />
                  {replacementOptions.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={e => e.target.value && replace(slot.id, e.target.value)}
                      disabled={busy === slot.id}
                      className="input-base text-xs py-1.5"
                    >
                      <option value="">Replace with…</option>
                      {replacementOptions.map(c => (
                        <option key={c.id} value={c.id}>{c.podcast_name} ({c.score ?? '—'}/10)</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-5 flex items-center gap-3">
        <button
          onClick={approve}
          disabled={busy !== null || status !== 'review'}
          className="btn-primary text-sm disabled:opacity-40"
        >
          {busy === 'approve' ? 'Approving…' : 'Approve issue'}
        </button>
        <button
          onClick={send}
          disabled={busy !== null || status !== 'approved'}
          className="btn-outline text-sm disabled:opacity-40"
        >
          {busy === 'send' ? 'Sending…' : 'Send to subscribers'}
        </button>
        <span className="text-stone-subtle text-xs ml-auto">
          {status === 'review' && 'Fill in all 5 blurbs, then approve.'}
          {status === 'approved' && 'Approved — ready to send.'}
          {status === 'sent' && 'This issue has already been sent.'}
        </span>
      </div>
    </div>
  )
}
