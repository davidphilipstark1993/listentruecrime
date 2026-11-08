import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { GoogleAnalytics } from '@next/third-parties/google'
import { ExitIntent } from '@/components/newsletter/exit-intent'
import '@/app/globals.css'

import { BASE, ORG_ID, WEBSITE_ID, personId } from '@/lib/seo/config'
import { getAuthor } from '@/lib/authors'
import { SOCIAL_PROFILES } from '@/lib/seo/social-profiles'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'ListenTrueCrime — Discover Your Next True Crime Podcast',
    template: '%s | ListenTrueCrime',
  },
  description:
    'Discover, rate, and review the best true crime podcasts. Expert reviews, community ratings, and curated lists — find your next obsession.',
  authors: [{ name: 'ListenTrueCrime' }],
  creator: 'ListenTrueCrime',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: BASE,
    siteName: 'ListenTrueCrime',
    title: 'ListenTrueCrime — Discover Your Next True Crime Podcast',
    description: 'Discover, rate, and review the best true crime podcasts. Expert reviews, community ratings, and curated lists.',
    images: [{ url: '/og', width: 1200, height: 630, alt: 'ListenTrueCrime' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ListenTrueCrime',
    description: 'Discover your next true crime podcast.',
    images: ['/og'],
  },
  robots: { index: true, follow: true },
}

const editor = getAuthor('david-stark')

// One entity graph shared by every page. Other templates point at these nodes
// by @id (publisher, author, isPartOf) instead of redefining them.
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: 'ListenTrueCrime',
  url: BASE,
  description: 'Discover, rate, and review the best true crime podcasts.',
  inLanguage: 'en-GB',
  publisher: { '@id': ORG_ID },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE}/browse?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'ListenTrueCrime',
  url: BASE,
  description: 'ListenTrueCrime is an independent true crime podcast discovery and review site with editorial verdicts, Binge Factor scores and community ratings.',
  logo: {
    '@type': 'ImageObject',
    url: `${BASE}/icon.png`,
    width: 1254,
    height: 1254,
  },
  founder: { '@type': 'Person', '@id': personId(editor.slug), name: editor.name, url: `${BASE}/authors/${editor.slug}` },
  ...(SOCIAL_PROFILES.length > 0 && { sameAs: [...SOCIAL_PROFILES] }),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`dark ${inter.variable} ${playfairDisplay.variable}`}>
      <body className="antialiased">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
        <ExitIntent />
        <GoogleAnalytics gaId="G-9EHFH28GZF" />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a1a23',
              color: '#f2f2f5',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#1a1a23' } },
            error:   { iconTheme: { primary: '#be123c', secondary: '#1a1a23' } },
          }}
        />
      </body>
    </html>
  )
}
