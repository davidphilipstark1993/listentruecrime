export interface Ad {
  id: string
  created_at: string
  updated_at: string
  title: string
  description: string | null
  destination_url: string
  button_text: string
  image_path: string
  image_alt: string | null
  image_width: number
  image_height: number
  placements: string[]
  sort_order: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  utm_campaign: string | null
  archived_at: string | null
}

/** What a visitor's browser receives: no admin fields, URL already UTM-tagged. */
export interface PublicAd {
  id: string
  title: string
  description: string | null
  href: string
  rel: string
  buttonText: string
  imageUrl: string
  imageAlt: string
  width: number
  height: number
  startsAt: string | null
  endsAt: string | null
  /** Whether the advert was live when the page was rendered (see AdSlotClient). */
  visibleAtRender: boolean
}
