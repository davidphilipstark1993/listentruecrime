import Link from 'next/link'
import Image from 'next/image'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'

const FOOTER_LINKS = {
  discover: [
    { href: '/browse', label: 'Browse All Podcasts' },
    { href: '/best-true-crime-podcasts', label: 'Best Podcasts 2025' },
    { href: '/best/murder-mystery', label: 'Best Murder Podcasts' },
    { href: '/best/serial-killer', label: 'Best Serial Killer Podcasts' },
    { href: '/best/cold-case', label: 'Best Cold Case Podcasts' },
    { href: '/best/binge-worthy', label: 'Most Binge-Worthy' },
    { href: '/best/beginners', label: 'Best for Beginners' },
  ],
  categories: [
    { href: '/category/cold-cases', label: 'Cold Cases' },
    { href: '/category/missing-persons', label: 'Missing Persons' },
    { href: '/category/investigative', label: 'Investigative' },
    { href: '/category/courtroom', label: 'Courtroom' },
    { href: '/category/fraud-scams', label: 'Fraud & Scams' },
    { href: '/category/binge-worthy', label: 'Binge-Worthy' },
  ],
  regions: [
    { href: '/country/US', label: 'US True Crime' },
    { href: '/country/UK', label: 'UK True Crime' },
    { href: '/country/AU', label: 'Australian True Crime' },
    { href: '/country/CA', label: 'Canadian True Crime' },
  ],
  site: [
    { href: '/about', label: 'About' },
    { href: '/newsletter', label: 'Newsletter' },
    { href: '/rss.xml', label: 'RSS Feed' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-ink-950 mt-24">
      {/* Newsletter bar */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-xl">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">Newsletter</p>
            <h3 className="heading-section text-xl mb-1">Your weekly true crime briefing</h3>
            <p className="text-stone-muted text-sm mb-5">
              New podcast reviews, community picks, and hidden gems. No filler.
            </p>
            <NewsletterForm source="footer" />
          </div>
        </div>
      </div>

      {/* Links grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Image src="/logo.png" alt="ListenTrueCrime" width={24} height={24} className="object-contain" />
              <span className="font-serif text-stone font-medium text-sm">ListenTrueCrime</span>
            </Link>
            <p className="text-stone-subtle text-xs leading-relaxed mb-3">
              The best place to discover, rate, and discuss true crime podcasts.
            </p>
            <Link href="/rss.xml" className="text-stone-subtle hover:text-stone text-xs transition-colors">
              RSS Feed ↗
            </Link>
          </div>

          <div>
            <p className="text-stone text-xs font-semibold uppercase tracking-widest mb-4">Discover</p>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.discover.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-stone-subtle hover:text-stone text-xs transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-stone text-xs font-semibold uppercase tracking-widest mb-4">Categories</p>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.categories.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-stone-subtle hover:text-stone text-xs transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-stone text-xs font-semibold uppercase tracking-widest mb-4">By Region</p>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.regions.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-stone-subtle hover:text-stone text-xs transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-stone text-xs font-semibold uppercase tracking-widest mb-4">Site</p>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.site.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-stone-subtle hover:text-stone text-xs transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-stone-subtle text-xs">
            © {new Date().getFullYear()} ListenTrueCrime. All rights reserved.
          </p>
          <p className="text-stone-subtle text-xs">
            Helping you find your next obsession, one episode at a time.
          </p>
        </div>
      </div>
    </footer>
  )
}
