import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import { GoogleAnalytics } from '@next/third-parties/google'
import { ExitIntent } from '@/components/newsletter/exit-intent'
import '@/app/globals.css'

import { BASE } from '@/lib/seo/config'

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
  alternates: { canonical: BASE },
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ListenTrueCrime',
  url: BASE,
  description: 'Discover, rate, and review the best true crime podcasts.',
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
  name: 'ListenTrueCrime',
  url: BASE,
  logo: {
    '@type': 'ImageObject',
    url: `${BASE}/icon.png`,
    width: 1254,
    height: 1254,
  },
  // sameAs intentionally omitted — no social/profile URLs exist anywhere in
  // the site or repo to populate it with (see audit summary). Add it back
  // here once real profile URLs exist.
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
