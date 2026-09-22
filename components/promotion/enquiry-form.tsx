'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  CAMPAIGN_TIMING_OPTIONS,
  PROMOTION_INTEREST_OPTIONS,
  type PromotionInterest,
} from '@/lib/promotion/packages'
import { trackPromotion } from '@/components/promotion/analytics'

type FieldErrors = Partial<Record<string, string[]>>

interface EnquiryFormProps {
  initialInterest?: PromotionInterest
}

const labelClass = 'block text-stone text-sm font-medium mb-1.5'
const hintClass = 'text-stone-subtle text-xs mt-1.5'

export function PromotionEnquiryForm({ initialInterest }: EnquiryFormProps) {
  const [interest, setInterest] = useState<PromotionInterest | ''>(initialInterest ?? '')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const startedAt = useRef<number | null>(null)
  const startedTracked = useRef(false)
  // Until hydrated, a click would fall back to a native form submit — keep
  // the button disabled so form contents can never end up in a URL.
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const onFirstInteraction = () => {
    if (startedAt.current === null) startedAt.current = Date.now()
    if (!startedTracked.current) {
      startedTracked.current = true
      trackPromotion('promotion_enquiry_started', interest ? { package: interest } : {})
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    const form = new FormData(e.currentTarget)
    const get = (k: string) => String(form.get(k) ?? '').trim()

    const clientErrors: FieldErrors = {}
    if (!get('name')) clientErrors.name = ['Enter your name']
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('email'))) clientErrors.email = ['Enter a valid email address']
    if (!get('podcast_name')) clientErrors.podcast_name = ['Enter your podcast name']
    if (!interest) clientErrors.package_interest = ['Choose what you are interested in']
    if (form.get('consent') !== 'on') clientErrors.consent = ['Please confirm we can use these details to reply']
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      document.getElementById(`enquiry-${Object.keys(clientErrors)[0]}`)?.focus()
      return
    }

    setLoading(true)
    setErrors({})
    const newsletterOptIn = form.get('newsletter_opt_in') === 'on'
    const email = get('email')

    try {
      const res = await fetch('/api/promotion-enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: get('name'),
          email,
          podcast_name: get('podcast_name'),
          podcast_website: get('podcast_website'),
          rss_feed: get('rss_feed'),
          package_interest: interest,
          campaign_timing: get('campaign_timing') || null,
          message: get('message'),
          newsletter_opt_in: newsletterOptIn,
          consent: true,
          website_url_confirm: get('website_url_confirm'),
          started_at: startedAt.current ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors)
        throw new Error(data.error ?? 'Something went wrong')
      }

      // Newsletter sign-up only on explicit opt-in, via the site's existing
      // subscribe endpoint. A failure here must not undo the enquiry.
      if (newsletterOptIn) {
        fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, first_name: get('name').split(/\s+/)[0], source: 'promote_enquiry', consent: true }),
        }).catch(() => {})
      }

      trackPromotion('promotion_enquiry_submitted', { package: interest })
      setDone(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    const isFreeListing = interest === 'free_listing'
    return (
      <div className="card p-8 text-center" role="status">
        <div className="w-12 h-12 rounded-full bg-emerald-900/40 border border-emerald-800/40 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={20} className="text-emerald-400" aria-hidden="true" />
        </div>
        <h2 className="font-serif text-xl text-stone mb-2">
          {isFreeListing ? 'Thanks — we’ve received your podcast' : 'Thanks — we’ve received your enquiry'}
        </h2>
        <p className="text-stone-muted text-sm leading-relaxed max-w-md mx-auto mb-6">
          We’ve sent a confirmation to your inbox. {isFreeListing
            ? 'We review every submission ourselves and will be in touch if it’s a good fit for the database.'
            : 'We’ll reply personally, usually within a few working days.'}
        </p>
        <Link href="/promote-your-podcast" className="btn-outline">Back to Promote Your Podcast</Link>
      </div>
    )
  }

  const fieldError = (name: string) =>
    errors[name]?.[0] ? (
      <p id={`enquiry-${name}-error`} className="text-crimson text-xs mt-1.5">{errors[name]![0]}</p>
    ) : null
  const errorProps = (name: string) =>
    errors[name]?.[0] ? { 'aria-invalid': true, 'aria-describedby': `enquiry-${name}-error` } : {}

  return (
    <form method="post" onSubmit={handleSubmit} onFocus={onFirstInteraction} noValidate className="card relative p-6 sm:p-8 space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="enquiry-name" className={labelClass}>Your name</label>
          <input id="enquiry-name" name="name" type="text" autoComplete="name" maxLength={100} required className="input-base" {...errorProps('name')} />
          {fieldError('name')}
        </div>
        <div>
          <label htmlFor="enquiry-email" className={labelClass}>Email address</label>
          <input id="enquiry-email" name="email" type="email" autoComplete="email" maxLength={254} required className="input-base" {...errorProps('email')} />
          {fieldError('email')}
        </div>
      </div>

      <div>
        <label htmlFor="enquiry-podcast_name" className={labelClass}>Podcast name</label>
        <input id="enquiry-podcast_name" name="podcast_name" type="text" maxLength={200} required className="input-base" {...errorProps('podcast_name')} />
        {fieldError('podcast_name')}
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="enquiry-podcast_website" className={labelClass}>
            Podcast website <span className="text-stone-subtle font-normal">(optional)</span>
          </label>
          <input id="enquiry-podcast_website" name="podcast_website" type="url" inputMode="url" placeholder="https://" maxLength={500} className="input-base" {...errorProps('podcast_website')} />
          {fieldError('podcast_website')}
        </div>
        <div>
          <label htmlFor="enquiry-rss_feed" className={labelClass}>
            RSS feed <span className="text-stone-subtle font-normal">(optional)</span>
          </label>
          <input id="enquiry-rss_feed" name="rss_feed" type="url" inputMode="url" placeholder="https://" maxLength={500} className="input-base" {...errorProps('rss_feed')} />
          {fieldError('rss_feed')}
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>What are you interested in?</legend>
        <div className="grid sm:grid-cols-2 gap-2.5" {...errorProps('package_interest')}>
          {PROMOTION_INTEREST_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm cursor-pointer transition-colors',
                interest === opt.value
                  ? 'border-crimson/50 bg-crimson/10 text-stone'
                  : 'border-white/10 bg-ink-800 text-stone-muted hover:border-white/20'
              )}
            >
              <input
                type="radio"
                name="package_interest"
                value={opt.value}
                checked={interest === opt.value}
                onChange={() => {
                  setInterest(opt.value)
                  trackPromotion('promotion_package_selected', { package: opt.value })
                }}
                id={opt.value === PROMOTION_INTEREST_OPTIONS[0].value ? 'enquiry-package_interest' : undefined}
                className="accent-crimson"
              />
              {opt.label}
            </label>
          ))}
        </div>
        {fieldError('package_interest')}
      </fieldset>

      <div>
        <label htmlFor="enquiry-campaign_timing" className={labelClass}>
          Approximate timing <span className="text-stone-subtle font-normal">(optional)</span>
        </label>
        <select id="enquiry-campaign_timing" name="campaign_timing" defaultValue="" className="input-base">
          <option value="">Select…</option>
          {CAMPAIGN_TIMING_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="enquiry-message" className={labelClass}>
          Message <span className="text-stone-subtle font-normal">(optional)</span>
        </label>
        <textarea id="enquiry-message" name="message" rows={5} maxLength={3000} className="input-base resize-y" {...errorProps('message')} />
        <p className={hintClass}>Anything useful — what the podcast covers, when it launched, or what you’d like to achieve.</p>
        {fieldError('message')}
      </div>

      {/* Honeypot — hidden from people and assistive tech; bots tend to fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor="enquiry-website_url_confirm">Leave this field empty</label>
        <input id="enquiry-website_url_confirm" name="website_url_confirm" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-3 pt-1">
        <label className="flex items-start gap-3 text-sm text-stone-muted cursor-pointer">
          <input id="enquiry-consent" name="consent" type="checkbox" className="mt-0.5 accent-crimson" {...errorProps('consent')} />
          <span>
            I agree that ListenTrueCrime can use these details to respond to my enquiry, as described in the{' '}
            <Link href="/privacy" className="text-crimson hover:underline">Privacy Policy</Link>.
          </span>
        </label>
        {fieldError('consent')}
        <label className="flex items-start gap-3 text-sm text-stone-muted cursor-pointer">
          <input id="enquiry-newsletter_opt_in" name="newsletter_opt_in" type="checkbox" className="mt-0.5 accent-crimson" />
          <span>
            Also send me the weekly ListenTrueCrime newsletter <span className="text-stone-subtle">(optional — unsubscribe any time)</span>.
          </span>
        </label>
      </div>

      <div className="pt-2">
        <button type="submit" disabled={loading || !hydrated} className="btn-primary px-6 py-3 w-full sm:w-auto justify-center">
          {loading ? 'Sending…' : interest === 'free_listing' ? 'Submit Your Podcast' : 'Send Enquiry'}
        </button>
        <p className={hintClass}>
          By submitting, you accept our <Link href="/terms" className="underline hover:text-stone">Terms of Use</Link>.
          Unless you opt in to the newsletter, we’ll only use your details to deal with this enquiry. Submitting doesn’t commit you to anything.
        </p>
      </div>
    </form>
  )
}
