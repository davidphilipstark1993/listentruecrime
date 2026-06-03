// ============================================================
// Database Types — mirror of Supabase schema
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Profile {
  id: string
  email: string | null
  username: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
}

export interface Podcast {
  id: string
  title: string
  slug: string
  description: string | null
  short_description: string | null
  image_url: string | null
  country: string | null
  case_types: string[] | null
  format_type: string | null
  host_style: string | null
  factual_style: string | null
  binge_factor: number | null
  episode_length: string | null
  episode_count: string | null
  best_episode_to_start: string | null
  platforms: string[] | null
  if_you_liked_this: string[] | null
  is_featured: boolean
  is_published: boolean
  newsletter_worthy_summary: string | null
  quick_verdict: string | null
  created_at: string
  updated_at: string
}

export interface PodcastWithStats extends Podcast {
  rating_stats: RatingStats | null
  review_count: number
}

export interface Rating {
  id: string
  user_id: string
  podcast_id: string
  storytelling_score: number | null
  research_score: number | null
  host_quality_score: number | null
  production_score: number | null
  binge_factor_score: number | null
  factual_accuracy_score: number | null
  overall_score: number | null
  created_at: string
}

export interface RatingStats {
  podcast_id: string
  rating_count: number
  avg_storytelling: number | null
  avg_research: number | null
  avg_host_quality: number | null
  avg_production: number | null
  avg_binge_factor: number | null
  avg_factual_accuracy: number | null
  avg_overall: number | null
}

export interface Review {
  id: string
  user_id: string
  podcast_id: string
  content: string
  approved: boolean
  flagged: boolean
  created_at: string
  // Joined fields
  profile?: Pick<Profile, 'username' | 'avatar_url'>
}

export interface Favourite {
  id: string
  user_id: string
  podcast_id: string
  created_at: string
}

export interface NewsletterSubscriber {
  id: string
  email: string
  source: string | null
  created_at: string
}

// ============================================================
// UI / Filter types
// ============================================================

export type SortOption = 'highest_rated' | 'newest' | 'trending' | 'most_reviewed' | 'title_asc'

export interface BrowseFilters {
  query?: string
  caseTypes?: string[]
  country?: string
  formatType?: string
  hostStyle?: string
  minBingeFactor?: number
  platform?: string
  sort?: SortOption
}

export interface CategoryMeta {
  slug: string
  label: string
  description: string
  emoji: string
}

export const CATEGORIES: CategoryMeta[] = [
  { slug: 'cold-cases', label: 'Cold Cases', description: 'Decades-old mysteries finally cracked open', emoji: '🧊' },
  { slug: 'missing-persons', label: 'Missing Persons', description: 'Searches that consumed communities', emoji: '🔍' },
  { slug: 'investigative', label: 'Investigative', description: 'Deep journalism that holds power to account', emoji: '📰' },
  { slug: 'courtroom', label: 'Courtroom', description: 'Trials, appeals, and the machinery of justice', emoji: '⚖️' },
  { slug: 'fraud-scams', label: 'Fraud & Scams', description: 'Con artists, Ponzi schemes, and white-collar crime', emoji: '💰' },
  { slug: 'uk-crime', label: 'UK Crime', description: 'British cases told with British expertise', emoji: '🇬🇧' },
  { slug: 'australian-crime', label: 'Australian Crime', description: 'The dark side of the Lucky Country', emoji: '🦘' },
  { slug: 'binge-worthy', label: 'Binge-worthy', description: 'Serialized stories you cannot stop at one episode', emoji: '🎧' },
]

export const CATEGORY_TO_CASE_TYPES: Record<string, string[]> = {
  'cold-cases': ['Cold Case'],
  'missing-persons': ['Missing Person'],
  'investigative': ['Investigative'],
  'courtroom': ['Courtroom', 'Wrongful Conviction'],
  'fraud-scams': ['Fraud', 'White-Collar Crime', 'Corporate Fraud', 'Financial Crime', 'Scam'],
  'uk-crime': [], // filtered by country = 'UK'
  'australian-crime': [], // filtered by country = 'AU'
  'binge-worthy': [], // filtered by binge_factor >= 8
}

export const PLATFORMS = [
  'Apple Podcasts',
  'Spotify',
  'Audible',
  'Amazon Music',
  'iHeart',
  'NPR',
  'BBC',
  'CBC Listen',
  'Patreon',
  'Pocket Casts',
  'Overcast',
  'RSS',
]

export const COUNTRIES: Record<string, string> = {
  US: 'United States',
  UK: 'United Kingdom',
  AU: 'Australia',
  CA: 'Canada',
  IE: 'Ireland',
  NZ: 'New Zealand',
}
