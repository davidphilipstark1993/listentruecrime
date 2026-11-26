import Link from 'next/link'
import Image from 'next/image'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { shopEnabled } from '@/lib/shop/config'

const FOOTER_LINKS = {
  discover: [
    { href: '/browse', label: 'Browse All Podcasts' },
    { href: '/best-true-crime-podcasts', label: 'Best Podcasts' },
    { href: '/new-true-crime-podcasts', label: 'New True Crime Podcasts' },
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
    { href: '/platform/apple-podcasts', label: 'True Crime on Apple Podcasts' },
    { href: '/platform/Audible', label: 'True Crime on Audible' },
  ],
  site: [
    { href: '/about', label: 'About' },
    { href: '/how-we-review', label: 'How We Review' },
    { href: '/blog', label: 'Blog' },
    { href: '/cases', label: 'Cases' },
    { href: '/badge', label: 'Podcaster Badges' },
    { href: '/promote-your-podcast', label: 'Promote Your Podcast' },
    { href: '/subscribe', label: 'Weekly Newsletter' },
    { href: '/contact', label: 'Contact' },
  ],
  shop: [
    { href: '/shop', label: 'Shop' },
    { href: '/shop/category/t-shirts', label: 'True Crime T-Shirts' },
    { href: '/shop/category/hoodies', label: 'True Crime Hoodies' },
    { href: '/shop/shipping-policy', label: 'Shipping Policy' },
    { href: '/shop/returns-and-refunds', label: 'Returns & Refunds' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Use' },
    { href: '/terms#affiliate-links', label: 'Affiliate Disclosure' },
  ],
}

// Footer links: 44px-tall rows with 14px text on phones (comfortable thumb
// targets), back to the compact 12px list from md up.
const LINK = 'flex items-center min-h-[44px] md:min-h-0 md:py-0.5 text-sm md:text-xs text-stone-subtle hover:text-stone transition-colors'
const HEADING = 'text-stone text-xs font-semibold uppercase tracking-widest mb-2 md:mb-4'

const PODCASTS_LIKE = [
  { href: '/blog/podcasts-like-serial', label: 'Podcasts Like Serial' },
  { href: '/podcasts-like/casefile-true-crime', label: 'Podcasts Like Casefile' },
  { href: '/podcasts-like/the-teachers-pet', label: 'Podcasts Like Teacher\'s Pet' },
  { href: '/blog/podcasts-like-crime-junkie', label: 'Podcasts Like Crime Junkie' },
  { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
]

export function Footer() {
  const showShop = shopEnabled()
  return (
    <footer className="border-t border-white/[0.06] bg-ink-950 mt-16 sm:mt-24">
      {/* Newsletter bar */}
      <div className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="max-w-xl">
            <p className="text-2xs text-crimson font-semibold uppercase tracking-widest mb-2">Newsletter</p>
            <h2 className="heading-section text-xl mb-1">Your weekly true crime briefing</h2>
            <p className="text-stone-muted text-sm mb-5">
              New podcast reviews, community picks, and hidden gems. No filler.
            </p>
            <NewsletterForm source="footer" />
          </div>
        </div>
      </div>

      {/* Links grid */}
      <nav aria-label="Footer" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3">
              <Link href="/" className="inline-block">
                <Image src="/logo.png" alt="ListenTrueCrime home" width={100} height={100} className="h-10 w-auto object-contain" />
              </Link>
            </div>
            <p className="text-stone-subtle text-sm md:text-xs leading-relaxed mb-3 md:mb-4">
              The best place to discover, rate, and discuss true crime podcasts. Expert reviews and community ratings.
            </p>
            <ul className="grid grid-cols-2 gap-x-6 md:grid-cols-1 md:space-y-1.5">
              {(showShop ? [...FOOTER_LINKS.shop.slice(0, 1), ...FOOTER_LINKS.site] : FOOTER_LINKS.site).map(link => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className={HEADING}>Discover</p>
            <ul className="md:space-y-2">
              {FOOTER_LINKS.discover.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className={HEADING}>By Region & Platform</p>
            <ul className="md:space-y-2">
              {FOOTER_LINKS.regions.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 md:col-span-1">
            <p className={HEADING}>Podcasts Like…</p>
            <ul className="md:space-y-2">
              {PODCASTS_LIKE.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar — wraps freely so the legal links never push past the viewport */}
        <div className="mt-10 md:mt-12 pt-6 border-t border-white/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <p className="text-stone-subtle text-xs">
            © {new Date().getFullYear()} ListenTrueCrime. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 md:gap-x-4 gap-y-0">
            {(showShop ? [...FOOTER_LINKS.legal, ...FOOTER_LINKS.shop.slice(3)] : FOOTER_LINKS.legal).map(link => (
              <li key={link.href}>
                <Link href={link.href} className="flex items-center min-h-[44px] md:min-h-0 text-stone-subtle hover:text-stone text-xs transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-stone-subtle text-xs">
            Helping you find your next obsession, one episode at a time.
          </p>
        </div>
      </nav>
    </footer>
  )
}
