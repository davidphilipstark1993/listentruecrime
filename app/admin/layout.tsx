import type { ReactNode } from 'react'
import Link from 'next/link'
import { Mail, Users, ArrowLeft } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Newsletter', icon: Mail },
  { href: '/admin/users', label: 'Users', icon: Users },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-ink-900 border-r border-white/[0.06] flex flex-col">
        <div className="p-5 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-1.5 text-stone-subtle hover:text-stone transition-colors text-xs mb-4">
            <ArrowLeft size={11} /> Back to site
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
            <p className="font-serif text-stone text-sm font-semibold">Admin</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-stone-muted hover:text-stone hover:bg-white/[0.05] transition-colors text-sm"
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 overflow-auto bg-ink-950">
        {children}
      </div>
    </div>
  )
}
