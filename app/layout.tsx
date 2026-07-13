import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import { ExitIntent } from '@/components/newsletter/exit-intent'
import '@/app/globals.css'

import { BASE } from '@/lib/seo/config'

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
  logo: `${BASE}/og`,
  sameAs: [],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
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
