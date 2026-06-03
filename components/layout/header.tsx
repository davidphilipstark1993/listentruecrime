'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Search, Menu, X, BookMarked, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { AuthModal } from '@/components/auth/auth-modal'
import { UserMenu } from '@/components/auth/user-menu'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: '/best-true-crime-podcasts', label: 'Best Podcasts' },
  { href: '/category/cold-cases', label: 'Cold Cases' },
  { href: '/about', label: 'About' },
]

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-ink-950/95 backdrop-blur-md border-b border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.04)]'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/logo.png"
                alt="ListenTrueCrime"
                className="h-9 w-9 object-contain"
              />
              <span className="font-serif text-stone font-medium text-[15px] hidden sm:block">
                ListenTrueCrime
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-sm text-stone-muted hover:text-stone rounded-md hover:bg-ink-700 transition-colors duration-150"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Link href="/browse" className="p-2 text-stone-muted hover:text-stone hover:bg-ink-700 rounded-md transition-colors" aria-label="Search">
                <Search size={18} />
              </Link>

              {user ? (
                <UserMenu user={user} />
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-stone-muted border border-white/10 rounded-lg hover:bg-ink-700 hover:text-stone hover:border-white/20 transition-all duration-150"
                >
                  <User size={14} />
                  Sign in
                </button>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden p-2 text-stone-muted hover:text-stone hover:bg-ink-700 rounded-md transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-ink-950/98 backdrop-blur-md border-b border-white/[0.06] animate-fade-in">
            <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 text-sm text-stone-muted hover:text-stone rounded-md hover:bg-ink-700 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
                <button
                  onClick={() => { setMenuOpen(false); setAuthOpen(true) }}
                  className="mt-2 px-3 py-2.5 text-sm text-stone-muted text-left hover:text-stone rounded-md hover:bg-ink-700 transition-colors"
                >
                  Sign in
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
