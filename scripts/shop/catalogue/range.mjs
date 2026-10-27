// The merchandise range: which design goes on which product, plus the copy.
// One source of truth for create-printify-products.mjs and populate-shop.mjs.
//
// Everything is made by UK print providers on Printify (no US fulfilment):
//   tee / premium tee / hoodie  T Shirt and Sons, Westbury  (provider 6)
//   sweatshirt                  Shirt Monkey, Winsford       (provider 331)
//   mug / tote                  Harrier, Newton Abbot (94) / T Shirt and Sons (6)

export const COLLECTIONS = [
  { slug: 'armchair-detective', label: 'The Armchair Detective', blurb: 'For people who solve it all from the sofa.' },
  { slug: 'podcast-addict', label: 'The Podcast Addict', blurb: 'Just one more episode. You said that three episodes ago.' },
  { slug: 'case-files', label: 'The Case Files', blurb: 'Evidence labels, folders and stamps. Quiet obsession, typeset.' },
]

// Print-on-demand product types. `area` is the Printify print area in px for the front.
export const TYPES = {
  tee:      { label: 'T-Shirt',         category: 't-shirts',    blueprint: 145, provider: 6,   colour: 'Black', area: [3300, 4180], base: 'Gildan Softstyle 64000 T-shirt' },
  premium:  { label: 'Premium T-Shirt', category: 't-shirts',    blueprint: 12,  provider: 6,   colour: 'Black', area: [3300, 4180], base: 'Bella+Canvas 3001 T-shirt' },
  hoodie:   { label: 'Hoodie',          category: 'hoodies',     blueprint: 77,  provider: 6,   colour: 'Black', area: [3709, 2472], base: 'Gildan Heavy Blend 18500 hooded sweatshirt' },
  sweat:    { label: 'Sweatshirt',      category: 'hoodies',     blueprint: 49,  provider: 331, colour: 'Black', area: [3709, 4203], base: 'Gildan Heavy Blend 18000 crewneck sweatshirt' },
  mug:      { label: 'Mug',             category: 'mugs',        blueprint: 479, provider: 94,  colour: null,    area: [2327, 1086], base: '11oz black ceramic mug' },
  tote:     { label: 'Tote Bag',        category: 'accessories', blueprint: 720, provider: 6,   colour: 'Black', area: [2953, 3780], base: 'black cotton tote bag' },
}

// Retail prices in pence (GBP). Delivery is charged on top at Printify's real rate.
// Provisional until checked against the provider costs printed by create-printify-products.mjs.
export const PRICES = { tee: 2499, premium: 2999, hoodie: 4999, sweat: 3699, mug: 1499, tote: 1799 }

// How big each design prints: 'full' (large front graphic) or 'chest' (small left-chest style).
const SIZE = { 'respectfully-i-have-questions': 'chest', 'amateur-sleuth-professional-overthinker': 'chest' }

export const DESIGN_COPY = {
  'professional-armchair-detective': {
    blurb: 'The credentials are entirely self-awarded. The dedication is real. Set in a justified serif lockup, with a quiet licence line underneath.',
    tags: ['armchair detective', 'true crime', 'gift for true crime fans'],
  },
  'amateur-sleuth-professional-overthinker': {
    blurb: 'You have never been on a case. You have, however, formed seven theories before the ad break.',
    tags: ['amateur sleuth', 'overthinker', 'true crime humour'],
  },
  'everyone-is-a-suspect': {
    blurb: 'A trust policy in four words. The small print says it includes you, and it includes me.',
    tags: ['suspect', 'true crime humour', 'whodunnit'],
  },
  'respectfully-i-have-questions': {
    blurb: 'Polite, firm and entirely unconvinced. A small, quiet print for anyone who has paused a documentary to say "but why".',
    tags: ['questions', 'true crime', 'cold case'],
  },
  'the-timeline-doesnt-lie': {
    blurb: 'Every good case turns on a gap in the timeline. This one has a dashed red stretch where somebody is unaccounted for.',
    tags: ['timeline', 'true crime', 'evidence'],
  },
  'just-one-more-episode': {
    blurb: 'A progress bar stuck at 38% and a time stamp that says it is already far too late. You will press play anyway.',
    tags: ['podcast addict', 'one more episode', 'true crime podcasts'],
  },
  'if-i-go-missing-check-my-podcast-queue': {
    blurb: 'Gallows humour for people whose podcast queue is the closest thing to a case file they own.',
    tags: ['podcast queue', 'true crime humour', 'podcast gift'],
  },
  'shhh-im-listening-to-a-case': {
    blurb: 'Headphones in, door shut, do not speak to me until the verdict. A simple signal for anyone mid-episode.',
    tags: ['headphones', 'podcast listener', 'true crime'],
  },
  'five-podcasts-behind-send-help': {
    blurb: 'The new episodes keep arriving and you keep falling behind. The red badge is how many are waiting.',
    tags: ['podcast backlog', 'podcast addict', 'true crime humour'],
  },
  'case-file-001': {
    blurb: 'A plain case folder, a typewriter label and one line of status. Every collection starts with file 001.',
    tags: ['case file', 'evidence', 'true crime'],
  },
  'cold-case-unit': {
    blurb: 'An evidence-label badge for the unofficial Cold Case Unit. There is no statute of limitations on curiosity.',
    tags: ['cold case', 'evidence label', 'true crime'],
  },
  'persons-of-interest': {
    blurb: 'A list of names, mostly redacted, with one unredacted suspect that every mystery fan will recognise.',
    tags: ['persons of interest', 'redacted', 'true crime'],
  },
  'file-under-obsession': {
    blurb: 'Filed in the folder marked obsession, cross-referenced with "another episode".',
    tags: ['obsession', 'file folder', 'true crime'],
  },
  'listen-investigate-repeat': {
    blurb: 'The whole routine in three lines, with the last one in red because it never ends.',
    tags: ['listen investigate repeat', 'true crime podcasts', 'routine'],
  },
  unresolved: {
    blurb: 'A red case-file stamp for the ones that never closed. The kind of case that keeps the whole genre going.',
    tags: ['unresolved', 'cold case', 'stamp'],
  },
}

// design slug -> product types it is sold as. 29 listings.
export const MATRIX = {
  'professional-armchair-detective': ['tee', 'premium', 'hoodie', 'tote'],
  'amateur-sleuth-professional-overthinker': ['tee'],
  'everyone-is-a-suspect': ['tee', 'mug'],
  'respectfully-i-have-questions': ['tee', 'sweat'],
  'the-timeline-doesnt-lie': ['tee'],
  'just-one-more-episode': ['tee', 'sweat', 'mug'],
  'if-i-go-missing-check-my-podcast-queue': ['tee', 'mug'],
  'shhh-im-listening-to-a-case': ['tee', 'tote'],
  'five-podcasts-behind-send-help': ['tee'],
  'case-file-001': ['tee', 'premium', 'hoodie'],
  'cold-case-unit': ['tee'],
  'persons-of-interest': ['tee'],
  'file-under-obsession': ['tee'],
  'listen-investigate-repeat': ['tee', 'hoodie', 'mug'],
  unresolved: ['tee', 'hoodie'],
}

// Strongest listings first (sort_order); the rest follow in collection order.
export const FEATURED = ['professional-armchair-detective-t-shirt', 'just-one-more-episode-t-shirt', 'case-file-001-t-shirt', 'unresolved-t-shirt']

export const sizeFor = slug => SIZE[slug] ?? 'full'
export const typeSlug = key => ({ tee: 't-shirt', premium: 'premium-t-shirt', hoodie: 'hoodie', sweat: 'sweatshirt', mug: 'mug', tote: 'tote-bag' })[key]

/** Printify image placement { x, y, scale } for a design (given its height/width aspect) on a type. */
export function placement(typeKey, aspect, size) {
  const [W, H] = TYPES[typeKey].area
  let widthFrac, y
  if (typeKey === 'mug') {
    // Only about a third of the wrap is visible from the front: keep the print inside it.
    widthFrac = Math.min(0.32, (0.7 * H) / (aspect * W))
    y = 0.5
  } else if (typeKey === 'hoodie') {
    widthFrac = Math.min(size === 'chest' ? 0.4 : 0.7, (0.8 * H) / (aspect * W))
    y = 0.5
  } else if (typeKey === 'tote') {
    widthFrac = size === 'chest' ? 0.55 : 0.92
    y = 0.45
  } else {
    widthFrac = size === 'chest' ? 0.5 : 0.78
    y = size === 'chest' ? 0.17 : 0.34
  }
  return { x: 0.5, y, scale: Number(widthFrac.toFixed(3)) }
}

/** Full product description for the shop. Natural, short, per design + type. */
export function describe(design, typeKey) {
  const c = DESIGN_COPY[design.slug]
  const t = TYPES[typeKey]
  const base = { tee: `Printed on a black ${t.base}.`, premium: `Printed on a black ${t.base}.`, hoodie: `Printed on a black ${t.base}.`, sweat: `Printed on a black ${t.base}.`, mug: `An ${t.base}, with the design on the front.`, tote: `Printed on a ${t.base}.` }[typeKey]
  return `${c.blurb}\n\n${base} Made to order and printed in the UK. Part of ${COLLECTIONS.find(x => x.slug === design.collection).label} by Listen True Crime.`
}
