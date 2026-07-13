import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Plus, Pencil, Eye, EyeOff } from 'lucide-react'

async function getPodcasts() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('podcasts')
    .select('id, title, slug, is_published, binge_factor, country, created_at')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function AdminPodcastsPage() {
  const podcasts = await getPodcasts()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl mb-1">Podcasts</h1>
          <p className="text-stone-subtle text-sm">{podcasts.length} in database</p>
        </div>
        <Link href="/admin/podcasts/new" className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add podcast
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Title</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden sm:table-cell">Slug</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium hidden md:table-cell">Country</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Binge</th>
              <th className="text-left px-4 py-3 text-stone-subtle text-xs font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {podcasts.map((p: any) => (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3 text-stone font-medium">{p.title}</td>
                <td className="px-4 py-3 text-stone-subtle text-xs hidden sm:table-cell">{p.slug}</td>
                <td className="px-4 py-3 text-stone-subtle text-xs hidden md:table-cell">{p.country ?? '—'}</td>
                <td className="px-4 py-3 text-stone-subtle text-xs">{p.binge_factor ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${p.is_published ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-stone-subtle'}`}>
                    {p.is_published ? <Eye size={10} /> : <EyeOff size={10} />}
                    {p.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/podcasts/${p.slug}`} target="_blank" className="text-xs text-stone-subtle hover:text-stone transition-colors">
                      View
                    </Link>
                    <Link href={`/admin/podcasts/${p.id}`} className="text-xs text-stone-muted hover:text-stone transition-colors flex items-center gap-1">
                      <Pencil size={11} /> Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
