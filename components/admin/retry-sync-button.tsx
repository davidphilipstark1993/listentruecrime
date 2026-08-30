'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export function RetrySyncButton({ unsyncedCount }: { unsyncedCount: number }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const retry = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/newsletter/retry-sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Retry failed')
      toast.success(`Synced ${data.synced} of ${data.attempted} subscribers`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={retry} disabled={loading} className="btn-outline text-sm flex items-center gap-1.5">
      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
      {loading ? 'Syncing…' : `Retry SendGrid sync (${unsyncedCount})`}
    </button>
  )
}
