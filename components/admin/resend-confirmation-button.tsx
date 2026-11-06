'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import toast from 'react-hot-toast'

export function ResendConfirmationButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const resend = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/newsletter/subscribers/${id}/resend`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Resend failed')
      toast.success('Confirmation email sent')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resend failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={resend} disabled={loading} className="text-xs text-sky-400 hover:text-sky-300 disabled:opacity-50 inline-flex items-center gap-1 mr-3">
      <Send size={11} />
      {loading ? 'Sending…' : 'Resend confirmation'}
    </button>
  )
}
