// Answer-first copy for the homepage, built from the site's own data.
import { countryHref, platformHref } from '@/lib/types/database'
import { joinLinked, joinList, segmentsToText, wordCount, type Segment } from '@/lib/seo/text'

export interface ShowRef {
  title: string
  slug: string
}

export interface HomeFaq {
  q: string
  a: string
  link?: { href: string; label: string }
}

const MIN_WORDS = 60
const MAX_WORDS = 90

/**
 * 60–90 word paragraph answering "What are the best true crime podcasts?",
 * naming 3–5 of the top-scored shows (as many as fit the word budget).
 * Returns null when there are fewer than three shows to name.
 */
export function buildHomeAnswer(shows: ShowRef[], total: number): Segment[] | null {
  if (shows.length < 3) return null

  const compose = (n: number, compact = false): Segment[] => [
    'The best true crime podcasts on ListenTrueCrime, ranked by our editor score, are ',
    ...joinLinked(shows.slice(0, n).map(s => ({ text: s.title, href: `/podcasts/${s.slug}` }))),
    `. Each of our ${total.toLocaleString('en-GB')} reviewed shows gets a score out of 10 from our editor, and a community average appears only once five listeners have rated a show.`,
    ...(compact
      ? [' ', { text: 'How we review', href: '/how-we-review' }, ' explains the scores.']
      : [
          ' Browse by case type, country or platform to narrow the list, or read ',
          { text: 'how we review', href: '/how-we-review' },
          ' to see how the scores work.',
        ] as Segment[]),
  ]

  // Prefer the longest list that still fits the word budget; very long titles
  // fall back to a shorter closing sentence.
  for (const compact of [false, true]) {
    for (let n = Math.min(5, shows.length); n >= 3; n--) {
      const words = wordCount(segmentsToText(compose(n, compact)))
      if (words >= MIN_WORDS && words <= MAX_WORDS) return compose(n, compact)
    }
  }
  return compose(3, true)
}

function showsAnswer(lead: string, shows: ShowRef[], fallback: string, tail: string): string {
  if (shows.length === 0) return fallback
  return `${lead} ${joinList(shows.map(s => s.title))}. ${tail}`
}

export function buildHomeFaqs(input: {
  beginners: ShowRef[]
  uk: ShowRef[]
  spotify: ShowRef[]
}): HomeFaq[] {
  return [
    {
      q: 'What is the best true crime podcast for beginners?',
      a: showsAnswer(
        'A good place to start is',
        input.beginners,
        'Start with an episodic show that has a high editor score. Each episode tells a self-contained story, so you can begin anywhere without needing the backstory.',
        'These are episodic shows with high editor scores, so each episode tells a self-contained story and you can begin anywhere.',
      ),
      link: { href: '/best/beginners', label: 'Best true crime podcasts for beginners' },
    },
    {
      q: 'What is the best UK true crime podcast?',
      a: showsAnswer(
        'Our highest-scoring UK true crime podcasts are',
        input.uk,
        'Our UK page lists every British true crime podcast we have reviewed, ordered by editor score.',
        'The full UK list is ordered by editor score.',
      ),
      link: { href: countryHref('UK'), label: 'UK true crime podcasts' },
    },
    {
      q: 'What are the best true crime podcasts on Spotify?',
      a: showsAnswer(
        'Our highest-scoring true crime podcasts available on Spotify are',
        input.spotify,
        'Our Spotify page lists every reviewed true crime podcast that is available on Spotify, ordered by editor score.',
        'The full Spotify list is ordered by editor score.',
      ),
      link: { href: platformHref('Spotify'), label: 'True crime podcasts on Spotify' },
    },
    {
      q: 'How do your podcast ratings work?',
      a: 'Every podcast gets an editor score out of 10 and a verdict from our editor, using the criteria set out on our How We Review page. Listeners can add their own ratings, but we only show a community average once a podcast has at least five ratings; until then it reads "Not enough ratings yet". Editor scores and community ratings are always shown separately.',
      link: { href: '/how-we-review', label: 'How we review podcasts' },
    },
    {
      q: 'Is ListenTrueCrime free to use?',
      a: 'Yes. Browsing the podcast database, reading reviews and the weekly newsletter are all free. Some pages contain affiliate links, such as to audiobooks, and these are always disclosed.',
      link: { href: '/terms#affiliate-links', label: 'Affiliate disclosure' },
    },
  ]
}
