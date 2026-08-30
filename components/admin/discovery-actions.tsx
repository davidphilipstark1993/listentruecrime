'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Props {
  discovery: { id: string; status: string }
}

export function DiscoveryActions({ discovery }: Props) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const reject = async () => {
    setLoading(true)
    const { error } = await supabase
      .from('podcast_discoveries')
      .update({ status: 'rejected', rejection_reason: reason || null })
      .eq('id', discovery.id)
    setLoading(false)

    if (error) {
      toast.error('Could not reject candidate')
      return
    }
    toast.success('Candidate rejected')
    router.push('/admin/discoveries')
    router.refresh()
  }

  if (discovery.status === 'rejected') {
    return <p className="text-stone-subtle text-sm">This candidate has been rejected.</p>
  }

  return (
    <div className="card p-5">
      <h2 className="text-stone text-sm font-semibold mb-2">Reject this candidate</h2>
      <p className="text-stone-subtle text-xs mb-3">
        To feature this podcast in an issue, use the Replace action from the relevant newsletter issue's review screen instead.
      </p>
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="Rejection reason (optional)"
        rows={2}
        className="input-base w-full mb-3 text-sm"
      />
      <button
        onClick={reject}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-crimson/10 text-crimson hover:bg-crimson/20 transition-colors"
      >
        <XCircle size={13} /> Reject
      </button>
    </div>
  )
}
