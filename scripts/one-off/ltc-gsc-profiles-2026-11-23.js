// One-off: profile fixes for five podcasts Search Console is sending
// impressions to (Nov 2026): Full Body Chills, The McGinty Mystery, Poison Ink,
// Cold Justice and Unsolved (RTÉ). Facts checked on 23 Nov 2026 against each
// show's RSS feed / publisher page; sources are listed in
// lib/seo/podcast-profile-extras.ts. Overwrites only the fields listed.
// Dry run unless --apply.
//   node scripts/one-off/ltc-gsc-profiles-2026-11-23.js [--apply]
const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8').split('\n');
function get(name) {
  const line = lines.find(l => l.startsWith(name + '='));
  let v = line.slice(name.length + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  return v.replace(/\\n$/, '');
}
const { createClient } = require('../../node_modules/@supabase/supabase-js');
const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'));
const APPLY = process.argv.includes('--apply');

const PATCHES = {
  // Was described as "horror-adjacent stories that sit just next to true crime";
  // it is a fiction anthology (Apple genre: Fiction; every episode credits a writer).
  'full-body-chills': {
    seo_title: 'Full Body Chills Podcast: Are the Stories Real? Review',
    meta_description:
      "Full Body Chills is Audiochuck's horror fiction podcast. The scary stories are original fiction by named writers, not real events. Here's where to start.",
    description:
      'Full Body Chills is a horror fiction anthology from Audiochuck, the podcast company behind Crime Junkie. Each episode is a single original scary story, credited to a named writer and read by a narrator, with its own sound design and score: a babysitter who quits after one terrible night, a group chat that slowly unravels a lie, an extra photo among eleven birthday snaps. None of it is true. Ashley Flowers read every story in the first season in October 2019; later seasons use a rotating cast of narrators and are produced by David Flowers. Many stories come in through an open submissions call on the show\'s website, and writers whose stories are chosen are paid. New seasons arrive in the autumn, mostly in October, and season 8 ran in October 2026. Episodes range from about 12 minutes in the early seasons to an hour, and each one stands alone.',
    short_description:
      "Audiochuck's horror fiction anthology: original scary stories by named writers, read by narrators, released in seasons each October.",
    newsletter_worthy_summary:
      'Campfire stories from the Crime Junkie team, made up from start to finish, and best saved for October nights.',
    quick_verdict: 'Good if you want made-up scary stories, not real cases',
    case_types: ['Fiction', 'Horror'],
    format_type: 'Episodic',
    host_style: 'Rotating narrators',
    factual_style: 'Fiction (scripted horror stories)',
    episode_length: 'About 12 to 60 min',
    episode_count: '150+ episodes over 8 seasons (2019 to 2026)',
    best_episode_to_start:
      'Any episode: each story stands alone. Season 1 (October 2019) has the shortest episodes, 12 to 25 minutes, all read by Ashley Flowers',
    producer: 'Audiochuck',
    website_url: 'https://fullbodychillspodcast.com/',
    platforms: ['Apple Podcasts', 'RSS'],
    platform_urls: {
      'Apple Podcasts': 'https://podcasts.apple.com/us/podcast/full-body-chills/id1483252435',
      RSS: 'https://feeds.simplecast.com/6E74sk6q',
    },
    if_you_liked_this: ['just-creepy', 'heart-starts-pounding', 'lore', 'so-supernatural'],
  },

  // short_description was a truncated newsletter blurb ("This is the gentlest pick
  // this week..."), which Google showed as the meta description; country, format,
  // case types and listen link were all empty.
  'secret-devon-the-mcginty-mystery': {
    seo_title: 'The McGinty Mystery Podcast (BBC Secret Devon) Review',
    meta_description:
      "The McGinty Mystery: BBC Radio Devon's six-part podcast in which Emily Wood investigates her great-aunt's 1935 killing and a possible Agatha Christie link.",
    short_description:
      "BBC Radio Devon's six-part podcast in which Emily Wood investigates her great-aunt's 1935 killing in London, and whether it helped inspire Agatha Christie's Mrs McGinty's Dead.",
    description:
      "Secret Devon: The McGinty Mystery is a six-part BBC Radio Devon podcast presented and produced by journalist Emily Wood. In 1935 her great-aunt Eva, who lived in London and also used the name Eveline McGinty, was killed on the night of her daughter's 13th birthday. An inquest concluded that Eva's boyfriend killed her and then took his own life, but her family were left with questions, and with the name McGinty. In 1952 Agatha Christie published Mrs McGinty's Dead. Over six short episodes Emily goes from Torquay, Christie's home town, to the London flat where Eva died, reads the coroner's report and Christie's notebooks, and asks whether the case could have reached Christie. Contributors include Christie experts Dr Mark Aldridge and Laura Thompson, crime writers Jeremy Vine and Robert Thorogood, and forensic specialists and historians. The series is complete.",
    host_name: 'Emily Wood',
    host_bio:
      'Emily Wood is a journalist who presents and produces The McGinty Mystery for BBC Radio Devon, investigating the 1935 killing of her own great-aunt. Sound production is by Ben Coates, the executive producer is James Watts, and the music is by Cole Stacey.',
    producer: 'BBC Radio Devon',
    country: 'UK',
    country_name: 'United Kingdom',
    case_types: ['Murder', 'Historical Crime'],
    format_type: 'Serialized',
    host_style: 'Single Host',
    factual_style: 'Personal investigation',
    episode_length: 'About 15 to 19 min',
    episode_count: '6 episodes (complete, 2026)',
    best_episode_to_start: '1. A murder in the family; listen in order',
    platforms: ['BBC Sounds'],
    platform_urls: { 'BBC Sounds': 'https://www.bbc.co.uk/sounds/brand/p0p967d9' },
    if_you_liked_this: ['strange-but-true-crime-bbc', 'fake-psychic-bbc', 'bad-mad-and-northern', 'dark-histories'],
  },

  // Already well sourced; the meta fell back to a truncated description and the
  // short_description is an audience note. Radio 1 broadcast date dropped (not
  // re-verified).
  'poison-ink-rte': {
    seo_title: "Poison Ink Podcast Review: RTÉ's Poison-Pen Letters Series",
    meta_description:
      'Poison Ink is a four-part RTÉ Documentary On One podcast about anonymous poison-pen letters that targeted two families on a north Dublin estate for five years.',
    description:
      'Poison Ink is a four-part series from RTÉ Documentary On One about a campaign of anonymous letters that ran for five years on a north Dublin estate. It started in 2018 with a typed note warning a local childminder to stop minding a "Spanish child". Later letters, some handwritten, accused two neighbouring families of being a danger to children, made racist demands, and reached the families\' wider circle, including people linked through their children\'s school. Writer Sarah Maria Griffin hosts, but the families tell most of the story themselves: how they first shrugged the letters off, how fear and suspicion crept in, and what it is like to live alongside an accuser you cannot identify. The original letters are read aloud throughout (RTÉ notes that AI-generated voices were used for the letters in episode 1). Written and produced by Shauna McGreevy. Episode 1 came out on 20 November 2026, with a new episode every week. Content warning: false allegations of child abuse, racist abuse, harassment and stalking.',
    if_you_liked_this: ['pirate-predator-rte', 'the-nobody-zone', 'sweet-bobby', 'west-cork'],
  },

  // The record called this a "TV-podcast" on Apple Podcasts with no URL. No
  // Cold Justice podcast exists on Apple (US/UK searches, 23 Nov 2026); it is an
  // Oxygen TV series. Copy now says so; unverified podcast fields are cleared.
  'cold-justice': {
    seo_title: 'Cold Justice: Is There a Podcast? Plus Podcasts Like It',
    meta_description:
      "Cold Justice is Oxygen's TV series in which ex-prosecutor Kelly Siegler reopens unsolved murders. We found no official podcast; here's what to try instead.",
    description:
      'Cold Justice is a true crime TV series, not a podcast. Former Harris County, Texas prosecutor Kelly Siegler and a team of investigators travel to towns where a murder has gone unsolved and, with the agreement of local police, reopen the case. Produced by Dick Wolf, it began on TNT in 2013 and moved to Oxygen in 2017. We found no official Cold Justice podcast on Apple Podcasts in November 2026, so the podcasts recommended on this page are ones that take a similar approach in audio.',
    short_description:
      "Oxygen's TV series in which ex-prosecutor Kelly Siegler reopens unsolved murders. There is no official podcast; these are the closest audio alternatives.",
    newsletter_worthy_summary: null,
    quick_verdict: null,
    case_types: ['Cold Case', 'Murder'],
    format_type: null,
    host_style: null,
    factual_style: null,
    episode_length: null,
    episode_count: null,
    best_episode_to_start: null,
    platforms: [],
    platform_urls: {},
    website_url: 'https://www.oxygen.com/cold-justice',
    if_you_liked_this: ['crime-junkie-presents-red-ball', 'cold-case-files', 'the-trail-went-cold', 'unsolved-gina-barton'],
  },

  // No artwork, no listen links, no similar podcasts; description stopped at the
  // early episodes and described every case as a missing-person case.
  'unsolved-rte': {
    seo_title: 'Unsolved (RTÉ) Podcast Review: Barry Cummins & Katja Mia',
    meta_description:
      "Unsolved is RTÉ's weekly Irish cold case podcast with Barry Cummins and Katja Mia, covering cases from Arlene Arkinson to Jo Jo Dullard and Deirdre Jacob.",
    short_description:
      "RTÉ's weekly Irish cold case podcast, presented by crime journalist Barry Cummins and 2FM presenter Katja Mia.",
    description:
      'Unsolved is a weekly Irish cold case podcast from RTÉ, presented by crime journalist Barry Cummins and 2FM presenter Katja Mia. RTÉ describes it as a podcast made "in the hope that someone listening knows something", focused on unsolved Irish murders and suspected murders, with the victim at the centre of each story. Each case runs over one to three episodes. It began on 27 July 2026 with a short introduction and three episodes on Arlene Arkinson, the 15-year-old who vanished after a disco in Bundoran in 1994, and has since covered Raonaid Murray, Fiona Pender, Antoinette Smith, Annie McCarrick, Philip Cairns, Jo Jo Dullard, Trevor Deely (including an episode with his siblings), Deirdre Jacob and, from 18 November 2026, Baiba Saulite. New episodes usually arrive on Wednesdays and run for about 20 to 50 minutes. Content warning: murder, missing children and teenagers, sexual violence.',
    host_bio:
      'Barry Cummins is an Irish crime journalist with 30 years in radio, television and print, much of it devoted to missing people; he has written six true crime books and won ten Justice Media Awards. Katja Mia presents 2FM Drive with Laura Fox and previously co-hosted The Six O\'Clock Show.',
    producer: 'RTÉ',
    country_name: 'Ireland',
    case_types: ['Cold Case', 'Missing Person', 'Murder'],
    format_type: 'Multi-part cases',
    host_style: 'Dual Host',
    factual_style: 'Journalistic, victim-centred',
    episode_length: 'About 20 to 50 min',
    episode_count: '23 episodes by 18 Nov 2026 (ongoing, weekly)',
    best_episode_to_start:
      'Arlene Arkinson - Part 1 (29 Jul 2026), the first full case. Each case stands alone, so any "Part 1" is a fine starting point',
    image_url:
      'https://www.omnycontent.com/d/playlist/c7d3b33c-f943-4afb-8665-b0b200e579f7/f70fa6c4-2f85-4093-b37b-b491008d087d/3f859df9-6b23-49fd-bf7b-b491008d0cff/image.jpg?t=1788878605&size=Large',
    artwork_status: 'verified',
    artwork_source: 'rss',
    artwork_confidence: 'high',
    artwork_match_reason: "Official Unsolved cover from the itunes:image tag in RTÉ's Omny RSS feed.",
    artwork_error: null,
    artwork_verified_at: new Date().toISOString(),
    apple_collection_id: 6795121500,
    rss_url:
      'https://www.omnycontent.com/d/playlist/c7d3b33c-f943-4afb-8665-b0b200e579f7/f70fa6c4-2f85-4093-b37b-b491008d087d/3f859df9-6b23-49fd-bf7b-b491008d0cff/podcast.rss',
    platforms: ['Apple Podcasts', 'RSS'],
    platform_urls: {
      'Apple Podcasts': 'https://podcasts.apple.com/ie/podcast/unsolved/id6795121500',
      RSS: 'https://www.omnycontent.com/d/playlist/c7d3b33c-f943-4afb-8665-b0b200e579f7/f70fa6c4-2f85-4093-b37b-b491008d087d/3f859df9-6b23-49fd-bf7b-b491008d0cff/podcast.rss',
    },
    if_you_liked_this: ['lines-of-enquiry', 'west-cork', 'pirate-predator-rte', 'charlene-somebody-knows-something'],
  },
};

(async () => {
  for (const [slug, patch] of Object.entries(PATCHES)) {
    const { data, error } = await supabase.from('podcasts').select(Object.keys(patch).join(',')).eq('slug', slug).single();
    if (error) throw new Error(`${slug}: ${error.message}`);
    console.log(`\n=== ${slug}`);
    for (const k of Object.keys(patch)) {
      if (k === 'artwork_verified_at') continue;
      if (JSON.stringify(data[k]) !== JSON.stringify(patch[k])) console.log(`${k}:\n  was ${JSON.stringify(data[k])}\n  now ${JSON.stringify(patch[k])}`);
    }
    if (!APPLY) continue;
    const { error: ue } = await supabase.from('podcasts').update(patch).eq('slug', slug);
    if (ue) throw new Error(`${slug}: ${ue.message}`);
    console.log('updated');
  }
  if (!APPLY) console.log('\ndry run — pass --apply to write');
})().catch(e => { console.error(e); process.exitCode = 1; });
