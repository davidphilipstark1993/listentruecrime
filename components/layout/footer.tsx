import Link from 'next/link'
import Image from 'next/image'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'

const FOOTER_LINKS = {
  discover: [
    { href: '/browse', label: 'Browse All Podcasts' },
    { href: '/best-true-crime-podcasts', label: 'Best Podcasts' },
    { href: '/category/cold-cases', label: 'Cold Case Podcasts' },
    { href: '/category/missing-persons', label: 'Missing Persons Podcasts' },
    { href: '/category/investigative', label: 'Investigative Podcasts' },
    { href: '/category/binge-worthy', label: 'Binge-worthy Podcasts' },
    { href: '/category/fraud-scams', label: 'Fraud & Scam Podcasts' },
    { href: '/category/courtroom', label: 'Courtroom Podcasts' },
  ],
  regions: [
    { href: '/country/US', label: 'American True Crime' },
    { href: '/country/UK', label: 'UK True Crime' },
    { href: '/country/AU', label: 'Australian True Crime' },
    { href: '/country/CA', label: 'Canadian True Crime' },
    { href: '/platform/Spotify', label: 'True Crime on Spotify' },
    { href: '/platform/Apple%20Podcasts', label: 'True Crime on Apple Podcasts' },
    { href: '/platform/Audible', label: 'True Crime on Audible' },
  ],
  site: [
    { href: '/about', label: 'About' },
    { href: '/how-we-review', label: 'How We Review' },
    { href: '/blog', label: 'Blog' },
    { href: '/cases', label: 'Cases' },
    { href: '/browse', label: 'Browse' },
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3">
              <Link href="/">
                <Image src="/logo.png" alt="ListenTrueCrime" width={100} height={100} className="h-10 w-auto object-contain" />
              </Link>
            </div>
            <p className="text-stone-subtle text-xs leading-relaxed mb-4">
              The best place to discover, rate, and discuss true crime podcasts. Expert reviews and community ratings.
            </p>
            <div className="space-y-1.5">
              {FOOTER_LINKS.site.map(link => (
                <Link key={link.href} href={link.href} className="block text-stone-subtle hover:text-stone text-xs transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
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
            <p className="text-stone text-xs font-semibold uppercase tracking-widest mb-4">By Region & Platform</p>
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
            <p className="text-stone text-xs font-semibold uppercase tracking-widest mb-4">Podcasts Like…</p>
            <ul className="space-y-2.5">
              {[
                { href: '/podcasts-like/serial', label: 'Podcasts Like Serial' },
                { href: '/podcasts-like/casefile', label: 'Podcasts Like Casefile' },
                { href: '/podcasts-like/teachers-pet', label: 'Podcasts Like Teacher\'s Pet' },
                { href: '/podcasts-like/crime-junkie', label: 'Podcasts Like Crime Junkie' },
                { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
              ].map(link => (
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
