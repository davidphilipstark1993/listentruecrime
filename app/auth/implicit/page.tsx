'use client'
import { useEffect } from 'react'

export default function ImplicitCallbackPage() {
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const next = new URLSearchParams(window.location.search).get('next') ?? '/admin'

    if (access_token && refresh_token) {
      window.location.replace(
        `/api/auth/set-session?access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}&next=${encodeURIComponent(next)}`
      )
    } else {
      window.location.replace('/auth/error')
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-stone-muted text-sm">Signing in…</p>
    </div>
  )
}
