'use client'
import { useState } from 'react'
import { Link, Check, Twitter } from 'lucide-react'

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`

  return (
    <div className="flex items-center gap-2 mt-6">
      <span className="text-xs text-stone-subtle mr-1">Share:</span>
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-700 border border-white/[0.08] hover:border-white/[0.15] text-xs text-stone-muted hover:text-stone transition-all"
      >
        <Twitter className="w-3 h-3" />
        Tweet
      </a>
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink-700 border border-white/[0.08] hover:border-white/[0.15] text-xs text-stone-muted hover:text-stone transition-all"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Link className="w-3 h-3" />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  )
}
