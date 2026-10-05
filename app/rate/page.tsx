import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { RateCatalogue, type RateItem } from './rate-catalogue'
import { BASE } from '@/lib/seo/config'

export const revalidate = 3600

// Landing page for the "rate the podcasts you know" newsletter. It's a
// working list, not content, so it stays out of the index and the sitemap.
export const metadata: Metadata = {
  title: 'Rate the podcasts you know',
  description: 'Find the true crime podcasts you have listened to and give them an honest rating.',
  alternates: { canonical: `${BASE}/rate` },
  robots: { index: false, follow: true },
}

export default async function RatePage() {
  const { data } = await createAdminClient()
    .from('podcasts')
    .select('id, slug, title, host_name, country')
    .eq('is_published', true)
    .order('title', { ascending: true })
    .order('id', { ascending: true })
    .limit(2000)

  const items = (data ?? []) as RateItem[]

  return (
    <>
      <Header />
      <main id="main-content" className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16 min-h-screen">
        <h1 className="heading-display text-3xl sm:text-4xl mb-3">Rate the podcasts you know</h1>
        <p className="text-stone-muted mb-2">
          ListenTrueCrime is built on honest, human recommendations. Your rating helps the next
          listener find something good.
        </p>
        <p className="text-stone-muted mb-8">
          Find a show you have actually listened to and tap <strong className="text-stone">Rate</strong>.
          It takes about a minute and you don&apos;t need an account. If you haven&apos;t heard it, skip it.
        </p>
        <RateCatalogue items={items} />
      </main>
      <Footer />
    </>
  )
}
