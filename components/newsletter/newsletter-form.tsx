'use client'
import { useEffect, useState, useId } from 'react'
import Link from 'next/link'
import { Mail, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface NewsletterFormProps {
  source?: string
  variant?: 'default' | 'hero' | 'minimal'
  showFirstName?: boolean
  className?: string
  /** Overrides the submit button text (default "Subscribe"). */
  buttonLabel?: string
  /** Show the optional "Referred by someone?" field. It also appears by itself when the page URL has ?ref=CODE. */
  showReferral?: boolean
}

/** Referral codes are 6 letters/digits; tolerate spaces, dashes and lower case when typed or pasted. */
const cleanReferral = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)

export function NewsletterForm({ source = 'unknown', variant = 'default', showFirstName = false, className, buttonLabel = 'Subscribe', showReferral = false }: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  // Shown inline (and announced) as well as in the toast: a toast in the
  // corner is easy to miss on a phone, especially with the keyboard open.
  const [error, setError] = useState<string | null>(null)
  const uid = useId()
  const errorId = `${uid}-error`
  const emailId = `${uid}-email`
  const nameId = `${uid}-name`
  const refId = `${uid}-ref`
  const [referral, setReferral] = useState('')
  const [refVisible, setRefVisible] = useState(showReferral)
  const [refState, setRefState] = useState<'idle' | 'valid' | 'unknown'>('idle')

  // A shared link (/subscribe?ref=CODE) fills the field in for them.
  useEffect(() => {
    const fromUrl = cleanReferral(new URLSearchParams(window.location.search).get('ref') ?? '')
    if (fromUrl) { setReferral(fromUrl); setRefVisible(true) }
  }, [])

  // Tell them if the code is recognised. Never blocks signing up: a wrong code is simply ignored.
  useEffect(() => {
    if (referral.length !== 6) { setRefState('idle'); return }
    const ctrl = new AbortController()
    fetch(`/api/referrals/validate?code=${encodeURIComponent(referral)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setRefState(d.valid ? 'valid' : 'unknown'))
      .catch(() => {})
    return () => ctrl.abort()
  }, [referral])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, first_name: firstName || undefined, source, consent: true, ref: referral || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(true)
      toast.success('Check your inbox to confirm!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const referralField = refVisible && (
    <div className="mt-3">
      <label htmlFor={refId} className="block text-xs text-stone-muted mb-1">Referred by someone? Enter their code <span className="text-stone-subtle">(optional)</span></label>
      <input
        id={refId}
        type="text"
        value={referral}
        onChange={e => setReferral(cleanReferral(e.target.value))}
        placeholder="e.g. K7M2QX"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-describedby={refState === 'idle' ? undefined : `${refId}-status`}
        className="input-base w-40 font-mono text-sm uppercase tracking-wider"
      />
      {refState !== 'idle' && (
        <p id={`${refId}-status`} aria-live="polite" className={cn('mt-1 text-xs', refState === 'valid' ? 'text-emerald-400' : 'text-stone-subtle')}>
          {refState === 'valid' ? 'Code recognised. Thanks for joining via a friend.' : "We don't recognise that code, but you can still subscribe."}
        </p>
      )}
    </div>
  )

  const errorNote = error && (
    <p id={errorId} role="alert" className="mt-2 text-xs text-red-400">{error}</p>
  )

  // Shared props for every email field: email keyboard on phones, no
  // auto-capitalisation/correction, and the error wired up for screen readers.
  const emailProps = {
    id: emailId,
    type: 'email' as const,
    inputMode: 'email' as const,
    enterKeyHint: 'send' as const,
    autoCapitalize: 'none',
    autoCorrect: 'off',
    spellCheck: false,
    value: email,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setEmail(e.target.value); if (error) setError(null) },
    placeholder: 'your@email.com',
    autoComplete: 'email',
    required: true,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  }

  const consentNote = (
    <p className="text-xs text-stone-subtle mt-2 leading-snug">
      By subscribing you agree to receive the weekly ListenTrueCrime newsletter. We will email you a link to confirm. See our{' '}
      <Link href="/privacy" className="underline hover:text-stone">Privacy Policy</Link>. Unsubscribe anytime.
    </p>
  )

  if (done) {
    return (
      <div role="status" className={cn('flex items-center gap-3 min-h-[44px] text-emerald-400 text-sm', className)}>
        <div className="w-5 h-5 shrink-0 rounded-full bg-emerald-400 flex items-center justify-center text-ink-950" aria-hidden="true">
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        Almost there: check your inbox and click the confirmation link.
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={className}>
        {/* Wraps instead of squeezing: on a narrow card the button drops below a full-width field */}
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
          <label htmlFor={emailId} className="sr-only">Email address</label>
          <input {...emailProps} className="input-base flex-1 min-w-[12rem]" />
          <button type="submit" disabled={loading} className="btn-primary px-4 text-sm grow sm:grow-0">
            {loading ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>
        {errorNote}
        <p className="text-xs text-stone-subtle mt-1.5">
          You can unsubscribe anytime. See our <Link href="/privacy" className="underline hover:text-stone">Privacy Policy</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        {showFirstName && (
          <>
            <label htmlFor={nameId} className="sr-only">First name (optional)</label>
            <input
              id={nameId}
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="First name (optional)"
              autoComplete="given-name"
              className="input-base sm:w-40 h-12 sm:h-auto"
            />
          </>
        )}
        <div className="relative flex-1">
          <label htmlFor={emailId} className="sr-only">Email address</label>
          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
          <input {...emailProps} className="input-base pl-9 h-12 sm:h-auto" />
        </div>
        <button
          type="submit"
          disabled={loading || !email}
          className={cn(
            'btn-primary shrink-0 h-12 sm:h-auto',
            variant === 'hero' && 'px-6'
          )}
        >
          {loading ? 'Subscribing…' : buttonLabel}
          {!loading && <ArrowRight size={14} />}
        </button>
      </form>
      {errorNote}
      {referralField}
      {consentNote}
    </div>
  )
}
