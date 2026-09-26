import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Headphones, CalendarDays, MailCheck } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { BASE } from '@/lib/seo/config'

// Dedicated newsletter landing page to send people to (social bios, podcast
// guest spots, etc.). Deliberately no main nav — the only action is to subscribe.

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Free Weekly True Crime Podcast Newsletter',
  description: 'Get 5 true crime podcasts worth listening to, emailed free every Sunday. New shows, hidden gems and established favourites — unsubscribe any time.',
  alternates: { canonical: `${BASE}/subscribe` },
  openGraph: {
    title: '5 True Crime Podcasts Worth Listening To — Every Sunday',
    description: 'A free weekly email with five true crime podcasts we think are worth your time.',
    url: `${BASE}/subscribe`,
  },
}

type IssuePodcast = {
  position: number
  podcast: { title: string } | null
  submission: { podcast_name: string } | null
}

async function getLatestIssue() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('newsletters')
    .select('slug, issue_number, publication_date, newsletter_podcasts(position, podcast:podcasts(title), submission:newsletter_submissions(podcast_name))')
    .in('status', ['sent', 'archived'])
    .order('issue_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null

  const picks = ((data.newsletter_podcasts as unknown as IssuePodcast[] | null) ?? [])
    .sort((a, b) => a.position - b.position)
    .map(np => np.podcast?.title ?? np.submission?.podcast_name)
    .filter(Boolean) as string[]

  return picks.length ? { slug: data.slug, issueNumber: data.issue_number, picks } : null
}

const BENEFITS = [
  {
    icon: Headphones,
    title: '5 podcasts, hand-picked',
    body: 'New shows, hidden gems and established favourites — each one chosen because we think it’s genuinely worth your time.',
  },
  {
    icon: CalendarDays,
    title: 'Every Sunday',
    body: 'One email a week, ready for your next commute, walk or long drive. No daily spam.',
  },
  {
    icon: MailCheck,
    title: '100% free',
    body: 'No cost, no catch. Unsubscribe with one click whenever you like.',
  },
]

const FAQS = [
  {
    q: 'How often will I hear from you?',
    a: 'Once a week, on Sunday. That’s it.',
  },
  {
    q: 'Does it cost anything?',
    a: 'No — the newsletter is completely free.',
  },
  {
    q: 'Can I unsubscribe?',
    a: 'Yes, any time. Every email has a one-click unsubscribe link at the bottom.',
  },
  {
    q: 'What will you do with my email?',
    a: 'We only use it to send you the newsletter. We never sell it. See our privacy policy for details.',
  },
]

export default async function SubscribePage() {
  const latest = await getLatestIssue()

  return (
    <>
      <header className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt="ListenTrueCrime" width={160} height={160} className="h-14 w-auto object-contain" priority />
        </Link>
      </header>

      <main id="main-content">
        {/* ═══════════════ HERO + SIGNUP ═══════════════ */}
        <section className="relative overflow-hidden px-4 pt-10 pb-16 sm:pt-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(190,18,60,0.14),transparent)]" />
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
              <span className="px-2.5 py-1 rounded-full bg-crimson/10 border border-crimson/20 text-crimson text-2xs font-semibold uppercase tracking-wide">
                Free newsletter
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-stone-muted text-2xs font-semibold uppercase tracking-wide">
                Every Sunday
              </span>
            </div>
            <h1 className="heading-display text-4xl sm:text-5xl mb-5">
              5 True Crime Podcasts Worth Listening To
            </h1>
            <p className="text-stone-muted text-lg leading-relaxed mb-8">
              Never run out of something to listen to. Every Sunday we email you five true crime
              podcasts we&apos;ve discovered and think are worth your time.
            </p>

            <div className="card p-5 sm:p-6 text-left">
              <NewsletterForm source="subscribe_page" variant="hero" />
            </div>
          </div>
        </section>

        {/* ═══════════════ WHAT YOU GET ═══════════════ */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="heading-section text-2xl sm:text-3xl text-center mb-8">What you&apos;ll get</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {BENEFITS.map(b => (
              <div key={b.title} className="card p-6">
                <b.icon size={20} className="text-crimson mb-3" />
                <h3 className="text-stone font-semibold mb-2">{b.title}</h3>
                <p className="text-stone-muted text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════ LATEST ISSUE ═══════════════ */}
        {latest && (
          <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="heading-section text-2xl sm:text-3xl text-center mb-2">Last issue&apos;s picks</h2>
            <p className="text-stone-subtle text-sm text-center mb-6">A taste of what lands in your inbox.</p>
            <ol className="card divide-y divide-white/[0.06]">
              {latest.picks.map((title, i) => (
                <li key={title} className="flex items-center gap-4 px-5 py-3.5">
                  <span className="text-crimson font-serif font-semibold text-lg w-5 shrink-0">{i + 1}</span>
                  <span className="text-stone text-sm">{title}</span>
                </li>
              ))}
            </ol>
            <p className="text-center mt-4">
              <Link href={`/newsletter/${latest.slug}`} className="text-stone-subtle text-xs underline hover:text-stone">
                Read issue #{latest.issueNumber} in full
              </Link>
            </p>
          </section>
        )}

        {/* ═══════════════ FAQ ═══════════════ */}
        <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="heading-section text-2xl sm:text-3xl text-center mb-8">Questions</h2>
          <dl className="space-y-5">
            {FAQS.map(f => (
              <div key={f.q}>
                <dt className="text-stone font-semibold mb-1">{f.q}</dt>
                <dd className="text-stone-muted text-sm leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ═══════════════ FINAL CTA ═══════════════ */}
        <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20">
          <div className="relative overflow-hidden rounded-2xl bg-ink-800 border border-white/[0.06] p-6 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(190,18,60,0.1),transparent_60%)]" />
            <div className="relative z-10">
              <h2 className="heading-section text-2xl mb-2">Get this Sunday&apos;s five</h2>
              <p className="text-stone-muted text-sm mb-5">Free, once a week, unsubscribe any time.</p>
              <NewsletterForm source="subscribe_page_bottom" />
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-stone-subtle">
        <span>© {new Date().getFullYear()} ListenTrueCrime</span>
        <nav className="flex gap-4">
          <Link href="/" className="hover:text-stone">Home</Link>
          <Link href="/privacy" className="hover:text-stone">Privacy</Link>
          <Link href="/terms" className="hover:text-stone">Terms</Link>
        </nav>
      </footer>
    </>
  )
}
