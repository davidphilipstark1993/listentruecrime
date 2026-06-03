import { createAdminClient } from '@/lib/supabase/admin'
import { Users } from 'lucide-react'

async function getUsers() {
  const admin = createAdminClient()
  // Get profiles (created automatically on signup)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, username, is_admin, created_at')
    .order('created_at', { ascending: false })
  return profiles ?? []
}

export default async function AdminUsersPage() {
  const users = await getUsers()

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl mb-1">Users</h1>
        <p className="text-stone-subtle text-sm">{users.length} {users.length === 1 ? 'account' : 'accounts'} registered</p>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-32">
          <Users size={36} className="mx-auto text-stone-subtle mb-4" />
          <p className="text-stone-muted text-sm">No users yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3 text-stone-subtle text-xs font-medium">Email</th>
                <th className="text-left px-5 py-3 text-stone-subtle text-xs font-medium hidden sm:table-cell">Username</th>
                <th className="text-left px-5 py-3 text-stone-subtle text-xs font-medium">Role</th>
                <th className="text-left px-5 py-3 text-stone-subtle text-xs font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-stone">{u.email ?? '—'}</td>
                  <td className="px-5 py-3 text-stone-subtle text-xs hidden sm:table-cell">
                    {u.username ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-2xs px-2 py-0.5 rounded-full ${
                      u.is_admin
                        ? 'bg-crimson/10 text-crimson'
                        : 'bg-white/5 text-stone-subtle'
                    }`}>
                      {u.is_admin ? 'Admin' : 'Member'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-stone-subtle text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
