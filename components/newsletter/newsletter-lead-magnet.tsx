'use client'
import { useState, useId } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface NewsletterLeadMagnetProps {
  source?: string
  className?: string
  variant?: 'banner' | 'card' | 'inline'
}

export function NewsletterLeadMagnet({
  source = 'lead_magnet',
  className,
  variant = 'card',
}: NewsletterLeadMagnetProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const emailId = useId()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, consent: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(true)
      toast.success('Check your inbox!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={cn('flex items-center gap-3 p-5 rounded-xl bg-emerald-950/50 border border-emerald-800/40', className)}>
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Check size={18} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-emerald-400 font-medium text-sm">You're subscribed — check your inbox.</p>
          <p className="text-stone-subtle text-xs mt-0.5">Your weekly true crime briefing starts now.</p>
        </div>
      </div>
    )
  }

  if (variant === 'inline') {
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
          <button type="submit" disabled={loading} className="btn-primary py-2 px-4 text-sm shrink-0">
            {loading ? '…' : 'Get the list'}
          </button>
        </form>
        <p className="text-2xs text-stone-subtle mt-1.5">
          Plus our weekly newsletter. Unsubscribe anytime. See our <Link href="/privacy" className="underline hover:text-stone">Privacy Policy</Link>.
        </p>
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className={cn('relative overflow-hidden rounded-xl bg-ink-800 border border-white/[0.08] p-5', className)}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(190,18,60,0.08),transparent_60%)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-crimson/15 border border-crimson/20 flex items-center justify-center shrink-0">
              <Download size={16} className="text-crimson" />
            </div>
            <div>
              <p className="text-stone font-semibold text-sm">Free: The 10 Best True Crime Podcasts</p>
              <p className="text-stone-subtle text-xs">Our editors' definitive list with ratings and where to start.</p>
            </div>
          </div>
          <div className="sm:w-auto w-full">
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
                className="input-base flex-1 sm:w-48 text-sm py-2"
              />
              <button type="submit" disabled={loading} className="btn-primary py-2 px-3 text-sm shrink-0">
                {loading ? '…' : <><ArrowRight size={14} /></>}
              </button>
            </form>
            <p className="text-2xs text-stone-subtle mt-1.5">
              Plus our weekly newsletter. Unsubscribe anytime. See our <Link href="/privacy" className="underline hover:text-stone">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Default: card
  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.08] p-8', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-crimson/15 border border-crimson/20 flex items-center justify-center">
            <Download size={20} className="text-crimson" />
          </div>
          <div>
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest">Free guide</p>
            <p className="text-stone font-semibold text-sm leading-tight">The 10 Best True Crime Podcasts</p>
          </div>
        </div>

        <p className="text-stone-muted text-sm leading-relaxed mb-2">
          Our editors' definitive list — with ratings, who each podcast is for, and the best episode to start with.
          Sent to your inbox instantly.
        </p>

        <ul className="space-y-1.5 mb-5">
          {[
            'Top 10 ranked by storytelling, research & binge factor',
            'Best episode to start with for each show',
            'Who each podcast is best suited for',
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-stone-muted text-xs">
              <Check size={12} className="text-crimson mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor={emailId} className="sr-only">Email address</label>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
            required
            className="input-base flex-1"
          />
          <button type="submit" disabled={loading || !email} className="btn-primary shrink-0">
            {loading ? 'Sending…' : 'Get the free list'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        <p className="text-stone-faint text-xs mt-3">
          + weekly new podcast reviews. Unsubscribe any time. See our{' '}
          <Link href="/privacy" className="underline hover:text-stone">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}
