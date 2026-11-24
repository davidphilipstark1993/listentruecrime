// Hand-written editorial for /podcasts-like pages that earn real search demand.
// When a slug has an entry here, app/podcasts-like/[slug]/page.tsx swaps the
// automatic matches for these picks (in this order), the written intro, the
// comparison table and the FAQ below. Every other slug keeps the template.
//
// Rules for entries:
// - every pick slug must be a published podcast (the page drops any that are not);
// - listening links must be checked by hand (Apple links come from the iTunes
//   Search API and use the region-free podcasts.apple.com/podcast/id… form);
// - internal links must point at pages that exist;
// - case facts are written so they stay true: no "still unsolved" unless it is.

export interface EditorialPick {
  slug: string
  /** What the podcast investigates. */
  caseSummary: string
  /** How investigative the approach is. */
  approach: string
  /** One case over many episodes, or not. */
  format: string
  /** How it compares with the source podcast. */
  comparison: string
  /** Why it is worth your time. */
  whyListen: string
  /** Verified listening links. */
  listen: { label: string; href: string }[]
  /** Optional internal link to a case page or guide. */
  related?: { label: string; href: string }
  /** Short values for the comparison table. */
  table: { case: string; format: string; outcome: string }
}

export interface PodcastsLikeEditorial {
  /** Visible line under the H1. */
  subtitle: string
  /** Hero intro paragraph. */
  intro: string
  /** 40–60 word answer to "what podcasts are like X?", shown in a box and used in the FAQ. */
  quickAnswer: string
  /** "About the original" paragraphs (replace the generated narrative). */
  about: string[]
  /** What the picks were matched on. */
  criteria: string[]
  /** Comparison-table row for the source podcast. */
  sourceRow: { case: string; format: string; outcome: string }
  picks: EditorialPick[]
  /** Verified listening links for the source podcast. */
  sourceListen: { label: string; href: string }[]
  faqs: { q: string; a: string }[]
  /** Internal links placed first in "Keep exploring". */
  explore: { href: string; label: string }[]
  /** ISO date the editorial was last checked. */
  updated: string
}

const apple = (id: string) => ({ label: 'Apple Podcasts', href: `https://podcasts.apple.com/podcast/id${id}` })

export const PODCASTS_LIKE_EDITORIAL: Record<string, PodcastsLikeEditorial> = {
  'up-and-vanished': {
    updated: '2026-11-23',
    subtitle: 'Investigative podcasts about disappearances and unsolved cases',
    intro:
      'Up and Vanished works because a host takes one disappearance and stays with it, episode after episode, while the case is still live. ' +
      'These podcasts do the same. Each one follows a missing person or an unsolved case over a full season, with a reporter or filmmaker doing the legwork, and several helped push their case forward.',
    quickAnswer:
      'The best podcasts like Up and Vanished are Your Own Backyard, The Teacher\'s Pet, Cold, Bear Brook and Someone Knows Something. ' +
      'Like Payne Lindsey\'s show, each follows one disappearance or cold case across many episodes, with a host who reports the story as it unfolds rather than retelling a closed case.',
    about: [
      'Up and Vanished, from Payne Lindsey and Tenderfoot TV, began in 2016 as an investigation into the 2005 disappearance of Tara Grinstead, a teacher in Ocilla, Georgia. ' +
        'Two men were arrested in February 2017, while the season was still running. In 2022 a jury acquitted Ryan Duke of her murder but convicted him of concealing her death; Bo Dukes had already been convicted of concealing it.',
      'Later seasons followed the disappearance of Kristal Reisinger in Crestone, Colorado, the case of Ashley Loring HeavyRunner on the Blackfeet Reservation in Montana, and disappearances in Nome, Alaska. ' +
        'What carries through is the method: an outsider host, on-the-ground interviews, listener tips and a case that is still moving.',
    ],
    criteria: [
      'One case (or one case per season) followed across many episodes',
      'A host who does original reporting: interviews, records, site visits',
      'A disappearance, an unidentified victim or a case that stayed unresolved for years',
      'Something still at stake when the podcast was made',
    ],
    sourceRow: {
      case: 'Tara Grinstead (Georgia, 2005)',
      format: 'One case per season',
      outcome: 'Two arrests in 2017; no murder conviction',
    },
    sourceListen: [
      apple('1140596919'),
      { label: 'iHeart', href: 'https://www.iheart.com/podcast/270-up-and-vanished-27926281/' },
    ],
    picks: [
      {
        slug: 'your-own-backyard',
        caseSummary:
          'The disappearance of Kristin Smart, a 19-year-old Cal Poly student last seen walking home from a party in San Luis Obispo, California, in May 1996.',
        approach:
          'Very investigative. Chris Lambert, a local musician with no newsroom behind him, spent years interviewing people who had never spoken publicly about the case.',
        format: 'Serialised: one case from first episode to last, with update episodes as the case moved.',
        comparison:
          'The closest match on this list. An outsider host, a small community and a cold case that moved while the show ran: Paul Flores was arrested in April 2021 and convicted of first-degree murder in October 2022.',
        whyListen:
          'It is the clearest example of a podcast doing what Up and Vanished set out to do, and Lambert is careful to separate what he can prove from what he suspects.',
        listen: [apple('1480263708')],
        related: { label: 'The Kristin Smart case', href: '/cases/kristin-smart' },
        table: { case: 'Kristin Smart (California, 1996)', format: 'One case', outcome: 'Paul Flores convicted, 2022' },
      },
      {
        slug: 'the-teachers-pet',
        caseSummary:
          'The disappearance of Lynette Dawson from Sydney\'s Northern Beaches in January 1982, and the husband who said she had walked out on her family.',
        approach:
          'Very investigative. Journalist Hedley Thomas of The Australian went back through the original inquiries and tracked down former students and witnesses.',
        format: 'Serialised: one case, followed by update episodes through the trial.',
        comparison:
          'The same arc as Up and Vanished Season 1: a decades-old disappearance, a reporter reopening it and a prosecution that followed. Chris Dawson was convicted of Lynette\'s murder in August 2022.',
        whyListen:
          'Thomas is relentless with documents and interviews, and the series shows how much a cold case can change once people start talking.',
        listen: [apple('1385379989')],
        related: { label: 'The Lynette Dawson case', href: '/cases/lynette-dawson' },
        table: { case: 'Lynette Dawson (Sydney, 1982)', format: 'One case', outcome: 'Chris Dawson convicted, 2022' },
      },
      {
        slug: 'cold',
        caseSummary:
          'The 2009 disappearance of Susan Powell, a young mother from West Valley City, Utah, and the investigation into her husband, Josh Powell.',
        approach:
          'Document-driven. KSL reporter Dave Cawley built the series from police files, Susan\'s own journals and interviews with the people around the family.',
        format: 'Serialised: the first season covers Susan Powell from start to finish; the feed has since added seasons on other cases.',
        comparison:
          'Less real-time sleuthing than Up and Vanished and more forensic reconstruction. Susan has never been found, and the story ends in tragedy: Josh Powell killed himself and the couple\'s two sons in 2012.',
        whyListen:
          'The most thorough single-case reconstruction here. Be warned that it covers the deaths of children.',
        listen: [apple('1441595858')],
        table: { case: 'Susan Powell (Utah, 2009)', format: 'One case per season', outcome: 'Susan never found; no charges' },
      },
      {
        slug: 'bear-brook',
        caseSummary:
          'Four unidentified bodies found in barrels in Bear Brook State Park, Allenstown, New Hampshire, the first two discovered in 1985.',
        approach:
          'Highly investigative. NHPR reporter Jason Moon follows detectives and genetic genealogists as they put names to the victims and to the man responsible.',
        format: 'Serialised: one case across the first season, with later seasons from the same team.',
        comparison:
          'Up and Vanished starts with a named missing woman; Bear Brook starts with unnamed victims and works backwards. It is the pick if you want to understand how cold cases actually get solved now.',
        whyListen:
          'Clear, patient reporting on the DNA techniques that later cracked other cases, without losing sight of the women and children at the centre of it.',
        listen: [apple('1423306695')],
        related: { label: 'How genetic genealogy solves cold cases', href: '/blog/genetic-genealogy-cold-cases' },
        table: { case: 'Allenstown barrel victims (New Hampshire, 1985)', format: 'One case', outcome: 'Victims and killer identified' },
      },
      {
        slug: 'someone-knows-something',
        caseSummary:
          'A different Canadian cold case each season. Season 1 is the 1972 disappearance of five-year-old Adrien McNaughton on a family fishing trip in Ontario.',
        approach:
          'Very investigative. CBC filmmaker David Ridgen works alongside each family, records interviews as they happen and organises searches.',
        format: 'One case per season, so you can start with any season.',
        comparison:
          'The nearest in tone to Payne Lindsey: a filmmaker host who goes out looking, on tape, with the family beside him.',
        whyListen:
          'Every season is a complete investigation, and the show is unusually close to the families without becoming sentimental.',
        listen: [apple('1089216339')],
        table: { case: 'Adrien McNaughton (Ontario, 1972), then a new case each season', format: 'One case per season', outcome: 'Varies by season' },
      },
      {
        slug: 'in-the-dark',
        caseSummary:
          'Season 1 is the 1989 abduction of 11-year-old Jacob Wetterling in St. Joseph, Minnesota, and the investigation that failed to solve it for 27 years.',
        approach:
          'The most rigorous reporting here. Madeleine Baran and APM Reports (the show is now with The New Yorker) examine what the sheriff\'s office got wrong.',
        format: 'One investigation per season; Season 2 covers Curtis Flowers, tried six times for the same crime.',
        comparison:
          'Where Up and Vanished asks who did it, In the Dark asks why nobody found out. Danny Heinrich confessed in September 2016, just as the season launched.',
        whyListen:
          'If you like the investigation more than the mystery, this is the benchmark for accountability reporting in true crime.',
        listen: [apple('1148175292')],
        related: { label: 'The Curtis Flowers case', href: '/cases/curtis-flowers' },
        table: { case: 'Jacob Wetterling (Minnesota, 1989)', format: 'One case per season', outcome: 'Danny Heinrich confessed, 2016' },
      },
      {
        slug: 'missing-murdered-finding-cleo',
        caseSummary:
          'The search for Cleo Semaganis Nicotine, a Cree girl taken from her family in Saskatchewan during the Sixties Scoop, whose siblings grew up believing she had been killed.',
        approach:
          'Highly investigative. CBC journalist Connie Walker works with Cleo\'s brothers and sisters to trace records across Canada and the United States.',
        format: 'Serialised: one case. The same feed holds Walker\'s earlier season, Who Killed Alberta Williams?',
        comparison:
          'Up and Vanished\'s third season, on Ashley Loring HeavyRunner, covers similar ground on missing and murdered Indigenous women. Finding Cleo is more about the family than about suspects.',
        whyListen:
          'A missing-person investigation that also explains the policy that made Cleo disappear in the first place.',
        listen: [apple('1166556648')],
        related: { label: 'Missing and murdered Indigenous women', href: '/cases/missing-murdered-indigenous-women' },
        table: { case: 'Cleo Semaganis Nicotine (Saskatchewan, 1970s)', format: 'One case', outcome: 'Walker traces what happened' },
      },
      {
        slug: 'atlanta-monster',
        caseSummary:
          'The Atlanta child murders of 1979 to 1981, and whether Wayne Williams, convicted in 1982 of two adult murders, was responsible for the rest.',
        approach:
          'Investigative and archival. Payne Lindsey re-interviews people connected to the case, including Williams himself.',
        format: 'Serialised: one case across one season.',
        comparison:
          'Same host and same production company, so it sounds the most like Up and Vanished. The difference is that this is a case officials treated as closed, not a disappearance.',
        whyListen:
          'The obvious next listen if it is Lindsey\'s style you are after, and a serious look at a case many in Atlanta never accepted as solved.',
        listen: [apple('1324249769')],
        table: { case: 'Atlanta child murders (1979–81)', format: 'One case', outcome: 'Williams convicted of two murders; rest disputed' },
      },
      {
        slug: 'death-in-ice-valley',
        caseSummary:
          'The "Isdal Woman", whose burned body was found near Bergen, Norway, in 1970 with every label cut from her clothes.',
        approach:
          'Investigative and collaborative. BBC World Service and Norway\'s NRK commission new forensic tests and follow up tips sent in by listeners.',
        format: 'Serialised: one case across one season.',
        comparison:
          'There is no suspect to chase: the mystery is who she was. Listener tips feed into the reporting, much as they did on Up and Vanished.',
        whyListen:
          'A genuinely unresolved mystery told with care, and a change of scene from American small-town cases.',
        listen: [apple('1357695290')],
        table: { case: 'The Isdal Woman (Norway, 1970)', format: 'One case', outcome: 'Never conclusively identified' },
      },
    ],
    faqs: [
      {
        q: 'What podcasts are similar to Up and Vanished?',
        a: 'The best podcasts like Up and Vanished are Your Own Backyard, The Teacher\'s Pet, Cold, Bear Brook and Someone Knows Something. Like Payne Lindsey\'s show, each follows one disappearance or cold case across many episodes, with a host who reports the story as it unfolds rather than retelling a closed case.',
      },
      {
        q: 'Which podcasts helped solve a case, like Up and Vanished?',
        a: 'Your Own Backyard and The Teacher\'s Pet are the two clearest examples. Your Own Backyard brought new witnesses forward in the Kristin Smart case before Paul Flores was arrested in 2021 and convicted in 2022. The Teacher\'s Pet revived the Lynette Dawson case, and Chris Dawson was convicted of her murder in 2022.',
      },
      {
        q: 'What are the best missing persons investigation podcasts?',
        a: 'For podcasts that investigate a single disappearance over a whole season, start with Your Own Backyard (Kristin Smart), Cold (Susan Powell), Someone Knows Something (a Canadian case each season) and Missing & Murdered: Finding Cleo. Our missing persons guide covers more, including episodic shows.',
      },
      {
        q: 'What happened in the Tara Grinstead case?',
        a: 'Tara Grinstead disappeared from Ocilla, Georgia, in October 2005. Ryan Duke and Bo Dukes were arrested in February 2017, during Up and Vanished\'s first season. Bo Dukes was convicted of concealing her death; in 2022 Ryan Duke was acquitted of murder but convicted of concealing a death.',
      },
      {
        q: 'Is there another podcast by the Up and Vanished host?',
        a: 'Yes. Payne Lindsey also made Atlanta Monster, about the Atlanta child murders, through the same company, Tenderfoot TV. It is the closest in sound and style to Up and Vanished.',
      },
    ],
    explore: [
      { href: '/blog/best-missing-persons-podcasts', label: 'Best missing persons podcasts' },
      { href: '/blog/best-cold-case-podcasts', label: 'Best cold case podcasts' },
      { href: '/blog/best-investigative-journalism-podcasts', label: 'Best investigative journalism podcasts' },
      { href: '/blog/podcasts-like-serial', label: 'Podcasts like Serial' },
      { href: '/category/missing-persons', label: 'All missing persons podcasts' },
    ],
  },
}
