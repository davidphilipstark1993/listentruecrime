import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, MapPin, Calendar } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { getAllCases } from '@/lib/cases'
import { BASE } from '@/lib/seo/config'
import { buildBreadcrumbSchema } from '@/lib/seo/content'

export const metadata: Metadata = {
  title: 'True Crime Cases',
  description: 'A guide to famous criminal cases mapped to the best podcasts covering them. Solved mysteries, cold cases, and ongoing investigations — find the best place to start.',
  alternates: { canonical: `${BASE}/cases` },
  openGraph: {
    title: 'True Crime Cases | ListenTrueCrime',
    description: 'Famous criminal cases mapped to the best podcasts covering them.',
    url: `${BASE}/cases`,
  },
}

const STATUS_LABEL: Record<string, string> = {
  solved: 'Solved',
  cold: 'Cold Case',
  ongoing: 'Ongoing',
  partial: 'Partially Resolved',
}

const STATUS_COLOUR: Record<string, string> = {
  solved: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  cold: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  ongoing: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  partial: 'text-stone-muted bg-ink-700 border-white/10',
}

export default function CasesIndexPage() {
  const cases = getAllCases()

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Home', url: BASE },
    { name: 'Cases', url: `${BASE}/cases` },
  ])

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Famous True Crime Cases',
    description: 'Criminal cases covered by podcasts in the ListenTrueCrime database',
    numberOfItems: cases.length,
    itemListElement: cases.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}/cases/${c.slug}`,
      name: c.name,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <Header />
      <main className="min-h-screen bg-ink-950 pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-stone-subtle mb-8">
            <Link href="/" className="hover:text-stone transition-colors">Home</Link>
            <span>/</span>
            <span className="text-stone-muted">Cases</span>
          </nav>

          <header className="mb-10">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone mb-3">
              True Crime Cases
            </h1>
            <p className="text-stone-muted text-base max-w-2xl leading-relaxed">
              Famous criminal cases mapped to the best podcasts covering them. Find the definitive starting point for every case.
            </p>
            {cases.length === 0 && (
              <p className="mt-4 text-stone-subtle text-sm">Case pages are coming soon.</p>
            )}
          </header>

          {cases.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cases.map(c => (
                <Link
                  key={c.slug}
                  href={`/cases/${c.slug}`}
                  className="card p-5 hover:border-white/20 transition-all group flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-serif text-base font-semibold text-stone group-hover:text-crimson transition-colors leading-snug">
                      {c.name}
                    </h2>
                    <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLOUR[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-stone-subtle">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {c.year}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} />
                      {c.location}
                    </span>
                  </div>

                  <p className="text-stone-muted text-sm leading-relaxed line-clamp-2">
                    {c.summary[0]}
                  </p>

                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <span className="text-xs text-stone-subtle">
                      {c.podcasts.length} podcast{c.podcasts.length !== 1 ? 's' : ''}
                    </span>
                    <ArrowRight size={14} className="text-crimson opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
