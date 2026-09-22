'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { campaignTimingLabel, promotionInterestLabel, PROMOTION_ENQUIRY_STATUSES, type PromotionEnquiryStatus } from '@/lib/promotion/packages'
import type { PodcastPromotionEnquiry } from '@/lib/types/database'

const STATUS_COLOR: Record<PromotionEnquiryStatus, string> = {
  new: 'bg-crimson-faint text-crimson',
  contacted: 'bg-blue-900/40 text-blue-300',
  quoted: 'bg-amber-900/40 text-amber-400',
  won: 'bg-emerald-900/40 text-emerald-400',
  declined: 'bg-white/5 text-stone-subtle',
  completed: 'bg-white/5 text-stone-muted',
}

export function PromotionEnquiryRow({ enquiry }: { enquiry: PodcastPromotionEnquiry }) {
  const [status, setStatus] = useState(enquiry.status)
  const [notes, setNotes] = useState(enquiry.admin_notes ?? '')
  const [savedNotes, setSavedNotes] = useState(enquiry.admin_notes ?? '')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function save(update: { status?: PromotionEnquiryStatus; admin_notes?: string }) {
    setSaving(true)
    try {
      const res = await fetch(`/api/promotion-enquiries/${enquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      if (update.admin_notes !== undefined) setSavedNotes(update.admin_notes)
      toast.success('Saved')
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(next: PromotionEnquiryStatus) {
    const previous = status
    setStatus(next)
    if (!(await save({ status: next }))) setStatus(previous)
  }

  return (
    <>
      <tr className="hover:bg-white/[0.02] transition-colors align-top">
        <td className="px-4 py-3 text-stone-subtle text-xs whitespace-nowrap">
          {new Date(enquiry.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </td>
        <td className="px-4 py-3 text-stone text-sm">
          {enquiry.name}
          <a href={`mailto:${enquiry.email}`} className="block text-stone-subtle text-xs hover:text-stone">{enquiry.email}</a>
        </td>
        <td className="px-4 py-3 text-stone text-sm">
          {enquiry.podcast_name}
          <div className="flex gap-2 text-xs">
            {enquiry.podcast_website && <a href={enquiry.podcast_website} target="_blank" rel="noopener noreferrer nofollow" className="text-crimson hover:underline">Website</a>}
            {enquiry.rss_feed && <a href={enquiry.rss_feed} target="_blank" rel="noopener noreferrer nofollow" className="text-crimson hover:underline">RSS</a>}
          </div>
        </td>
        <td className="px-4 py-3 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-white/5 text-stone-muted whitespace-nowrap">{promotionInterestLabel(enquiry.package_interest)}</span>
          <p className="text-stone-subtle mt-1">{campaignTimingLabel(enquiry.campaign_timing)}</p>
        </td>
        <td className="px-4 py-3">
          <label className="sr-only" htmlFor={`status-${enquiry.id}`}>Status for {enquiry.podcast_name}</label>
          <select
            id={`status-${enquiry.id}`}
            value={status}
            disabled={saving}
            onChange={e => changeStatus(e.target.value as PromotionEnquiryStatus)}
            className={`text-xs px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${STATUS_COLOR[status]}`}
          >
            {PROMOTION_ENQUIRY_STATUSES.map(s => <option key={s} value={s} className="bg-ink-800 text-stone">{s}</option>)}
          </select>
        </td>
        <td className="px-4 py-3">
          <button onClick={() => setOpen(o => !o)} className="text-xs text-stone-muted hover:text-stone" aria-expanded={open}>
            {open ? 'Hide' : 'Details'}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-white/[0.015]">
          <td colSpan={6} className="px-4 py-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-stone-subtle text-2xs uppercase tracking-wider mb-1.5">Message</p>
                <p className="text-stone-muted text-sm whitespace-pre-wrap">{enquiry.message || '—'}</p>
                <p className="text-stone-subtle text-xs mt-3">Newsletter opt-in: {enquiry.newsletter_opt_in ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label htmlFor={`notes-${enquiry.id}`} className="text-stone-subtle text-2xs uppercase tracking-wider mb-1.5 block">Admin notes (private)</label>
                <textarea
                  id={`notes-${enquiry.id}`}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  className="input-base text-sm"
                />
                <button
                  onClick={() => save({ admin_notes: notes })}
                  disabled={saving || notes === savedNotes}
                  className="btn-outline mt-2 py-1.5 px-3 text-xs"
                >
                  Save notes
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
