import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createAdminClient } from '@/lib/supabase/admin'
import { scoreColor } from '@/lib/utils'
import { DiscoveryActions } from '@/components/admin/discovery-actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DiscoveryDetailPage({ params }: Props) {
  const { id } = await params
  const admin = createAdminClient()
  const { data: discovery } = await admin.from('podcast_discoveries').select('*').eq('id', id).single()

  if (!discovery) notFound()

  const sources: { url: string; note: string }[] = discovery.sources ?? []
  const hosts: { name: string; verified: boolean }[] = discovery.hosts ?? []

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/admin/discoveries" className="text-xs text-stone-muted hover:text-stone transition-colors mb-4 inline-block">
        ← Back to discoveries
      </Link>

      <div className="flex items-start gap-4 mb-6">
        {discovery.artwork_url && (
          <Image
            src={discovery.artwork_url}
            alt={discovery.podcast_name}
            width={72}
            height={72}
            className="rounded-lg shrink-0"
            unoptimized
          />
        )}
        <div>
          <h1 className="heading-display text-2xl mb-1">{discovery.podcast_name}</h1>
          <p className={`text-sm font-medium ${scoreColor(discovery.score)}`}>
            {discovery.score != null ? `${discovery.score}/10 — internal editorial ranking` : 'Not yet scored'}
          </p>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <h2 className="text-stone text-sm font-semibold mb-2">Hosts</h2>
        {hosts.length ? (
          <ul className="text-stone-muted text-sm space-y-1">
            {hosts.map(h => (
              <li key={h.name}>{h.name} {h.verified ? '' : '(unverified)'}</li>
            ))}
          </ul>
        ) : (
          <p className="text-stone-subtle text-sm">Could not be verified from available sources.</p>
        )}
      </div>

      <div className="card p-5 mb-4">
        <h2 className="text-stone text-sm font-semibold mb-2">Description</h2>
        <p className="text-stone-muted text-sm leading-relaxed">{discovery.description ?? 'Not available.'}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="card p-5">
          <h2 className="text-emerald-400 text-sm font-semibold mb-2">Pros</h2>
          <ul className="text-stone-muted text-sm space-y-1 list-disc list-inside">
            {(discovery.pros ?? []).map((p: string) => <li key={p}>{p}</li>)}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="text-crimson text-sm font-semibold mb-2">Cons</h2>
          <ul className="text-stone-muted text-sm space-y-1 list-disc list-inside">
            {(discovery.cons ?? []).map((c: string) => <li key={c}>{c}</li>)}
          </ul>
        </div>
      </div>

      {discovery.research_notes && (
        <div className="card p-5 mb-4">
          <h2 className="text-stone text-sm font-semibold mb-2">Research notes</h2>
          <p className="text-stone-subtle text-xs leading-relaxed">{discovery.research_notes}</p>
        </div>
      )}

      <div className="card p-5 mb-4">
        <h2 className="text-stone text-sm font-semibold mb-2">Links &amp; sources</h2>
        <div className="flex flex-wrap gap-3 text-xs mb-3">
          {discovery.apple_url && <a href={discovery.apple_url} target="_blank" className="text-crimson hover:underline">Apple Podcasts</a>}
          {discovery.spotify_url && <a href={discovery.spotify_url} target="_blank" className="text-crimson hover:underline">Spotify</a>}
          {discovery.website_url && <a href={discovery.website_url} target="_blank" className="text-crimson hover:underline">Website</a>}
          {discovery.rss_url && <a href={discovery.rss_url} target="_blank" className="text-crimson hover:underline">RSS feed</a>}
        </div>
        {sources.length > 0 && (
          <ul className="text-stone-subtle text-xs space-y-1">
            {sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" className="hover:text-stone transition-colors underline">{s.url}</a> — {s.note}
              </li>
            ))}
          </ul>
        )}
      </div>

      <DiscoveryActions discovery={{ id: discovery.id, status: discovery.status }} />
    </div>
  )
}
