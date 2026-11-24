// Hand-written additions for individual podcast profiles that Search Console
// shows people are already finding (Nov 2026). Everything here was checked
// against the show's own feed, website or publisher on 23 Nov 2026; the
// sources are listed per entry. Pages without an entry render exactly as before.
//
//   subtitle  replaces the "True crime podcast review — <year>" line under the H1
//   intro     a short, answer-first paragraph shown under the H1
//   whoFor    replaces the generated "Who is this podcast for?" lines
//   faqs      shown first in the FAQ (and FAQPage schema); a generated question
//             with the same wording is dropped
//   related   internal links (paths verified to exist on the site)
//   notAPodcast  the profile is about a TV show with no podcast feed, so no
//             PodcastSeries schema is emitted for it

export interface ProfileExtras {
  subtitle?: string
  intro?: string
  whoFor?: string[]
  faqs?: { q: string; a: string }[]
  related?: { href: string; label: string }[]
  notAPodcast?: boolean
}

export const PODCAST_PROFILE_EXTRAS: Record<string, ProfileExtras> = {
  // Sources: Apple Podcasts listing id1483252435 (genre: Fiction), the show's RSS
  // feed (feeds.simplecast.com/6E74sk6q: every episode credits a writer and a
  // narrator; 153 episodes, Oct 2019 to Oct 2026), fullbodychillspodcast.com
  // (story submissions page).
  'full-body-chills': {
    subtitle: 'Fiction horror podcast from Audiochuck — not true crime',
    intro:
      'Full Body Chills is a fiction podcast. Each episode is an original scary story, credited to a named writer and read by a narrator, with sound design and music. The stories are not true accounts, even when they are told in the first person. It comes from Audiochuck, the company behind Crime Junkie, and releases a new season each autumn, mostly in October.',
    whoFor: [
      'Horror and campfire-story fans who want a self-contained tale in one sitting',
      'True crime listeners looking for something spooky that is clearly made up',
      'Anyone who wants a seasonal October listen rather than a weekly show',
    ],
    faqs: [
      {
        q: 'Are the Full Body Chills stories real?',
        a: 'No. Full Body Chills is fiction. Every episode credits the writer who wrote the story and the actor who reads it, Apple Podcasts lists the show under Fiction, and the show buys stories from writers through an open submissions call on its website. Some early episodes are told in the first person, in the style of internet horror stories ("Why I Stopped Babysitting", "An Open Letter to My Best Friend"), which is why they can sound like real accounts.',
      },
      {
        q: 'Is Full Body Chills a true crime podcast?',
        a: 'No. It comes from Audiochuck, the company behind Crime Junkie, but it is a horror fiction anthology rather than a true crime show. If you want real cases from the same company, try Crime Junkie.',
      },
      {
        q: 'Who hosts Full Body Chills?',
        a: 'There is no single host. Ashley Flowers, who also hosts Crime Junkie, read every story in the first season (October 2019) and about half of season 2. Since then the stories have been read by a rotating cast of narrators, with Ashley Flowers returning for the odd episode, and recent seasons are produced by David Flowers.',
      },
      {
        q: 'When do new Full Body Chills episodes come out?',
        a: 'In seasons, mostly in October. Season 8 began in October 2026. A few seasons have run on into November or December, but there are no weekly episodes through the rest of the year.',
      },
    ],
    related: [
      { href: '/podcasts/crime-junkie', label: 'Crime Junkie (real cases from Audiochuck)' },
      { href: '/blog/podcasts-like-crime-junkie', label: 'Podcasts like Crime Junkie' },
    ],
  },

  // Sources: BBC programme page p0p967d9 and episode guide (six episodes,
  // credits, contributors), BBC Sounds brand page p0p967d9.
  'secret-devon-the-mcginty-mystery': {
    subtitle: 'BBC Radio Devon true crime and family history podcast',
    intro:
      'The McGinty Mystery is a six-part BBC Radio Devon podcast, released under the Secret Devon banner, in which journalist Emily Wood looks into the 1935 killing of her great-aunt Eva in London. Eva also used the name Eveline McGinty. The series asks whether the case could have reached Agatha Christie, whose novel Mrs McGinty\'s Dead came out in 1952. Episodes run about 15 to 19 minutes and the series is complete on BBC Sounds.',
    whoFor: [
      'Agatha Christie readers curious about where her plots came from',
      'Listeners who like family history and archive detective work',
      'Anyone who wants a short, complete series rather than an open-ended show',
    ],
    faqs: [
      {
        q: 'Is The McGinty Mystery a true story?',
        a: 'Yes. Eva, the presenter\'s great-aunt, was killed in London in 1935, and an inquest concluded that her boyfriend killed her and then took his own life. The Agatha Christie connection is the open question the series explores, not an established fact.',
      },
      {
        q: 'Where can I listen to Secret Devon: The McGinty Mystery?',
        a: 'On BBC Sounds, where all six episodes are available. It sits under BBC Radio Devon\'s Secret Devon programme.',
      },
      {
        q: 'Who appears in The McGinty Mystery?',
        a: 'Emily Wood presents and produces it. Contributors include Christie experts Dr Mark Aldridge and Laura Thompson, crime writers Jeremy Vine and Robert Thorogood, and forensic specialists and historians.',
      },
    ],
    related: [
      { href: '/blog/best-british-true-crime-podcasts', label: 'Best British true crime podcasts' },
      { href: '/country/UK', label: 'UK true crime podcasts' },
    ],
  },

  // Sources: RTÉ Documentary On One feed on Omny (trailer and episode 1 notes,
  // credits), RTÉ series page 50031, Apple Podcasts listing id1498583582.
  'poison-ink-rte': {
    subtitle: 'RTÉ Documentary On One podcast, 2026',
    intro:
      'Poison Ink is a four-part RTÉ Documentary On One podcast about two neighbouring families on a north Dublin estate who received anonymous poison-pen letters for five years. It is a true story, told mostly by the families themselves and hosted by writer Sarah Maria Griffin. Episode 1 came out on 20 November 2026, with new episodes weekly.',
    faqs: [
      {
        q: 'Is Poison Ink a true story?',
        a: 'Yes. It is a documentary series about a real campaign of anonymous letters sent to two families in north Dublin over five years. RTÉ notes that AI was used to voice the letters in episode 1; the families\' own accounts are their real voices.',
      },
      {
        q: 'How many episodes of Poison Ink are there?',
        a: 'Four, plus a trailer. Episode 1 was released on 20 November 2026 and RTÉ is publishing the rest weekly, so the last one is due on 11 December 2026.',
      },
      {
        q: 'Is this the same as the other podcasts called Poison Ink?',
        a: 'No. This page is about the RTÉ Documentary On One series hosted by Sarah Maria Griffin. There is at least one unrelated podcast with the same name, a politics show, which is not a true crime series.',
      },
    ],
    related: [
      { href: '/blog/best-irish-true-crime-podcasts', label: 'Best Irish true crime podcasts' },
      { href: '/podcasts/pirate-predator-rte', label: 'Pirate Predator, the previous Documentary On One series' },
    ],
  },

  // Sources: Wikipedia "Cold Justice" (TNT 2013, Oxygen from 2017, produced by
  // Dick Wolf), oxygen.com/cold-justice; Apple Podcasts searches for "Cold
  // Justice" (US and UK stores) and "Kelly Siegler" on 23 Nov 2026 found no
  // podcast of that name.
  'cold-justice': {
    notAPodcast: true,
    subtitle: 'Oxygen TV series — we found no official podcast',
    intro:
      'Cold Justice is a TV series, not a podcast. Former Harris County, Texas prosecutor Kelly Siegler and a team of investigators reopen unsolved murders with the help of local police. It began on TNT in 2013, moved to Oxygen in 2017 and is produced by Dick Wolf. When we checked Apple Podcasts in November 2026 there was no official Cold Justice podcast, so this page points Cold Justice viewers to podcasts that do similar work.',
    whoFor: [
      'Cold Justice viewers who want the same reopen-the-case approach in audio',
      'Listeners who like investigators and prosecutors working real cold cases',
    ],
    faqs: [
      {
        q: 'Is there a Cold Justice podcast?',
        a: 'Not an official one that we could find. Cold Justice is an Oxygen TV series. Searches of Apple Podcasts in November 2026 found no Cold Justice podcast, only other shows with similar names such as Relentless: The Fight for Cold Case Justice. Kelly Siegler has appeared as a guest on other podcasts, including Oxygen\'s Martinis & Murder.',
      },
      {
        q: 'What is Cold Justice about?',
        a: 'Kelly Siegler, a former prosecutor from Harris County, Texas, travels with a small team of investigators to towns where a murder has gone unsolved. With the local police\'s agreement they re-interview witnesses, look again at the evidence and try to build a case strong enough to put to a prosecutor.',
      },
      {
        q: 'What podcasts are like Cold Justice?',
        a: 'Crime Junkie Presents: Red Ball, where Ashley Flowers works through unsolved Indiana murders with the Indiana State Police, is the closest in spirit. Cold Case Files is the podcast from the long-running A&E TV series. For reporter-led cold cases, try The Trail Went Cold or Gina Barton\'s Unsolved.',
      },
    ],
    related: [
      { href: '/blog/best-cold-case-podcasts', label: 'Best cold case podcasts' },
      { href: '/category/cold-cases', label: 'Cold case podcasts' },
    ],
  },

  // Sources: the show's RSS feed on Omny (description, 23 episodes from 27 Jul
  // to 18 Nov 2026, Wednesday releases), RTÉ launch release of 29 Jul 2026,
  // RTÉ series page 45217, Apple Podcasts listing id6795121500.
  'unsolved-rte': {
    subtitle: 'RTÉ cold case podcast with Barry Cummins and Katja Mia',
    intro:
      'Unsolved is RTÉ\'s weekly Irish cold case podcast, presented by crime journalist Barry Cummins and 2FM presenter Katja Mia. Each case gets one to three episodes, told with the victim at the centre, and so far it has covered Arlene Arkinson, Raonaid Murray, Fiona Pender, Antoinette Smith, Annie McCarrick, Philip Cairns, Jo Jo Dullard, Trevor Deely, Deirdre Jacob and Baiba Saulite. New episodes come out on Wednesdays.',
    whoFor: [
      'Listeners who want Irish cases told by a reporter who has covered them for years',
      'Anyone following the disappearances of women in Leinster in the 1990s',
      'Cold case fans who prefer a respectful, victim-first approach',
    ],
    faqs: [
      {
        q: 'Who presents the RTÉ Unsolved podcast?',
        a: 'Barry Cummins, an RTÉ crime journalist with 30 years in radio, television and print, much of it on missing people, and Katja Mia, who presents 2FM Drive with Laura Fox.',
      },
      {
        q: 'When do new episodes of Unsolved come out?',
        a: 'Weekly, usually on Wednesday mornings, on the RTÉ Radio Player and podcast apps. It started on 27 July 2026 and is still going.',
      },
      {
        q: 'Is this the same as other podcasts called Unsolved?',
        a: 'No. This is RTÉ\'s Irish series with Barry Cummins and Katja Mia. It is unrelated to Gina Barton\'s US podcast Unsolved, to Unsolved Murders: True Crime Stories, and to the Unsolved Mysteries TV series.',
      },
    ],
    related: [
      { href: '/blog/best-irish-true-crime-podcasts', label: 'Best Irish true crime podcasts' },
      { href: '/blog/best-missing-persons-podcasts', label: 'Best missing persons podcasts' },
      { href: '/podcasts/unsolved-gina-barton', label: 'Unsolved (Gina Barton, USA Today) — a different show' },
    ],
  },
}

export function getProfileExtras(slug: string): ProfileExtras | null {
  return PODCAST_PROFILE_EXTRAS[slug] ?? null
}
