import type { ReactNode } from 'react'
import Link from 'next/link'

const TABS = [
  { href: '/admin/shop', label: 'Overview' },
  { href: '/admin/shop/orders', label: 'Orders' },
  { href: '/admin/shop/products', label: 'Products' },
  { href: '/admin/shop/settings', label: 'Settings' },
]

// Auth: /admin/* is already gated by middleware.ts (signed in + profiles.is_admin).
export default function ShopAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="border-b border-white/[0.06] px-8 pt-6">
        <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-crimson">Shop Management</p>
        <nav className="flex gap-1">
          {TABS.map(t => (
            <Link key={t.href} href={t.href} className="rounded-t-md px-4 py-2 text-sm text-stone-muted transition-colors hover:bg-white/[0.04] hover:text-stone">{t.label}</Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  )
}
