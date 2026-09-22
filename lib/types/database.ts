// ============================================================
// Database Types — mirror of Supabase schema
// ============================================================

import type { PromotionInterest, PromotionEnquiryStatus } from '@/lib/promotion/packages'

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
  host_name: string | null
  host_bio: string | null
  website_url: string | null
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

export type NewsletterSubscriberStatus = 'active' | 'unsubscribed' | 'bounced' | 'suppressed'

export interface NewsletterSubscriber {
  id: string
  email: string
  first_name: string | null
  source: string | null
  source_detail: string | null
  status: NewsletterSubscriberStatus
  consent: boolean
  subscribed_at: string
  unsubscribed_at: string | null
  sendgrid_synced: boolean
  sendgrid_contact_id: string | null
  welcome_sent: boolean
  created_at: string
  updated_at: string
}

export interface PodcastPromotionEnquiry {
  id: string
  created_at: string
  updated_at: string
  name: string
  email: string
  podcast_name: string
  podcast_website: string | null
  rss_feed: string | null
  package_interest: PromotionInterest
  campaign_timing: string | null
  message: string | null
  newsletter_opt_in: boolean
  status: PromotionEnquiryStatus
  admin_notes: string | null
}

// ============================================================
// Podcast discovery / newsletter automation types
// ============================================================

export type PodcastDiscoveryStatus =
  | 'discovered'
  | 'researching'
  | 'researched'
  | 'shortlisted'
  | 'approved'
  | 'rejected'
  | 'featured'

export interface PodcastDiscoveryHost {
  name: string
  verified: boolean
}

export interface PodcastDiscoverySource {
  url: string
  note: string
}

export interface PodcastDiscovery {
  id: string
  podcast_name: string
  normalized_name: string
  rss_url: string | null
  website_url: string | null
  apple_url: string | null
  spotify_url: string | null
  youtube_url: string | null
  artwork_url: string | null
  hosts: PodcastDiscoveryHost[] | null
  description: string | null
  country: string | null
  language: string | null
  episode_count: number | null
  launch_date: string | null
  latest_episode_date: string | null
  format: string | null
  case_focus: string[] | null
  research_notes: string | null
  sources: PodcastDiscoverySource[] | null
  pros: string[] | null
  cons: string[] | null
  editorial_verdict: string | null
  score: number | null
  matched_podcast_id: string | null
  discovered_at: string
  researched_at: string | null
  status: PodcastDiscoveryStatus
  newsletter_id: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export type NewsletterStatus = 'draft' | 'review' | 'approved' | 'sent' | 'archived'

export interface Newsletter {
  id: string
  title: string
  slug: string
  issue_number: number
  publication_date: string
  intro: string | null
  status: NewsletterStatus
  html_content: string | null
  plain_text_content: string | null
  created_at: string
  sent_at: string | null
  sendgrid_campaign_id: string | null
  updated_at: string
}

export interface NewsletterPodcast {
  id: string
  newsletter_id: string
  podcast_discovery_id: string | null
  podcast_id: string | null
  newsletter_submission_id: string | null
  position: number
  blurb: string | null
  created_at: string
  // Joined fields
  discovery?: PodcastDiscovery
  podcast?: Pick<Podcast, 'title' | 'slug' | 'image_url'>
  submission?: Pick<NewsletterSubmission, 'podcast_name' | 'artwork_url' | 'hosts' | 'podcast_url' | 'website_url' | 'curator_rating' | 'matched_podcast_id'>
}

export type NewsletterSubmissionStatus = 'draft' | 'approved'

export interface NewsletterSubmission {
  id: string
  newsletter_id: string
  podcast_name: string
  normalized_name: string
  podcast_url: string | null
  website_url: string | null
  rss_url: string | null
  hosts: string | null
  description: string | null
  recommendation: string | null
  notes: string | null
  curator_rating: number | null
  artwork_url: string | null
  additional_info: string | null
  status: NewsletterSubmissionStatus
  matched_podcast_id: string | null
  created_at: string
  updated_at: string
}

export type NewsletterEventType = 'open' | 'click' | 'bounce' | 'unsubscribe' | 'group_unsubscribe' | 'spamreport'

export interface NewsletterEvent {
  id: string
  newsletter_id: string | null
  event_type: NewsletterEventType
  email: string
  podcast_id: string | null
  url: string | null
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
  { slug: 'serial-killers', label: 'Serial Killers', description: 'The psychology and crimes of history\'s most notorious offenders', emoji: '🔪' },
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
  'serial-killers': ['Serial Killer', 'Murder', 'Organised Crime'],
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
  'Pocket Casts',
  'Overcast',
  'Patreon',
  'RSS',
  'NPR',
  'BBC Sounds',
]

// Platform display names that get a clean kebab-case URL (/platform/bbc-sounds)
// instead of the default space-encoded one (/platform/BBC%20Sounds) that the
// rest of PLATFORMS still uses — see app/platform/[platform]/page.tsx.
export const PLATFORM_SLUGS: Record<string, string> = {
  'BBC Sounds': 'bbc-sounds',
}

export const COUNTRIES: Record<string, string> = {
  US: 'United States',
  UK: 'United Kingdom',
  AU: 'Australia',
  CA: 'Canada',
  IE: 'Ireland',
  NZ: 'New Zealand',
  ZA: 'South Africa',
  KE: 'Kenya',
  BE: 'Belgium',
  MT: 'Malta',
  BR: 'Brazil',
  PH: 'Philippines',
  IN: 'India',
}
