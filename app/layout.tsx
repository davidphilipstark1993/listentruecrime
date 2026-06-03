import type { Metadata } from 'next'
import Script from 'next/script'
import { Toaster } from 'react-hot-toast'
import '@/app/globals.css'
import { organizationSchema, websiteSchema } from '@/lib/seo'

const GA_ID = 'G-9EHFH28GZF'

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://listentruecrime.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'ListenTrueCrime — Discover Your Next True Crime Podcast',
    template: '%s | ListenTrueCrime',
  },
  description:
    'Discover, rate, and review the best true crime podcasts. Community ratings, expert recommendations, and curated lists — find your next obsession.',
  keywords: ['true crime podcasts', 'podcast recommendations', 'best true crime podcasts', 'podcast reviews', 'crime podcast database', 'true crime podcast reviews', 'true crime podcast ratings'],
  authors: [{ name: 'ListenTrueCrime' }],
  creator: 'ListenTrueCrime',
  alternates: { canonical: BASE },
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: BASE,
    siteName: 'ListenTrueCrime',
    title: 'ListenTrueCrime — Discover Your Next True Crime Podcast',
    description: 'Discover, rate, and review the best true crime podcasts. Community ratings, expert recommendations, and curated lists.',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'ListenTrueCrime — True Crime Podcast Directory' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ListenTrueCrime — Discover Your Next True Crime Podcast',
    description: 'Discover, rate, and review the best true crime podcasts.',
    images: ['/logo.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className="dark">
      <body className="antialiased">
        {/* Google Analytics */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {children}
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
