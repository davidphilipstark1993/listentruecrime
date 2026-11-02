'use client'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/** The subscriber's personal share link, with a copy button. The link holds only their own code. */
export function ReferralShare({ link, rewards }: { link: string; rewards: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: select the text so they can copy it by hand.
      document.getElementById('referral-link')?.focus()
    }
  }

  return (
    <div className="card p-5 text-left max-w-md mx-auto mb-8">
      <h2 className="font-serif text-lg text-stone mb-1">Share the newsletter, earn merch discounts</h2>
      <p className="text-sm text-stone-muted mb-3">
        When a friend confirms their subscription using your link you earn a shop discount: {rewards} merch.
      </p>
      <div className="flex gap-2">
        <label htmlFor="referral-link" className="sr-only">Your referral link</label>
        <input id="referral-link" readOnly value={link} onFocus={e => e.currentTarget.select()} className="input-base flex-1 text-xs" />
        <button type="button" onClick={copy} className="btn-outline px-3 text-sm shrink-0" aria-live="polite">
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>
    </div>
  )
}
