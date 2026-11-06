'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import type { AdStatus } from '@/lib/ads/schedule'

export function AdRowActions({ id, title, status, isActive }: { id: string; title: string; status: AdStatus; isActive: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function call(method: 'PATCH' | 'DELETE', body?: object, success?: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return toast.error(json.error ?? 'Something went wrong')
      if (success) toast.success(success)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const archived = status === 'archived'
  const link = 'text-xs text-stone-muted hover:text-stone disabled:opacity-40'
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Link href={`/admin/ads/${id}`} className={link}>Edit</Link>
      {!archived && (
        <button disabled={busy} className={link} onClick={() => call('PATCH', { is_active: !isActive }, isActive ? 'Advert paused' : 'Advert activated')}>
          {isActive ? 'Pause' : 'Activate'}
        </button>
      )}
      <button disabled={busy} className={link} onClick={() => call('PATCH', { archived: !archived }, archived ? 'Advert restored (inactive)' : 'Advert archived')}>
        {archived ? 'Restore' : 'Archive'}
      </button>
      <button
        disabled={busy}
        className="text-xs text-crimson/80 hover:text-crimson disabled:opacity-40"
        onClick={() => {
          if (window.confirm(`Permanently delete "${title}"?\n\nThis also deletes its image and all of its statistics. Archive it instead to keep the history.`)) {
            call('DELETE', undefined, 'Advert deleted')
          }
        }}
      >
        Delete
      </button>
    </div>
  )
}
