'use client'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Menu, X, User, Megaphone, Mail, ArrowRight } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import { trackPromotion } from '@/components/promotion/analytics'
import { BasketLink } from '@/components/shop/basket-link'
import { CATEGORIES } from '@/lib/types/database'
import { getSupabase } from '@/lib/supabase/lazy-client'

// The shop is hidden everywhere until NEXT_PUBLIC_SHOP_ENABLED=true (see lib/shop/config.ts).
const SHOP_ENABLED = process.env.NEXT_PUBLIC_SHOP_ENABLED === 'true'

const NAV_LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: '/best-true-crime-podcasts', label: 'Best Podcasts' },
  { href: '/cases', label: 'Cases' },
  { href: '/blog', label: 'Blog' },
  { href: '/true-crime-documentaries', label: 'Documentaries' },
  { href: '/category/cold-cases', label: 'Cold Cases' },
  { href: '/about', label: 'About' },
  ...(SHOP_ENABLED ? [{ href: '/shop', label: 'Shop' }] : []),
]

// The mobile menu has room to be more explicit than the desktop bar: it
// names every discovery route (podcasts, categories, guides, cases,
// newsletter) so a visitor landing from search can get anywhere in one tap.
const MOBILE_LINKS = [
  { href: '/browse', label: 'Browse all podcasts' },
  { href: '/best-true-crime-podcasts', label: 'Best true crime podcasts' },
  { href: '/new-true-crime-podcasts', label: 'New podcasts' },
  { href: '/cases', label: 'Cases' },
  { href: '/blog', label: 'Guides & blog' },
  { href: '/about', label: 'About' },
  ...(SHOP_ENABLED ? [{ href: '/shop', label: 'Shop' }] : []),
]

// Supabase's browser client is only needed to learn whether someone is signed
// in, and the auth modal / account menu only when they're used — so none of it
// ships in the header's first-load bundle on every page. It loads right after
// hydration instead, off the critical path for LCP/INP.
const AuthModal = dynamic(() => import('@/components/auth/auth-modal').then(m => m.AuthModal), { ssr: false })
const UserMenu = dynamic(() => import('@/components/auth/user-menu').then(m => m.UserMenu), {
  ssr: false,
  loading: () => <span className="block w-11 h-11" aria-hidden="true" />,
})

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const pathname = usePathname()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    let unsubscribe = () => {}
    getSupabase().then(supabase => {
      if (cancelled) return
      supabase.auth.getUser().then(({ data: { user } }) => { if (!cancelled) setUser(user) })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
        setUser(session?.user ?? null)
      })
      unsubscribe = () => subscription.unsubscribe()
    })
    return () => { cancelled = true; unsubscribe() }
  }, [])

  // Mount the auth modal on first use only, then keep it for its close animation.
  const [authMounted, setAuthMounted] = useState(false)
  useEffect(() => { if (authOpen) setAuthMounted(true) }, [authOpen])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const closeMenu = useCallback((restoreFocus = false) => {
    setMenuOpen(false)
    if (restoreFocus) toggleRef.current?.focus()
  }, [])

  // Any navigation (link tap, search submit, back button) closes the menu.
  useEffect(() => { setMenuOpen(false) }, [pathname])

  // While the menu is open: lock page scroll behind it, close on Escape,
  // keep Tab inside the toggle + menu, and close if the viewport grows to
  // the desktop layout (where the menu doesn't exist).
  useEffect(() => {
    if (!menuOpen) return
    const root = document.documentElement
    const prevOverflow = root.style.overflow
    root.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return }
      if (e.key !== 'Tab' || !menuRef.current || !toggleRef.current) return
      const items = [toggleRef.current, ...Array.from(menuRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))]
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    const mq = window.matchMedia('(min-width: 1024px)')
    const onMq = () => { if (mq.matches) setMenuOpen(false) }

    document.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      root.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [menuOpen, closeMenu])

  const iconButton = 'flex items-center justify-center w-11 h-11 text-stone-muted hover:text-stone hover:bg-ink-700 rounded-md transition-colors'

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-colors duration-300',
          // No backdrop-filter while the menu is open: it would make the header
          // the containing block for the fixed menu sheet and collapse it.
          menuOpen
            ? 'bg-ink-950 border-b border-white/[0.06]'
            : scrolled
              ? 'bg-ink-950/95 backdrop-blur-md border-b border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.04)]'
              : 'bg-transparent border-b border-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0 group" aria-label="ListenTrueCrime home">
              <Image
                src="/logo.png"
                alt="ListenTrueCrime"
                width={160}
                height={160}
                className="h-12 lg:h-14 w-auto object-contain"
                priority
              />
            </Link>

            {/* Desktop nav — from lg up; below that the links don't fit beside the actions */}
            <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-md hover:bg-ink-700 transition-colors duration-150',
                    pathname === link.href ? 'text-stone' : 'text-stone-muted hover:text-stone'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/promote-your-podcast"
                onClick={() => trackPromotion('promote_cta_click', { location: 'header' })}
                className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm text-white bg-crimson rounded-lg hover:bg-crimson-hover transition-colors duration-150"
              >
                <Megaphone size={14} aria-hidden="true" />
                <span className="xl:hidden">Promote</span>
                <span className="hidden xl:inline">Promote Your Podcast</span>
              </Link>
              <Link href="/browse" className={iconButton} aria-label="Search podcasts">
                <Search size={20} aria-hidden="true" />
              </Link>
              {SHOP_ENABLED && <BasketLink />}

              {user ? (
                <UserMenu user={user} />
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 h-11 lg:h-auto lg:py-1.5 text-sm text-stone-muted border border-white/10 rounded-lg hover:bg-ink-700 hover:text-stone hover:border-white/20 transition-all duration-150"
                >
                  <User size={14} aria-hidden="true" />
                  Sign in
                </button>
              )}

              {/* Mobile / tablet menu toggle */}
              <button
                ref={toggleRef}
                className={cn(iconButton, 'lg:hidden -mr-2')}
                onClick={() => setMenuOpen(o => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
              >
                {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu — full-height sheet under the header; the page behind is scroll-locked */}
        {menuOpen && (
          <div
            id="mobile-menu"
            ref={menuRef}
            className="lg:hidden fixed inset-x-0 top-16 bottom-0 overflow-y-auto overscroll-contain bg-ink-950 border-t border-white/[0.06] animate-fade-in"
          >
            <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
              {/* Search straight from the menu — submits to /browse?q= */}
              <form action="/browse" method="get" role="search" className="relative mb-4">
                <label htmlFor="menu-search" className="sr-only">Search podcasts</label>
                <Search size={18} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-subtle pointer-events-none" />
                <input
                  id="menu-search"
                  name="q"
                  type="search"
                  enterKeyHint="search"
                  autoComplete="off"
                  placeholder="Search podcasts, cases, hosts…"
                  className="input-base pl-11 h-12"
                />
              </form>

              <nav aria-label="Main">
                <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                  {MOBILE_LINKS.map(link => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => closeMenu()}
                        aria-current={pathname === link.href ? 'page' : undefined}
                        className={cn(
                          'flex items-center justify-between min-h-[52px] px-1 text-base transition-colors',
                          pathname === link.href ? 'text-stone font-medium' : 'text-stone-muted hover:text-stone'
                        )}
                      >
                        {link.label}
                        <ArrowRight size={16} aria-hidden="true" className="text-stone-faint" />
                      </Link>
                    </li>
                  ))}
                </ul>

                <p className="mt-6 mb-2 text-2xs text-crimson font-semibold uppercase tracking-widest">Categories</p>
                <ul className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <li key={cat.slug}>
                      <Link
                        href={`/category/${cat.slug}`}
                        onClick={() => closeMenu()}
                        className="flex items-center gap-2 min-h-[44px] px-3 rounded-lg bg-ink-800 border border-white/[0.06] text-sm text-stone-muted hover:text-stone hover:border-white/[0.12] transition-colors"
                      >
                        <span aria-hidden="true">{cat.emoji}</span>
                        <span className="truncate">{cat.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="mt-6 grid gap-2">
                <Link
                  href="/subscribe"
                  onClick={() => closeMenu()}
                  className="flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-lg border border-crimson/30 bg-crimson/10 text-sm font-medium text-stone hover:bg-crimson/20 transition-colors"
                >
                  <Mail size={16} aria-hidden="true" />
                  Get the free weekly newsletter
                </Link>
                <Link
                  href="/promote-your-podcast"
                  onClick={() => { closeMenu(); trackPromotion('promote_cta_click', { location: 'mobile_menu' }) }}
                  className="flex items-center justify-center gap-2 min-h-[48px] px-4 text-sm font-medium text-white bg-crimson rounded-lg hover:bg-crimson-hover transition-colors"
                >
                  <Megaphone size={16} aria-hidden="true" />
                  Promote Your Podcast
                </Link>
                {!user && (
                  <button
                    onClick={() => { closeMenu(); setAuthOpen(true) }}
                    className="flex items-center justify-center gap-2 min-h-[48px] px-4 text-sm text-stone-muted border border-white/10 rounded-lg hover:text-stone hover:bg-ink-700 transition-colors"
                  >
                    <User size={16} aria-hidden="true" />
                    Sign in
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {(authOpen || authMounted) && <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />}
    </>
  )
}
