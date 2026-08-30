import type { ReactNode } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Mic2, MessageSquare, Upload, ArrowLeft, Users, Star, Compass, Mail } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/podcasts', label: 'Podcasts', icon: Mic2 },
  { href: '/admin/discoveries', label: 'Discoveries', icon: Compass },
  { href: '/admin/newsletter-issues', label: 'Newsletter Issues', icon: Mail },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/admin/newsletter', label: 'Subscribers', icon: Users },
  { href: '/admin/ratings', label: 'Ratings', icon: Star },
  { href: '/admin/import', label: 'Import CSV', icon: Upload },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-ink-900 border-r border-white/[0.06] flex flex-col">
        <div className="p-5 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2 text-stone-muted hover:text-stone transition-colors text-xs mb-3">
            <ArrowLeft size={12} /> Back to site
          </Link>
          <p className="font-serif text-stone font-semibold">Admin</p>
          <p className="text-stone-subtle text-2xs">ListenTrueCrime</p>
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

      {/* Main */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
