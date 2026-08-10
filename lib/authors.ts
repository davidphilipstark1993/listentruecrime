export interface Author {
  slug: string
  name: string
  role: string
  bio: string
  avatar?: string // URL or null for initials fallback
  initials: string
  twitter?: string
}

export const AUTHORS: Record<string, Author> = {
  'david-stark': {
    slug: 'david-stark',
    name: 'David Stark',
    role: 'Founder & Editor',
    initials: 'DS',
    bio: 'David Stark founded ListenTrueCrime after years of working through the true crime genre one feed at a time — from the early serialized hits to the current wave of daily-drop shows. He personally listens to and scores every podcast in the database across six dimensions (storytelling, research, host quality, production, binge factor, and factual accuracy), aiming to give listeners a straight signal instead of algorithm-driven hype.',
  },
}

export function getAuthor(slug: string): Author {
  return AUTHORS[slug] ?? AUTHORS['david-stark']
}

export function getAllAuthors(): Author[] {
  return Object.values(AUTHORS)
}
