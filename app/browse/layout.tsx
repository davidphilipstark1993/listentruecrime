import type { Metadata } from 'next'
import { BASE } from '@/lib/seo/config'

export const metadata: Metadata = {
  title: 'Browse True Crime Podcasts — Filter by Category, Country & Platform',
  description: 'Search and filter our complete database of reviewed true crime podcasts. Filter by case type, country, platform, binge factor, format, and more.',
  alternates: { canonical: `${BASE}/browse` },
  openGraph: {
    title: 'Browse True Crime Podcasts | ListenTrueCrime',
    description: 'Search and filter our complete database of reviewed true crime podcasts.',
    url: `${BASE}/browse`,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse True Crime Podcasts | ListenTrueCrime',
    description: 'Search and filter our complete database of reviewed true crime podcasts.',
  },
}

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
