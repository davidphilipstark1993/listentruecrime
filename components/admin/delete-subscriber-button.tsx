'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function DeleteSubscriberButton({ id, email }: { id: string; email: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const remove = async () => {
    if (!confirm(`Delete ${email} from the subscriber list? This can't be undone.`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/newsletter/subscribers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      toast.success(`Deleted ${email}`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={remove}
      disabled={loading}
      aria-label={`Delete ${email}`}
      title="Delete subscriber"
      className="p-1.5 rounded-md text-stone-subtle hover:text-crimson hover:bg-crimson-faint transition-colors disabled:opacity-50"
    >
      <Trash2 size={14} />
    </button>
  )
}
