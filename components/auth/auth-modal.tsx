'use client'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Mail, Chrome } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  message?: string
}

export function AuthModal({ open, onClose, message }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    }
  }

  const reset = () => { setSent(false); setEmail(''); setLoading(false) }

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) { onClose(); reset() } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm animate-slide-up">
          <div className="bg-ink-800 border border-white/10 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6">
            {/* Close */}
            <Dialog.Close className="absolute top-4 right-4 p-1.5 text-stone-subtle hover:text-stone hover:bg-ink-700 rounded-md transition-colors">
              <X size={16} />
            </Dialog.Close>

            {!sent ? (
              <>
                <div className="mb-6">
                  <Dialog.Title className="font-serif text-xl text-stone mb-1">
                    Join ListenTrueCrime
                  </Dialog.Title>
                  <Dialog.Description className="text-stone-muted text-sm">
                    {message ?? 'Sign in to rate podcasts, write reviews, and save favourites.'}
                  </Dialog.Description>
                </div>

                {/* Google */}
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="btn-outline w-full justify-center mb-4"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-stone-subtle text-xs">or</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                {/* Magic link */}
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="input-base"
                  />
                  <button type="submit" disabled={loading || !email} className="btn-primary w-full justify-center">
                    <Mail size={15} />
                    {loading ? 'Sending…' : 'Send magic link'}
                  </button>
                </form>

                <p className="mt-4 text-center text-xs text-stone-subtle">
                  No password needed. No spam.
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-900/40 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Mail size={20} className="text-emerald-400" />
                </div>
                <h3 className="font-serif text-lg text-stone mb-2">Check your email</h3>
                <p className="text-stone-muted text-sm mb-4">
                  We sent a magic link to <span className="text-stone">{email}</span>
                </p>
                <button onClick={reset} className="text-xs text-stone-subtle hover:text-stone transition-colors">
                  Use a different email
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
