'use client'
import { useState, useEffect, useRef, useId } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'ltc_exit_dismissed'
const ACTIVATE_DELAY_MS = 25000 // 25 seconds on page before trigger arms

export function ExitIntent() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const armed = useRef(false)
  const emailId = useId()
  // The /subscribe landing page is already one big signup form.
  const onSubscribePage = usePathname() === '/subscribe'

  useEffect(() => {
    if (onSubscribePage) return

    // Don't show if already dismissed
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
    } catch {}

    // Arm after delay — avoids firing on quick bounces
    const arm = setTimeout(() => {
      armed.current = true
    }, ACTIVATE_DELAY_MS)

    const handleMouseLeave = (e: MouseEvent) => {
      if (!armed.current) return
      if (e.clientY > 5) return // Only fire when leaving toward browser chrome
      try {
        if (localStorage.getItem(STORAGE_KEY)) return
      } catch {}
      setVisible(true)
      armed.current = false // fire once per page load
    }

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      clearTimeout(arm)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [onSubscribePage])

  const dismiss = () => {
    setVisible(false)
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'exit_intent', consent: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(true)
      toast.success('You\'re subscribed!')
      setTimeout(dismiss, 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
      role="dialog"
      aria-modal="true"
      aria-label="Before you go"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-ink-900 border border-white/[0.10] rounded-2xl p-8 shadow-2xl animate-fade-in">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-stone-subtle hover:text-stone transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {done ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-3">🎧</div>
            <p className="text-stone font-semibold text-lg mb-1">You're in!</p>
            <p className="text-stone-muted text-sm">Your weekly true crime briefing starts now.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="text-3xl mb-3">🎧</div>
              <h2 className="font-serif text-xl text-stone font-semibold mb-2">
                Before you go — get the best podcasts list
              </h2>
              <p className="text-stone-muted text-sm leading-relaxed">
                Join our newsletter and get our editors' top 10 true crime podcasts — with ratings,
                starter episodes, and weekly new reviews.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label htmlFor={emailId} className="sr-only">Email address</label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
                required
                autoFocus
                className="input-base w-full"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="btn-primary w-full justify-center"
              >
                {loading ? 'Subscribing…' : 'Get the free list'}
                {!loading && <ArrowRight size={14} />}
              </button>
            </form>

            <button
              onClick={dismiss}
              className="mt-4 w-full text-center text-stone-subtle text-xs hover:text-stone transition-colors"
            >
              No thanks, I'll find podcasts on my own
            </button>
            <p className="text-2xs text-stone-subtle mt-3 text-center leading-snug">
              By subscribing you agree to receive the weekly ListenTrueCrime newsletter. See our{' '}
              <Link href="/privacy" className="underline hover:text-stone">Privacy Policy</Link>. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
