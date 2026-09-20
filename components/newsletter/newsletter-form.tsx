'use client'
import { useState, useId } from 'react'
import Link from 'next/link'
import { Mail, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface NewsletterFormProps {
  source?: string
  variant?: 'default' | 'hero' | 'minimal'
  showFirstName?: boolean
  className?: string
}

export function NewsletterForm({ source = 'unknown', variant = 'default', showFirstName = false, className }: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const uid = useId()
  const emailId = `${uid}-email`
  const nameId = `${uid}-name`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, first_name: firstName || undefined, source, consent: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(true)
      toast.success('You\'re subscribed!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const consentNote = (
    <p className="text-2xs text-stone-subtle mt-2 leading-snug">
      By subscribing you agree to receive the weekly ListenTrueCrime newsletter. See our{' '}
      <Link href="/privacy" className="underline hover:text-stone">Privacy Policy</Link>. Unsubscribe anytime.
    </p>
  )

  if (done) {
    return (
      <div className={cn('flex items-center gap-3 text-emerald-400 text-sm', className)}>
        <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-ink-950">
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        You're in! Check your inbox.
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={className}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <label htmlFor={emailId} className="sr-only">Email address</label>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
            required
            className="input-base flex-1 text-sm py-2"
          />
          <button type="submit" disabled={loading} className="btn-primary py-2 px-4 text-sm">
            {loading ? '…' : 'Subscribe'}
          </button>
        </form>
        <p className="text-2xs text-stone-subtle mt-1.5">
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
              className="input-base sm:w-40"
            />
          </>
        )}
        <div className="relative flex-1">
          <label htmlFor={emailId} className="sr-only">Email address</label>
          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
            required
            className="input-base pl-9"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !email}
          className={cn(
            'btn-primary shrink-0',
            variant === 'hero' && 'px-6'
          )}
        >
          {loading ? 'Subscribing…' : 'Subscribe'}
          {!loading && <ArrowRight size={14} />}
        </button>
      </form>
      {consentNote}
    </div>
  )
}
