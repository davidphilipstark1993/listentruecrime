'use client'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Mail } from 'lucide-react'
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
