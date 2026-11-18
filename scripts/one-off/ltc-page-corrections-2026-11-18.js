// One-off, 18 Nov 2026: correct podcast pages whose text described the wrong show or case.
// Found when show makers replied to the 17 Nov outreach email. Every fact below comes from
// the show's own RSS feed (channel description and episode notes), stored here as rss_url.
// Dry run by default; pass --apply to write. Safe to re-run.
const fs = require('fs');
const path = require('path');
const env = Object.fromEntries(fs.readFileSync(path.join(__dirname, '../../.env.local'), 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '').replace(/\\n$/, '')]; }));
const { createClient } = require('../../node_modules/@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const APPLY = process.argv.includes('--apply');

const FIXES = {
  'dear-alana': {
    rss_url: 'https://feeds.megaphone.fm/TFT7108021376',
    image_url: 'https://megaphone.imgix.net/podcasts/fee8fe76-758f-11f1-95b9-bbe930ebc730/image/31581c000f741891fa4c7d1e25aec56e.jpg?ixlib=rails-4.3.1&max-w=3000&max-h=3000&fit=crop&auto=format,compress',
    description: "Host Simon Kent Fung explores the life of Alana Chen, a 24-year-old woman who disappeared from Boulder, Colorado in 2019. She left behind two dozen journals about her faith, her love of fashion and her dream of becoming a nun. At 14 she told her priest she was attracted to women and was told not to tell her parents; over the next seven years she secretly received conversion therapy, which her family believes played a part in what happened to her. Simon, who went through conversion therapy himself while trying to become a priest, sets out to understand her story. A Tenderfoot TV series and winner at the 2024 Ambie Awards. Contains references to suicide.",
    short_description: 'Alana Chen vanished from Boulder in 2019, leaving journals about faith, sexuality and years of secret conversion therapy. Simon Kent Fung, who went through it himself, investigates.',
    newsletter_worthy_summary: "Dear Alana, is a personal and often painful investigation: Simon Kent Fung follows Alana Chen's journals and her family's questions about the conversion therapy they believe shaped her fate. Contains references to suicide.",
    quick_verdict: 'Good if you want a personal investigation into faith and identity',
    host_name: 'Simon Kent Fung',
    case_types: ['Missing person', 'Religion'],
    format_type: 'Serialised',
    factual_style: 'Personal; investigative; sensitive',
    best_episode_to_start: 'Part 1: Mom, best heard in order',
    episode_count: '8 parts plus bonus episodes',
  },
  'devil-in-the-dorm': {
    rss_url: 'https://rss.art19.com/devil-in-the-dorm',
    description: "In late 2010 Larry Ray moved into his daughter's student housing at Sarah Lawrence College and began drawing her roommates into what has all the hallmarks of a cult. Over the decade that followed he extorted millions of dollars from vulnerable young adults through violence, psychological abuse and forced sex work. Narrated by actress and director Elisabeth Rohm, Law&Crime's six-part series draws on thousands of pages of transcripts, exhibits, audio and video from Ray's federal trial.",
    short_description: "Larry Ray moved into his daughter's Sarah Lawrence dorm and spent a decade controlling and exploiting her friends. Law&Crime's six-part series, narrated by Elisabeth Rohm.",
    newsletter_worthy_summary: "Devil in the Dorm tells the Sarah Lawrence cult story through the evidence from Larry Ray's federal trial. Hard listening on coercive control, built from court records rather than speculation.",
    quick_verdict: 'Good if cult and coercive-control cases interest you',
    host_name: 'Elisabeth Rohm (narrator)',
    case_types: ['Cult', 'Abuse', 'Courtroom'],
    factual_style: 'Serious; documentary; built on trial records',
    best_episode_to_start: 'Episode 1, best heard in order',
    episode_count: '6 episodes',
  },
  'murder-in-apartment-12': {
    rss_url: 'https://podcastfeeds.nbcnews.com/murder-in-apartment-12',
    description: "Nona Dirksmeyer was a 19-year-old beauty queen in Russellville, Arkansas, days from her 20th birthday, when she was murdered in her apartment. Police quickly decided their prime suspect was her boyfriend Kevin, who found her and whose bloody palm print was at the scene. Case closed? Not by a long shot. Dateline's Keith Morrison tells the story of three trials, two suspects and a small town where things are not always what they seem.",
    short_description: 'A 19-year-old beauty queen is murdered in her Arkansas apartment and police focus on the boyfriend who found her. Keith Morrison follows three trials and two suspects.',
    newsletter_worthy_summary: 'Murder in Apartment 12 is classic Dateline: Keith Morrison narrates a small-town Arkansas murder case that ran to three trials and two suspects.',
    quick_verdict: 'Good if you like Dateline-style courtroom twists',
    host_name: 'Keith Morrison',
    case_types: ['Murder', 'Courtroom'],
    best_episode_to_start: 'Episode 1, best heard in order',
    episode_count: '6 episodes',
  },
  'the-night-driver': {
    rss_url: 'https://www.omnycontent.com/d/playlist/2fb3740d-3436-44af-8cc0-a91900716aa5/d2b95fa8-a1ee-48a8-8b76-ac2a017e5593/09eeb73c-4daf-4d09-97b7-ac2a017ea0ad/podcast.rss',
    description: "In 2001 Janine Vaughan stepped into a red car in front of friends in Bathurst, New South Wales, and disappeared without a trace. Walkley Award-winning journalist Hedley Thomas, the reporter behind The Teacher's Pet, investigates her disappearance, the stalking she reported to police beforehand, and her sister Kylie's long fight for the truth in a town divided by rumour. From The Australian.",
    short_description: "Janine Vaughan vanished from Bathurst in 2001 after getting into a red car. Hedley Thomas of The Teacher's Pet investigates.",
    newsletter_worthy_summary: "The Night Driver brings Hedley Thomas's dogged, community-level reporting from The Teacher's Pet to a new case: a missing young woman, a stalker and a family who never stopped looking.",
    quick_verdict: 'Good for Australian cold case fans',
    host_name: 'Hedley Thomas',
    case_types: ['Missing person', 'Cold case', 'Stalking'],
    best_episode_to_start: 'Introducing The Night Driver, then Episode 1',
    episode_count: 'Limited series',
  },
  'trace-evidence': {
    rss_url: 'https://www.spreaker.com/show/3207798/episodes/feed',
    description: 'Trace Evidence is a weekly true crime podcast about unsolved cases, from murders to missing persons. Host Steven Pacheco takes one case at a time, works through the evidence and weighs up the theories around it, with update episodes when cases move forward.',
    short_description: 'Steven Pacheco takes one unsolved murder or disappearance a week and works through the evidence and the theories.',
    newsletter_worthy_summary: 'Trace Evidence is a dependable weekly cold-case show: one unsolved case per episode, evidence first, with a back catalogue of more than 250 episodes.',
    quick_verdict: 'Good if you want a steady supply of unsolved cases',
    host_name: 'Steven Pacheco',
    best_episode_to_start: 'Any case that interests you; episodes stand alone',
    episode_count: '250+',
  },
  'true-crime-and-cocktails': {
    rss_url: 'https://rss.art19.com/true-crime-and-cocktails',
    description: "Actor Lauren Ash (Superstore) and her friend Christy Oxborrow pour a drink and dig into true crime, from unsolved mysteries and suspicious deaths to serial killers and pop-culture crimes, with Christy leading the research. They call it a weekly true crime slumber party. The first season covered Netflix's Unsolved Mysteries; later seasons added Missing and Prosecutor Profiles series. New episodes every Tuesday.",
    short_description: 'Lauren Ash and Christy Oxborrow host a weekly true crime slumber party: unsolved mysteries, serial killers and pop-culture crimes, drink in hand.',
    newsletter_worthy_summary: "True Crime & Cocktails is light, friendly true crime from Lauren Ash and Christy Oxborrow, with Christy's research doing the heavy lifting. Easy company over a long run of episodes.",
    host_name: 'Lauren Ash and Christy Oxborrow',
    episode_count: '270+',
  },
  'i-could-murder-a-podcast': {
    rss_url: 'https://feeds.acast.com/public/shows/6593ed35c9ba1d0017e62624',
    description: 'Friends Tom, Ben and Dan dive into the darkest cases in true crime, from mass shootings and serial killers to unsolved mysteries, looking for the red flags along the way, with a little humour for light relief. The show began in 2020 with Tom and Ben, who grew up in Cambridgeshire, and now has more than 170 episodes.',
    short_description: 'Tom, Ben and Dan dig into serial killers, mass shootings and unsolved mysteries, with a bit of humour for light relief.',
    newsletter_worthy_summary: "I Could Murder a Podcast is a British friends-chat show that takes its cases seriously but doesn't mind a laugh. The hosts say the sound improves from series 2.",
    host_name: 'Tom, Ben and Dan',
    best_episode_to_start: 'Any case you are interested in; sound quality improves from series 2',
    episode_count: '170+',
  },
  'true-crime-france': {
    rss_url: 'https://anchor.fm/s/46988ca8/podcast/rss',
    description: 'An English-language podcast telling true crime stories from France. Host Deb, who lives in France, covers cases including the murder of Elodie Kulik, the disappearance of casino heiress Agnès Le Roux and the Josacine poisoning. Six episodes and an update were released in 2021.',
    short_description: 'True crime stories from France, told in English by host Deb: Elodie Kulik, Agnès Le Roux, the Josacine poisoning and more.',
    newsletter_worthy_summary: "True Crime France is a short English-language series on French cases most UK and US listeners won't know. Only six episodes, so it's a quick listen.",
    quick_verdict: 'Good if you want French cases told in English',
    host_name: 'Deb',
    episode_count: '6 episodes plus an update',
  },
  'conviction': {
    rss_url: 'https://www.rnz.co.nz/podcasts/acast/conviction-the-christchurch-civic-creche-case.rss',
    description: "In 1991 childcare worker Peter Ellis was jailed for ten years for the sexual abuse of more than a dozen children at the Christchurch Civic Creche. RNZ's podcast goes back through one of New Zealand's most notorious cases: how the first accusation surfaced, how the investigation grew, and whether Ellis was wrongly convicted or the children should be believed. Listeners are left to make up their own minds.",
    short_description: "Was childcare worker Peter Ellis wrongly convicted, or should the children of the Christchurch Civic Creche be believed? RNZ revisits New Zealand's most notorious abuse case.",
    newsletter_worthy_summary: "Conviction is RNZ's careful re-examination of the Christchurch Civic Creche case, setting out both sides of a conviction that still divides New Zealand.",
    quick_verdict: 'Good if contested convictions interest you',
    host_name: null,
    country: 'NZ',
    country_name: 'New Zealand',
    case_types: ['Child abuse', 'Wrongful conviction', 'Courtroom'],
    format_type: 'Serialised',
    best_episode_to_start: 'Introducing: Conviction, then in order',
    episode_count: '13 episodes',
  },
  'out-from-the-cold-searching-for-elaine': {
    rss_url: 'https://www.spreaker.com/show/6741299/episodes/feed',
    description: "In February 1980 Elaine Johnson, the eldest of five children, disappeared from Sydney's Sutherland Shire, and so did her friend Kerry Anne Joel. Neither has been seen since. Elaine's family moved to Australia from the UK as Ten Pound Poms, and for more than 40 years they have been searching for answers. This series from Happy Tuesday Productions follows their search, the police response over the decades, and an informant who came forward in 2024.",
    short_description: "Elaine Johnson and her friend Kerry Anne Joel vanished from Sydney's Sutherland Shire in 1980. Elaine's family has been searching for more than 40 years.",
    newsletter_worthy_summary: "Out from the Cold: Searching for Elaine follows a Sydney family's 40-year search for their sister, with new information surfacing during the series.",
    quick_verdict: 'Good for Australian cold case fans',
    country: 'AU',
    country_name: 'Australia',
    case_types: ['Missing person', 'Cold case'],
    best_episode_to_start: 'Introducing: Searching for Elaine, then in order',
    episode_count: '8 episodes',
  },
  'death-row-stories': {
    rss_url: 'https://anchor.fm/s/f7fa6174/podcast/rss',
    description: "Journalist and documentary director François Picard, who has more than 20 years' experience and whose most powerful reports have been about death row, explores the death penalty in the United States one case at a time: the crimes, the trials, the executions and the people on every side. Episodes are also published on YouTube.",
    short_description: 'Journalist François Picard tells the human stories behind the US death penalty, case by case.',
    newsletter_worthy_summary: "Death Row Stories is a reporter's podcast about capital punishment in the US, built on first-hand accounts from François Picard's years covering death row.",
    quick_verdict: 'Good if the death penalty debate interests you',
    host_name: 'François Picard',
    case_types: ['Murder', 'Death penalty'],
    episode_count: '40+',
  },
};

// Not true crime, or no such true crime podcast exists: take the page down (reversible).
const UNPUBLISH = {
  'blood-memory': 'page described an investigation that does not exist; the only show with this name is about inherited land and history',
  'the-detail': 'RNZ daily news podcast, not true crime',
  'crime-pays-but-botany-doesnt': 'botany and ecology podcast, not true crime',
};

(async () => {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN');
  let updated = 0, unpublished = 0;
  for (const [slug, fix] of Object.entries(FIXES)) {
    const { data, error } = await sb.from('podcasts').select('id,' + Object.keys(fix).join(',')).eq('slug', slug).single();
    if (error) { console.log('MISSING', slug, error.message); continue; }
    const changes = Object.fromEntries(Object.entries(fix).filter(([k, v]) => JSON.stringify(data[k]) !== JSON.stringify(v)));
    if (!Object.keys(changes).length) { console.log('ok     ', slug); continue; }
    console.log('update ', slug, Object.keys(changes).join(', '));
    if (APPLY) {
      const { error: e } = await sb.from('podcasts').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', data.id);
      if (e) { console.log('  FAILED', e.message); continue; }
    }
    updated++;
  }
  for (const [slug, why] of Object.entries(UNPUBLISH)) {
    const { data } = await sb.from('podcasts').select('id,is_published').eq('slug', slug).single();
    if (!data || !data.is_published) { console.log('ok     ', slug, '(already unpublished)'); continue; }
    console.log('unpub  ', slug, '-', why);
    if (APPLY) {
      const { error: e } = await sb.from('podcasts').update({ is_published: false, updated_at: new Date().toISOString() }).eq('id', data.id);
      if (e) { console.log('  FAILED', e.message); continue; }
    }
    unpublished++;
  }
  console.log(`${APPLY ? 'Updated' : 'Would update'} ${updated}, ${APPLY ? 'unpublished' : 'would unpublish'} ${unpublished}`);
})();
