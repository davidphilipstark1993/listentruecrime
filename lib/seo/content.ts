// ============================================================
// Static SEO content — category, country, platform page copy
// ============================================================

export interface PageSeoContent {
  h1: string
  // Short, standalone summary for <meta name="description"> — kept separate
  // from `intro` because intro[0] is on-page body copy (2-3 sentences) and
  // is too long for a meta description on its own.
  metaDescription?: string
  intro: string[]
  faqs: { q: string; a: string }[]
  relatedLinks?: { href: string; label: string }[]
}

// ── Category pages ──────────────────────────────────────────

export const CATEGORY_SEO: Record<string, PageSeoContent> = {
  'cold-cases': {
    h1: 'Best Cold Case Podcasts',
    intro: [
      'Cold case podcasts dive into mysteries that have stumped investigators for decades — unsolved murders, vanished victims, and killers who evaded justice. These shows pair obsessive research with compelling storytelling to give long-ignored cases a fresh hearing.',
      'The best cold case podcasts combine original document sourcing, interviews with surviving witnesses, and forensic analysis to build the kind of detailed picture that professional investigators sometimes miss. Many have directly contributed to cases being reopened.',
    ],
    faqs: [
      {
        q: 'What makes a cold case podcast worth listening to?',
        a: 'The best cold case podcasts are defined by original research rather than rehashing news stories. Look for shows that interview primary sources, obtain police documents via FOIA requests, and bring new evidence to light. Producers who have a personal connection to their cases often deliver the most compelling results.',
      },
      {
        q: 'Which cold case podcast has the best storytelling?',
        a: 'Serial (Season 1) remains the gold standard for cold case storytelling, combining investigative rigour with a personal narrator-led format. Atlanta Monster, In the Dark, and Your Own Backyard are also consistently praised for their narrative craft and original reporting.',
      },
      {
        q: 'Do cold case podcasts ever solve crimes?',
        a: 'Yes — several cold case podcasts have directly contributed to investigations being reopened or suspects being charged. Your Own Backyard led to new leads in the Kristin Smart case, and In the Dark\'s reporting on the Curtis Flowers case resulted in charges being dropped after six mistrials.',
      },
      {
        q: 'How often are new cold case podcast episodes released?',
        a: 'Most cold case podcasts are serialized, meaning episodes are released weekly during an active season covering one case. Some shows are fully produced before release, so all episodes drop at once for a binge-worthy experience.',
      },
      {
        q: 'Are cold case podcasts suitable for sensitive listeners?',
        a: 'Cold case podcasts often contain graphic descriptions of crimes and their impact on victims\' families. Most responsible productions include content warnings at the start of episodes. If you are sensitive to descriptions of violence or death, check reviews before starting a new show.',
      },
    ],
    relatedLinks: [
      { href: '/category/missing-persons', label: 'Missing Persons Podcasts' },
      { href: '/category/investigative', label: 'Investigative Podcasts' },
      { href: '/category/courtroom', label: 'Courtroom Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },

  'missing-persons': {
    h1: 'Best Missing Persons Podcasts',
    intro: [
      'Missing persons podcasts investigate the disappearances that shook communities — cases where someone walked out the door and never came home. These shows give a voice to the voiceless, amplify tip lines, and pressure law enforcement to keep looking.',
      'Unlike murder cases where a body confirms the worst, missing persons cases carry a particular psychological weight — the absence of answers that haunts families for years. The best missing persons podcasts treat victims with dignity while relentlessly pursuing the truth.',
    ],
    faqs: [
      {
        q: 'What are the best missing persons podcasts to start with?',
        a: 'Your Own Backyard (covering Kristin Smart), Up and Vanished (covering Tara Grinstead), and Casefile\'s episodes on missing persons cases are widely considered among the best. Each brings serious investigative reporting to long-unsolved disappearances.',
      },
      {
        q: 'Do missing persons podcasts help find people?',
        a: 'Some do. Your Own Backyard generated enormous public attention that contributed to new leads and ultimately an arrest in the Kristin Smart case. Many shows partner with tip lines and advocacy organisations to turn listener engagement into actionable information.',
      },
      {
        q: 'How do podcast hosts find missing persons cases to cover?',
        a: 'Most hosts start with cases that are under-reported or where families are actively seeking help. Some receive tip-offs from listeners or victims\' families who want more attention on their cases. FOIA requests, court documents, and family interviews form the backbone of original reporting.',
      },
      {
        q: 'Are missing persons podcasts factually accurate?',
        a: 'Quality varies significantly. The best shows verify all facts, present multiple perspectives, and include corrections where needed. Always look for shows that cite their sources and acknowledge the limits of what is known.',
      },
      {
        q: 'What is the most listened-to missing persons podcast?',
        a: 'Up and Vanished by Payne Lindsey is one of the most downloaded missing persons podcasts, with tens of millions of downloads. It covers the disappearance of high school teacher Tara Grinstead in Georgia and was instrumental in breaking the case open.',
      },
    ],
    relatedLinks: [
      { href: '/category/cold-cases', label: 'Cold Case Podcasts' },
      { href: '/category/investigative', label: 'Investigative Podcasts' },
      { href: '/country/US', label: 'American True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },

  'investigative': {
    h1: 'Best Investigative True Crime Podcasts',
    intro: [
      'Investigative true crime podcasts do what great journalism has always done — they hold power to account. These shows go beyond surface-level reporting to interview sources nobody else could reach, obtain documents nobody thought to request, and ask questions that make the powerful uncomfortable.',
      'The genre has produced some of podcasting\'s most significant cultural moments, from Serial\'s influence on a real criminal case to In the Dark\'s pressure on the US justice system. These are the podcasts that change things.',
    ],
    faqs: [
      {
        q: 'What is the best investigative podcast of all time?',
        a: 'Serial Season 1 is widely regarded as the most important investigative podcast ever made, both for its storytelling and its cultural impact. In the Dark (APM Reports) is considered the most rigorous in terms of investigative journalism, having directly impacted a murder case that went through six mistrials.',
      },
      {
        q: 'How are investigative podcasts different from regular true crime podcasts?',
        a: 'Investigative podcasts conduct original reporting — they file FOIA requests, interview primary sources, and develop new evidence. Standard true crime podcasts typically retell cases using existing news reports and court records. The distinction matters because investigative shows can actually change outcomes.',
      },
      {
        q: 'Which investigative podcast has won the most awards?',
        a: 'In the Dark (APM Reports) has won multiple Peabody Awards and du Pont-Columbia Awards. Serial was the first podcast to win a Peabody Award. Both S-Town and This American Life\'s investigative work have also received major journalism recognition.',
      },
      {
        q: 'Are investigative podcasts suitable for people who don\'t normally listen to true crime?',
        a: 'Yes — many investigative podcasts are as concerned with systemic issues (wrongful convictions, police failures, racial injustice) as with individual crimes. If you\'re interested in accountability journalism, these shows offer that alongside compelling personal narratives.',
      },
      {
        q: 'Do investigative podcasts ever face legal challenges?',
        a: 'Occasionally. High-profile investigative reporting can attract defamation threats from people who dispute the coverage. Reputable producers have legal review built into their process and stand behind factual, well-sourced reporting.',
      },
    ],
    relatedLinks: [
      { href: '/category/cold-cases', label: 'Cold Case Podcasts' },
      { href: '/category/courtroom', label: 'Courtroom Podcasts' },
      { href: '/category/missing-persons', label: 'Missing Persons Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },

  'courtroom': {
    h1: 'Best Courtroom & Trial True Crime Podcasts',
    intro: [
      'Courtroom and trial podcasts explore the machinery of justice — from opening arguments to verdict, from wrongful conviction to exoneration. These shows illuminate how the legal system works, where it fails, and the human stories at the centre of every case.',
      'The best courtroom podcasts translate dense legal procedure into gripping narrative without losing accuracy. They shine a light on wrongful convictions, prosecutorial misconduct, and the gap between legal truth and actual truth.',
    ],
    faqs: [
      {
        q: 'What are the best courtroom podcasts?',
        a: 'Undisclosed, Wrongful Conviction with Jason Flom, and Court Junkie are among the most respected courtroom-focused podcasts. For dramatic trial coverage, Your Own Backyard and In the Dark both contain extensive trial reporting alongside their investigative work.',
      },
      {
        q: 'What is the difference between a courtroom podcast and a true crime podcast?',
        a: 'Courtroom podcasts focus specifically on legal proceedings — the mechanics of trials, the roles of lawyers and judges, evidence presentation, and verdicts. True crime is a broader genre. Many true crime podcasts include courtroom elements, but courtroom podcasts make legal process their central subject.',
      },
      {
        q: 'Do wrongful conviction podcasts actually help innocent people?',
        a: 'Several have. Undisclosed\'s coverage has contributed to post-conviction reviews. The Innocence Project regularly partners with media including podcasts to bring attention to cases that deserve re-examination. Sustained public attention is one of the most powerful tools for exonerating the wrongfully convicted.',
      },
      {
        q: 'Are courtroom podcasts legally accurate?',
        a: 'The best shows in this genre include legal experts as hosts or regular contributors. Shows like Prosecutors in the headlines bring practising lawyers\' perspectives. Always cross-reference major claims against other sources, as some podcasts advocate for specific outcomes rather than presenting balanced analysis.',
      },
      {
        q: 'How do I find podcasts about a specific trial?',
        a: 'Use our search and browse features to filter by case type. Many high-profile trials — OJ Simpson, the Casey Anthony case, the Murdaugh murders — have multiple dedicated podcast series. Searching the defendant\'s name will usually surface the most relevant shows.',
      },
    ],
    relatedLinks: [
      { href: '/category/investigative', label: 'Investigative Podcasts' },
      { href: '/category/cold-cases', label: 'Cold Case Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },

  'fraud-scams': {
    h1: 'Best Fraud & Scam True Crime Podcasts',
    intro: [
      'Fraud and scam podcasts investigate the con artists, Ponzi schemers, and corporate criminals who cause devastation without ever picking up a weapon. These shows are as gripping as any murder mystery — and often more financially educational.',
      'From Elizabeth Holmes and Theranos to Anna Delvey and Bernie Madoff, the most audacious frauds have inspired some of the best podcast storytelling. These shows ask how smart people get conned, and how fraudsters keep going until they can\'t.',
    ],
    faqs: [
      {
        q: 'What are the best fraud and financial crime podcasts?',
        a: 'Scam Goddess, Bad Blood (on Theranos), Ponzi Supernova, and The Dropout are highly regarded in this space. For white-collar crime more broadly, American Scandal covers a wide range of corporate fraud and political corruption cases.',
      },
      {
        q: 'Why are people so fascinated by fraud podcasts?',
        a: 'Fraud stories tap into deep psychological questions — how do con artists identify and exploit trust? What makes someone believable? The answer is usually a combination of charisma, ambiguity, and the mark\'s own hope or greed. These are universal vulnerabilities, which makes fraud stories feel personally relevant.',
      },
      {
        q: 'Are fraud podcasts educational?',
        a: 'Many are. The best fraud podcasts explain the mechanics of how schemes work, the red flags victims missed, and the structural conditions (regulatory gaps, cultural excess) that allowed frauds to grow. Understanding how fraud works is one of the best defences against it.',
      },
      {
        q: 'What\'s the difference between a fraud podcast and a true crime podcast?',
        a: 'Fraud podcasts focus on financial crime and deception rather than violent crime. The perpetrators are often charming and educated, and the harm (though real) is typically financial rather than physical. The genre overlaps significantly with business journalism and investigative reporting.',
      },
      {
        q: 'Which fraud scandal has generated the most podcast content?',
        a: 'Elizabeth Holmes and Theranos have inspired more podcast content than almost any other fraud case, including The Dropout (which became an ABC series), Bad Blood (based on John Carreyrou\'s book), and several documentary podcasts. The Fyre Festival is a close second.',
      },
    ],
    relatedLinks: [
      { href: '/category/investigative', label: 'Investigative Podcasts' },
      { href: '/category/courtroom', label: 'Courtroom Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },

  'uk-crime': {
    h1: 'Best UK True Crime Podcasts',
    intro: [
      'UK true crime podcasts bring British perspective and expertise to some of the country\'s most disturbing and fascinating cases — from Victorian murders to contemporary gang crime, from miscarriages of justice to serial killers who hid in plain sight.',
      'The best UK true crime podcasts benefit from access to British court records, police sources, and a journalism tradition that takes a particular interest in criminal justice reform. Many have broken significant new ground on cases that the mainstream media had long since forgotten.',
    ],
    faqs: [
      {
        q: 'What are the best UK true crime podcasts?',
        a: 'Casefile (while Australian, covers many UK cases), Real Crimes, Crime & Punishment UK, and UK True Crime are among the most popular British-focused shows. The British True Crime Club podcast is specifically focused on English cases. Many BBC Sounds productions also offer high-quality UK crime coverage.',
      },
      {
        q: 'Do UK true crime podcasts cover historical cases?',
        a: 'Yes — UK crime podcasts frequently revisit Victorian and Edwardian cases that remain culturally significant. Jack the Ripper, Dr Crippen, the Moors Murders, and other historical crimes have all generated substantial podcast coverage that brings modern forensic and psychological analysis to bear.',
      },
      {
        q: 'Are there UK podcasts about wrongful convictions?',
        a: 'Several UK podcasts focus on miscarriages of justice, including coverage of cases like the Birmingham Six, the Guildford Four, and more recent wrongful convictions. The Criminal Cases Review Commission (CCRC) has cases that feature in several shows.',
      },
      {
        q: 'What makes UK true crime podcasts different from American ones?',
        a: 'UK podcasts often reflect a different relationship with crime reporting — less sensationalism, more concern with the systemic issues (policing, prosecution, incarceration) behind individual cases. The UK also has distinct laws around reporting active cases, which shapes what shows can say.',
      },
      {
        q: 'Where can I listen to UK true crime podcasts?',
        a: 'All major platforms carry UK true crime podcasts, including Spotify, Apple Podcasts, BBC Sounds, and Audible. Some shows are UK-exclusive on BBC Sounds but most are available globally on standard podcast apps.',
      },
    ],
    relatedLinks: [
      { href: '/country/UK', label: 'All UK Podcasts' },
      { href: '/country/AU', label: 'Australian True Crime Podcasts' },
      { href: '/country/US', label: 'American True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },

  'australian-crime': {
    h1: 'Best Australian True Crime Podcasts',
    intro: [
      'Australian true crime podcasts have produced some of the most compelling shows in the global genre. From the bush to the suburbs, Australian crime stories carry a distinctive atmosphere — isolation, frontier justice, and communities where everyone knows everyone but secrets still fester.',
      'Shows like Casefile, Teacher\'s Pet, and Who the Hell is Hamish? have put Australian true crime on the global map. The country\'s unique legal environment, its colonial history, and its particular brand of investigative journalism have created a fertile landscape for the genre.',
    ],
    faqs: [
      {
        q: 'What are the best Australian true crime podcasts?',
        a: 'Casefile True Crime is the most downloaded Australian true crime podcast globally. Teacher\'s Pet (The Australian newspaper) is considered one of the finest single-season investigative podcasts ever made. Who the Hell is Hamish?, The Teacher\'s Pet, and Bowraville are also essential Australian listening.',
      },
      {
        q: 'Why are Australian true crime podcasts so popular internationally?',
        a: 'Australian shows like Casefile combine high production values, thorough research, and a calm, factual presentation style that has broad international appeal. The Australian media landscape has also produced some genuinely world-class investigative journalism that translates well to audio.',
      },
      {
        q: 'Is Casefile an Australian podcast?',
        a: 'Yes — Casefile is hosted and produced by an anonymous Australian host known only as "Casey". The show covers cases from around the world but is produced in Australia and has a distinctly Australian sensibility in its measured, factual approach.',
      },
      {
        q: 'What Australian cases have been covered extensively in podcasts?',
        a: 'The Lyn Dawson case (Teacher\'s Pet), the Bowraville murders, the Ivan Milat backpacker murders, Lindy Chamberlain and the dingo case, and the disappearance of the Beaumont children have all received extensive podcast coverage. Australia\'s true crime community takes particular interest in miscarriages of justice.',
      },
      {
        q: 'Are Australian true crime podcasts available outside Australia?',
        a: 'Yes — Australian podcasts are available globally on Spotify, Apple Podcasts, and other major platforms. Some ABC podcasts may have geographic restrictions for certain content, but the majority of Australian true crime shows are freely accessible worldwide.',
      },
    ],
    relatedLinks: [
      { href: '/country/AU', label: 'All Australian Podcasts' },
      { href: '/country/UK', label: 'UK True Crime Podcasts' },
      { href: '/country/US', label: 'American True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },

  'serial-killers': {
    h1: 'Best Serial Killer Podcasts',
    intro: [
      'Serial killer podcasts explore the darkest corners of human psychology — the minds of men and women who killed repeatedly, often evading detection for years or decades. These shows go beyond the crime itself to ask the harder question: how do people become capable of this?',
      'The best serial killer podcasts balance forensic detail with psychological insight, treating victims as human beings rather than statistics. From Ted Bundy and BTK to lesser-known offenders whose stories have never been told properly, this genre continues to attract some of the strongest true crime storytelling.',
    ],
    faqs: [
      {
        q: 'What are the best serial killer podcasts?',
        a: 'My Favorite Murder, Casefile, Serial Killers (Parcast), Sword and Scale, and Killer Psyche are among the most listened-to serial killer podcasts. For more psychological depth, Criminal Minds (not the TV show) and Criminology both explore the psychology behind serial offending alongside case details.',
      },
      {
        q: 'Why are serial killer podcasts so popular?',
        a: 'Serial killer cases combine multiple compelling elements: the puzzle of why someone kills, the investigation, the forensic evidence, the mistakes that allowed them to continue, and the eventual capture. They also tend to span years or decades, giving hosts rich material to work with. Research consistently shows that women make up a majority of true crime podcast audiences, partly because understanding predatory behaviour feels protective.',
      },
      {
        q: 'Are serial killer podcasts psychologically harmful to listen to?',
        a: 'For most listeners, no — provided you take breaks and pay attention to how you feel. Some people find extended exposure to graphic content affects their mood or sense of safety. If you notice anxiety or intrusive thoughts, it\'s worth stepping back. The best shows include content warnings and approach their subject with appropriate gravity.',
      },
      {
        q: 'Do serial killer podcasts accurately represent the psychology of offenders?',
        a: 'Quality varies widely. The best shows consult with forensic psychologists and criminologists, and are careful to distinguish between established research and speculation. Be cautious of shows that over-rely on pop psychology tropes or treat profiling as more scientifically certain than it actually is.',
      },
      {
        q: 'What\'s the difference between a serial killer podcast and a general true crime podcast?',
        a: 'Serial killer podcasts specifically focus on offenders who commit multiple murders, often with a psychological dimension that explores motive, method, and the failures that allowed them to continue. General true crime podcasts cover a wider range — single murders, fraud, missing persons, and systemic injustice. Many shows blur the line by covering serial killers within a broader true crime format.',
      },
    ],
    relatedLinks: [
      { href: '/category/cold-cases', label: 'Cold Case Podcasts' },
      { href: '/category/investigative', label: 'Investigative Podcasts' },
      { href: '/category/missing-persons', label: 'Missing Persons Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },

  'binge-worthy': {
    h1: 'Best Binge-Worthy True Crime Podcasts',
    intro: [
      'Binge-worthy true crime podcasts are the ones you start on a Friday and finish by Sunday — serialized stories with the narrative pull of a thriller, where every episode ends with you immediately pressing play on the next.',
      'These shows are built for momentum. Each episode reveals a new layer, introduces a new suspect, or upends what you thought you knew. The binge factor is our community\'s highest-rated dimension, and the podcasts on this page score highest across our listener base.',
    ],
    faqs: [
      {
        q: 'What are the most binge-worthy true crime podcasts?',
        a: 'Serial, Crime Junkie, Casefile, Teacher\'s Pet, and Dr Death are among the most consistently binge-listened podcasts in the genre. Serialized shows covering a single case tend to score highest for binge factor because the narrative builds across episodes rather than resetting each week.',
      },
      {
        q: 'What makes a true crime podcast binge-worthy?',
        a: 'Binge-worthiness comes from narrative momentum — each episode should answer some questions while raising new ones. Strong character development (of victims, suspects, and investigators), unexpected reveals, and a host who creates genuine suspense all contribute. Short episode run times also help.',
      },
      {
        q: 'Should I start with a serialized or episodic podcast?',
        a: 'For maximum binge potential, start with a serialized show — one season, one case, full narrative arc. Serial Season 1 is the classic choice. If you prefer variety or want to listen casually without commitment, episodic shows like Crime Junkie deliver new cases each week.',
      },
      {
        q: 'Are binge-worthy podcasts appropriate for daily listening?',
        a: 'That depends entirely on you. Some listeners find that daily true crime exposure affects their mood or outlook. Others treat it like any engaging drama. Pay attention to how you feel and build in breaks if content about crime and suffering starts to weigh heavily.',
      },
      {
        q: 'What is a "binge factor" score?',
        a: 'Our binge factor score (1–10) reflects community ratings on how compelling and addictive a podcast feels during listening. A high binge factor means listeners consistently reported feeling pulled to continue to the next episode immediately rather than stopping at natural pause points.',
      },
    ],
    relatedLinks: [
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
      { href: '/category/cold-cases', label: 'Cold Case Podcasts' },
      { href: '/category/missing-persons', label: 'Missing Persons Podcasts' },
      { href: '/category/investigative', label: 'Investigative Podcasts' },
    ],
  },
}

// ── Country pages ────────────────────────────────────────────

export const COUNTRY_SEO: Record<string, PageSeoContent> = {
  US: {
    h1: 'Best American True Crime Podcasts',
    metaDescription: 'The best American true crime podcasts, expert-reviewed and community-rated, from NPR classics like Serial to the latest investigative hits.',
    intro: [
      'American true crime podcasts form the backbone of the global genre. From the NPR-produced Serial that launched a podcast revolution to the grassroots investigations that have reopened cold cases, the US produces more true crime content than any other country — and some of the finest.',
      'American crime podcasts reflect the country\'s complex relationship with justice — a system capable of both extraordinary dedication and extraordinary failure. The best American shows use individual cases to explore larger systemic questions about race, policing, and the gap between law and justice.',
    ],
    faqs: [
      {
        q: 'What are the best American true crime podcasts?',
        a: 'Serial, Crime Junkie, Sword and Scale, My Favorite Murder, Your Own Backyard, and In the Dark are among the most acclaimed American true crime podcasts. NPR and Wondery have both produced acclaimed crime podcasts from their respective journalistic and commercial traditions.',
      },
      {
        q: 'Why does America produce so many true crime podcasts?',
        a: 'The US has a strong tradition of investigative journalism, open public records laws (FOIA), and a culture fascinated by crime and justice. The country also has a disproportionately high crime rate and a complex, highly visible criminal justice system that generates constant material for storytellers.',
      },
      {
        q: 'Which American true crime podcast has been most influential?',
        a: 'Serial (WBEZ/This American Life) is the most influential American true crime podcast — it essentially created the modern podcast audience. In the Dark (APM Reports) is considered the most journalistically impactful, contributing to the overturning of a murder conviction.',
      },
      {
        q: 'Are American true crime podcasts available in the UK and Australia?',
        a: 'Yes — virtually all American true crime podcasts are available globally on Spotify, Apple Podcasts, and other platforms. Some NPR-produced content may have restrictions for certain premium features, but the shows themselves are freely available.',
      },
      {
        q: 'Do American podcasts cover international cases?',
        a: 'Many do. Shows like Crime Junkie, Casefile, and Sword and Scale regularly cover international cases including UK, Australian, and European crimes. Some American podcasts specialise in specific regions or case types rather than being geographically restricted.',
      },
    ],
    relatedLinks: [
      { href: '/country/UK', label: 'UK True Crime Podcasts' },
      { href: '/country/AU', label: 'Australian True Crime Podcasts' },
      { href: '/country/CA', label: 'Canadian True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  UK: {
    h1: 'Best UK True Crime Podcasts',
    metaDescription: 'The best UK true crime podcasts, expert-reviewed and community-rated, covering everything from Victorian murders to modern miscarriages of justice.',
    intro: [
      'UK true crime podcasts bring British perspective and journalistic tradition to some of the country\'s most compelling criminal cases. From Victorian murders to contemporary gang crime, British podcasters approach their subjects with a distinctive sensibility — measured, detailed, and attentive to the systemic failures that allow crime to happen.',
      'The UK true crime scene has produced internationally acclaimed shows that compete with the best from the US and Australia. British cases carry their own particular atmosphere — tightly-knit communities, infamous miscarriages of justice, and a legal system with its own distinctive rhythms.',
    ],
    faqs: [
      {
        q: 'What are the best UK true crime podcasts?',
        a: 'Real Crimes, Crime & Punishment UK, The British True Crime Club, and Bad People are among the most listened-to UK-produced true crime podcasts. BBC Sounds has also produced acclaimed documentary podcasts including Untold: The Daniel Morgan Murder, which became a major public inquiry.',
      },
      {
        q: 'Are UK true crime podcasts different from American ones?',
        a: 'UK shows typically reflect a different relationship with crime journalism — less sensationalism, more concern with systemic issues, and a different legal environment that restricts what can be said about active cases. UK podcasters also have access to distinctly British criminal records, court files, and sources.',
      },
      {
        q: 'What famous UK cases have been covered in podcasts?',
        a: 'Jack the Ripper, the Yorkshire Ripper, the Moors Murders, Harold Shipman, the M25 Murders, the Daniel Morgan case, and the Beauchamp Place murder of Jill Dando have all received extensive UK podcast coverage. Miscarriages of justice — the Birmingham Six, the Guildford Four — are also frequently revisited.',
      },
      {
        q: 'Do UK true crime podcasts cover international cases?',
        a: 'Many UK podcasters cover cases from around the world, particularly high-profile American and Australian cases. Some shows focus exclusively on British cases, while others take a global approach. The best indicators are the show\'s description and the host\'s stated focus.',
      },
      {
        q: 'Where can I listen to UK true crime podcasts?',
        a: 'Spotify, Apple Podcasts, and BBC Sounds are the main platforms. BBC Sounds content is sometimes geo-restricted outside the UK, but most independent UK true crime podcasts are available globally. Amazon Music and Audible also carry a significant selection.',
      },
    ],
    relatedLinks: [
      { href: '/category/uk-crime', label: 'UK Crime Category' },
      { href: '/country/AU', label: 'Australian True Crime Podcasts' },
      { href: '/country/US', label: 'American True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  AU: {
    h1: 'Best Australian True Crime Podcasts',
    metaDescription: 'The best Australian true crime podcasts, expert-reviewed and community-rated, including award-winning shows like Casefile and Teachers Pet.',
    intro: [
      'Australia has produced some of the world\'s finest true crime podcasts, with shows like Casefile and Teacher\'s Pet earning global audiences and major awards. Australian crime stories carry a distinctive atmosphere — the country\'s unique geography, colonial history, and tight-knit communities create the conditions for cases that feel both intimate and vast.',
      'The Australian true crime podcast scene is defined by rigorous research and a commitment to justice. Several Australian shows have contributed directly to cases being reopened, charges being brought, and families finally getting answers after decades of silence.',
    ],
    faqs: [
      {
        q: 'What are the best Australian true crime podcasts?',
        a: 'Casefile True Crime, Teacher\'s Pet, Who the Hell is Hamish?, Bowraville, and The Australian Cold Case are among the most acclaimed Australian true crime podcasts. Many have been recognised with international awards and have driven real-world outcomes in the cases they cover.',
      },
      {
        q: 'Is Casefile the best Australian true crime podcast?',
        a: 'Casefile is the most downloaded Australian true crime podcast and is widely regarded as one of the best in the genre globally. Its calm, factual presentation, thorough research, and consistent release schedule have built a loyal international audience. Teacher\'s Pet, however, is frequently cited as the finest single Australian investigative podcast.',
      },
      {
        q: 'What are the most famous Australian crime cases covered in podcasts?',
        a: 'The disappearance of Lyn Dawson (Teacher\'s Pet), the Bowraville murders, Ivan Milat\'s backpacker killings, the Beaumont children disappearance, the Mark Stover murder, and the Easey Street murders have all received extensive podcast coverage.',
      },
      {
        q: 'Do Australian true crime podcasts cover cases outside Australia?',
        a: 'Casefile covers cases globally, including many from the US, UK, and Europe. Other Australian shows focus exclusively on domestic cases. The description of each show will make this clear — look for shows that specify "Australian cases" if you want exclusively local content.',
      },
      {
        q: 'Are Australian true crime podcasts available globally?',
        a: 'Yes — Casefile, Teacher\'s Pet, and other major Australian productions are available globally on Spotify, Apple Podcasts, and similar platforms. Some ABC Podcasts content may have geographic restrictions, but independent productions are almost always freely available worldwide.',
      },
    ],
    relatedLinks: [
      { href: '/category/australian-crime', label: 'Australian Crime Category' },
      { href: '/country/UK', label: 'UK True Crime Podcasts' },
      { href: '/country/US', label: 'American True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  CA: {
    h1: 'Best Canadian True Crime Podcasts',
    metaDescription: 'The best Canadian true crime podcasts, expert-reviewed and community-rated, covering cold cases and the missing and murdered Indigenous women crisis.',
    intro: [
      'Canadian true crime podcasts explore a country often seen as peaceful but with its own profound criminal history — serial killers, Indigenous missing and murdered women, and cold cases spanning vast, remote landscapes. Canadian shows often bring a nuanced social perspective that connects individual crimes to systemic issues.',
      'The Canadian true crime podcast community is growing rapidly, with a particular focus on the ongoing crisis of missing and murdered Indigenous women and girls (MMIWG), historic cold cases, and the country\'s unique legal environment.',
    ],
    faqs: [
      {
        q: 'What are the best Canadian true crime podcasts?',
        a: 'True Crime Canada, Canadian True Crime, Unresolved, and Cold, a CBC podcast, are among the most respected Canadian true crime productions. CBC has also produced several acclaimed documentary podcasts covering major Canadian cases.',
      },
      {
        q: 'Do Canadian podcasts cover the MMIWG crisis?',
        a: 'Several Canadian true crime podcasts focus specifically on the crisis of missing and murdered Indigenous women and girls, including dedicated shows and special episodes from major productions. This is an important and underreported area of Canadian crime that the podcast medium has helped bring to wider attention.',
      },
      {
        q: 'What famous Canadian cases are covered in podcasts?',
        a: 'The Paul Bernardo and Karla Homolka case, Robert Pickton\'s crimes, the Shafia family murders, the disappearance of Laura Babcock, and numerous cold cases from across the country have all received podcast coverage.',
      },
      {
        q: 'Are Canadian true crime podcasts available in other countries?',
        a: 'Yes — most Canadian true crime podcasts are available globally on Spotify, Apple Podcasts, and similar platforms. CBC Podcasts, like the BBC, may have some geographic restrictions on certain content, but most independent Canadian productions are freely available worldwide.',
      },
      {
        q: 'Is the Canadian true crime podcast scene as developed as the American one?',
        a: 'Canada\'s podcast scene is smaller than the US\', but Canadian productions have earned strong international recognition. CBC\'s podcast journalism in particular has produced work of the highest quality. The scene is growing quickly, with new Canadian shows launching regularly.',
      },
    ],
    relatedLinks: [
      { href: '/country/US', label: 'American True Crime Podcasts' },
      { href: '/country/UK', label: 'UK True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  IE: {
    h1: 'Best Irish True Crime Podcasts',
    metaDescription: 'The best Irish true crime podcasts, expert-reviewed and community-rated, covering gangland crime, cold cases, and institutional abuse investigations.',
    intro: [
      'Irish true crime podcasts explore the dark side of a country that often presents a friendly face to the world — gangland violence, historical church crimes, and cold cases from the countryside. The Irish podcast scene is intimate and passionate, with a strong tradition of community storytelling.',
      'Ireland\'s size means that crimes often touch communities in ways that feel personal. The best Irish true crime podcasts reflect this intimacy while maintaining journalistic rigour, bringing the same analytical approach to Irish cases that major American and Australian shows bring to theirs.',
    ],
    faqs: [
      {
        q: 'What are the best Irish true crime podcasts?',
        a: 'True Crime Ireland, Swindled, and several RTÉ documentary podcasts cover Irish crime cases. The country\'s gangland stories, the Garda corruption scandals, and historic child abuse in church institutions have all generated podcast content.',
      },
      {
        q: 'What types of crimes do Irish podcasts cover?',
        a: 'Irish true crime podcasts cover a wide range: gangland killings in Dublin and Limerick, rural cold cases, institutional abuse by the Catholic Church, Garda misconduct, and historic murders. The country\'s small size means coverage tends to feel personal and community-grounded.',
      },
      {
        q: 'Are Irish true crime podcasts available internationally?',
        a: 'Yes — most Irish podcasts are available on Spotify, Apple Podcasts, and similar global platforms. Some RTÉ content has restrictions outside Ireland, but independent Irish productions are globally accessible.',
      },
      {
        q: 'Do Irish podcasts cover the Troubles?',
        a: 'Some Irish and Northern Irish podcasts touch on crimes related to the Troubles, though this is a sensitive area that some producers prefer to leave to journalists and academics. The boundary between political violence and crime in this context is complex and requires careful handling.',
      },
      {
        q: 'Is there a growing true crime podcast community in Ireland?',
        a: 'Yes — Ireland\'s podcast community has grown significantly in recent years, with Irish listeners ranking among the most engaged podcast audiences in Europe. True crime is one of the most popular genres, and new Irish productions are launching regularly.',
      },
    ],
    relatedLinks: [
      { href: '/country/UK', label: 'UK True Crime Podcasts' },
      { href: '/country/US', label: 'American True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  NZ: {
    h1: 'Best New Zealand True Crime Podcasts',
    metaDescription: 'The best New Zealand true crime podcasts, expert-reviewed and community-rated, covering cold cases and crimes from across the country.',
    intro: [
      'New Zealand true crime podcasts explore the crimes behind one of the world\'s most scenic and seemingly peaceful countries. Beneath New Zealand\'s paradise image lies a complex criminal history — historic cold cases, gang warfare, and crimes that shook small communities to their core.',
      'The New Zealand true crime podcast community is growing, with shows that apply serious investigative rigour to cases that have often been overlooked by international media. New Zealand\'s unique cultural context — Māori history, geographic isolation, tight communities — gives its crime stories a distinctive character.',
    ],
    faqs: [
      {
        q: 'What are the best New Zealand true crime podcasts?',
        a: 'The Promised Land NZ, Crime Files NZ, and several RNZ documentary podcasts cover New Zealand cases. Cases involving the Christchurch attacks, the Lundy murders, and historic cold cases have all received substantial podcast coverage.',
      },
      {
        q: 'What famous New Zealand crimes are covered in podcasts?',
        a: 'The Lundy murders, the Aramoana massacre, the Scott Watson case, the Crewe murders, and the Christchurch mosque shootings have all been covered in podcasts. New Zealand\'s historic gang violence and cold cases from rural communities have also featured prominently.',
      },
      {
        q: 'Are New Zealand true crime podcasts available internationally?',
        a: 'Yes — most New Zealand true crime podcasts are available globally on Spotify and Apple Podcasts. Some RNZ content may have geographic restrictions, but independent New Zealand productions are generally accessible worldwide.',
      },
      {
        q: 'Is the New Zealand true crime podcast scene similar to Australia\'s?',
        a: 'The New Zealand scene is smaller but growing rapidly. There\'s significant cross-pollination with Australian true crime podcasts — many Australian shows cover New Zealand cases, and both countries share a similar approach to crime storytelling.',
      },
      {
        q: 'Do New Zealand podcasts address Māori over-representation in the criminal justice system?',
        a: 'The most thoughtful New Zealand true crime podcasts engage with the systemic issues, including Māori over-representation in incarceration statistics, the legacy of colonisation on community wellbeing, and ongoing questions about fairness in the justice system.',
      },
    ],
    relatedLinks: [
      { href: '/country/AU', label: 'Australian True Crime Podcasts' },
      { href: '/country/UK', label: 'UK True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  ZA: {
    h1: 'Best South African True Crime Podcasts',
    metaDescription: 'The best South African true crime podcasts, expert-reviewed and community-rated, led by chart-topping shows like True Crime South Africa.',
    intro: [
      'South African true crime podcasts are only beginning to reach an international audience, but the scene at home is already substantial. True Crime South Africa has topped the country\'s own podcast charts against international competition, and a small but committed field of independent producers is now covering cases — and communities — that rarely make it into English-language true crime coverage.',
      'South African crime stories carry their own particular weight: a still-recent history of institutional violence, deep inequality, and a justice system under constant public scrutiny. The best shows from the country treat their cases with the same rigour and victim focus that define the genre\'s biggest names elsewhere, while surfacing stories that would otherwise stay local.',
    ],
    faqs: [
      {
        q: 'What is the best South African true crime podcast?',
        a: 'True Crime South Africa, hosted by award-winning journalist Nicole Engelbrecht, is the country\'s flagship show and has ranked among South Africa\'s most-listened-to podcasts overall, beating international competition in its home market.',
      },
      {
        q: 'Are there South African podcasts covering specific communities or angles?',
        a: 'Yes — A Crime Most Queer, hosted by Nj Hourquebie, focuses specifically on crimes committed by or against LGBTQ people, mainly but not exclusively in South Africa. It\'s a genuinely uncommon angle within true crime more broadly.',
      },
      {
        q: 'Are South African true crime podcasts available internationally?',
        a: 'Yes — the major South African shows are available globally on Spotify and Apple Podcasts, the same as any other English-language podcast.',
      },
      {
        q: 'Why is South African true crime coverage less visible internationally?',
        a: 'English-language true crime review sites and directories have historically focused almost entirely on US, UK, and Australian content. South Africa has a genuine, active podcast scene, but it rarely gets covered outside the country — this page is a small step toward changing that.',
      },
      {
        q: 'What kinds of cases do South African true crime podcasts cover?',
        a: 'Coverage spans solved and unsolved murders, missing persons cases, and crimes shaped by South Africa\'s specific social context, including cases affecting the LGBTQ community that get little coverage elsewhere.',
      },
    ],
    relatedLinks: [
      { href: '/country/KE', label: 'Kenyan True Crime Podcasts' },
      { href: '/country/UK', label: 'UK True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  KE: {
    h1: 'Best Kenyan True Crime Podcasts',
    metaDescription: 'True crime podcasts covering notable Kenyan cases, including cross-border investigations rarely covered by English-language true crime shows.',
    intro: [
      'Kenyan true crime coverage in podcast form is still rare in English-language media, which makes the cases that do get covered especially worth seeking out. These are often stories with an international dimension — foreign nationals whose deaths or disappearances in Kenya became major cross-border investigations, reported with the same seriousness as any major Western case.',
      'As one of the least-covered true crime territories among major review sites, Kenya represents real untapped ground — cases with genuine international news weight that most English-language true crime directories simply never reach.',
    ],
    faqs: [
      {
        q: 'What is a notable Kenyan true crime podcast?',
        a: 'Murder in the Maasai Mara investigates the 1988 death of British wildlife photographer Julie Ward, who vanished during a solo safari in Kenya\'s Maasai Mara game reserve — a case that became a major cross-border investigation between the UK and Kenya.',
      },
      {
        q: 'Are Kenyan true crime podcasts produced locally or internationally?',
        a: 'Coverage of Kenyan cases often comes from international producers — particularly UK outlets — reporting on cases with cross-border significance, alongside a smaller but growing field of homegrown Kenyan podcast production.',
      },
      {
        q: 'Why is there so little true crime podcast coverage of Kenya?',
        a: 'Most major true crime directories and review sites concentrate almost exclusively on US, UK, and Australian shows. Kenya — like much of East Africa — has real stories and a growing podcast audience, but very little of it reaches English-language true crime coverage.',
      },
      {
        q: 'Are Kenyan true crime podcasts available internationally?',
        a: 'Yes — the podcasts covering Kenyan cases that are featured here are available globally on Spotify and Apple Podcasts.',
      },
      {
        q: 'What kinds of Kenyan cases get international podcast coverage?',
        a: 'Cases involving foreign nationals, safari tourism, and cross-border investigations tend to be the ones that reach international true crime podcasting, since they typically involve UK, European, or American media attention alongside Kenyan authorities.',
      },
    ],
    relatedLinks: [
      { href: '/country/ZA', label: 'South African True Crime Podcasts' },
      { href: '/country/UK', label: 'UK True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  BE: {
    h1: 'Best Belgian True Crime Podcasts',
    metaDescription: 'Podcasts covering Belgian true crime, centred on the Marc Dutroux case and its lasting impact on policing and justice in Belgium.',
    intro: [
      'Belgian true crime is inseparable from one case above all others — the Marc Dutroux affair, which remains one of the most devastating criminal scandals in modern European history and exposed catastrophic failures across the country\'s police and justice system. Podcast coverage of Belgian crime tends to be serious, investigative, and unflinching about institutional failure.',
      'Belgium\'s true crime podcast footprint is small compared to its neighbours, but the cases that do get covered carry enormous weight — this is a country where a single case reshaped public trust in policing for a generation.',
    ],
    faqs: [
      {
        q: 'What is the essential Belgian true crime podcast?',
        a: 'Le Monstre investigates the Marc Dutroux case, in which Dutroux abducted and imprisoned multiple young girls — a scandal that exposed devastating failures across Belgium\'s police and judicial system and remains the country\'s most significant criminal case.',
      },
      {
        q: 'Why does the Dutroux case dominate Belgian true crime coverage?',
        a: 'The scale of the failures — police searches that missed victims who were later found alive, years of institutional dysfunction, and public outrage that led to major reforms — make it one of the most consequential criminal cases in modern European history, not just Belgian history.',
      },
      {
        q: 'Are Belgian true crime podcasts available in English?',
        a: 'Coverage varies. Some Belgian cases have been covered by English-language producers specifically because of their international significance, making them accessible to a global audience despite the local origin of the crimes.',
      },
      {
        q: 'Is Belgium\'s true crime podcast scene growing?',
        a: 'Like much of continental Europe, Belgium\'s true crime podcast scene is smaller than the English-language markets, but coverage of major domestic cases continues to reach international audiences through translated or English-produced content.',
      },
      {
        q: 'What other kinds of cases do Belgian podcasts cover?',
        a: 'Beyond the Dutroux case, Belgian true crime coverage touches on organised crime and institutional cover-ups — themes that recur because of the country\'s role as a hub for cross-border European crime.',
      },
    ],
    relatedLinks: [
      { href: '/country/MT', label: 'Maltese True Crime Podcasts' },
      { href: '/country/UK', label: 'UK True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  MT: {
    h1: 'Best Maltese True Crime Podcasts',
    metaDescription: 'Podcasts covering Maltese true crime, centred on the assassination of journalist Daphne Caruana Galizia and its impact on press freedom.',
    intro: [
      'Maltese true crime podcasting is defined by a single, seismic case: the October 2017 assassination of investigative journalist Daphne Caruana Galizia, killed by a car bomb after years of reporting on corruption at the highest levels of Maltese public life. It remains one of the most significant journalist killings in modern European history.',
      'Malta is a small country, and its true crime podcast footprint reflects that — but the Caruana Galizia case has drawn serious international investigative attention precisely because of what it revealed about the risks facing journalists who investigate power.',
    ],
    faqs: [
      {
        q: 'What is the key Maltese true crime podcast?',
        a: 'Who Killed Daphne examines the October 2017 assassination of Daphne Caruana Galizia, Malta\'s most prominent investigative journalist and anti-corruption reporter, killed by a car bomb outside her home.',
      },
      {
        q: 'Why did the Caruana Galizia case get international attention?',
        a: 'Her killing was widely seen as an attack on press freedom itself, given her reporting on corruption connected to senior figures in Maltese politics and business. The case triggered EU-level scrutiny of rule of law in Malta and led to protests, resignations, and ongoing prosecutions.',
      },
      {
        q: 'Are Maltese true crime podcasts available internationally?',
        a: 'Yes — coverage of the Caruana Galizia case in particular has been produced with an international audience in mind, given its significance for press freedom and EU governance more broadly.',
      },
      {
        q: 'Does Malta have a broader true crime podcast scene?',
        a: 'Malta\'s small population means its true crime podcast output is limited compared to larger countries, but cases with genuine international stakes — like the Caruana Galizia assassination — continue to draw serious investigative podcast coverage.',
      },
      {
        q: 'What made Daphne Caruana Galizia\'s reporting significant?',
        a: 'She was known for dogged investigation into corruption, money laundering, and organised crime connections within Maltese politics, publishing through her own blog when mainstream outlets wouldn\'t. Her final post, published shortly before her death, ended: "There are crooks everywhere you look now. The situation is desperate."',
      },
    ],
    relatedLinks: [
      { href: '/country/BE', label: 'Belgian True Crime Podcasts' },
      { href: '/country/UK', label: 'UK True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  BR: {
    h1: 'Best Brazilian & Latin American True Crime Podcasts',
    metaDescription: 'True crime podcasts covering Brazil and Latin America, bringing lesser-known regional cases to an English-speaking audience.',
    intro: [
      'True crime coverage of Brazil and the wider Latin American region has stayed almost entirely outside English-language podcast directories, despite a huge and engaged Latin American podcast audience and no shortage of cases worth telling. Shows covering this territory tend to be hosted by people with direct ties to the region, bridging cases that stayed local with an English-speaking audience that has never heard of them.',
      'Latin America spans dozens of countries and legal systems, so true crime coverage here is necessarily broad — but the best shows bring the same care and detail that listeners expect from major US or UK productions, applied to cases that have stayed imprinted in local memory without ever crossing into wider recognition.',
    ],
    faqs: [
      {
        q: 'What is a notable podcast covering Brazilian and Latin American true crime?',
        a: 'Suspiria, hosted by Carol and Stephanie — both born and raised in Brazil — covers true crime cases across Latin America, including Brazil, Mexico, and Chile, for an English-speaking audience.',
      },
      {
        q: 'Why is Latin American true crime underrepresented in English-language podcasting?',
        a: 'Most major true crime directories and review sites are built around US, UK, and Australian content, largely because that\'s where the earliest and best-funded productions came from. Latin America has an enormous domestic podcast audience, but very little of its true crime content is produced in English or reaches international directories.',
      },
      {
        q: 'Are Latin American true crime podcasts available internationally?',
        a: 'Yes — English-language shows covering the region, like Suspiria, are available globally on Spotify and Apple Podcasts, the same as any other podcast in the genre.',
      },
      {
        q: 'Which countries does Latin American true crime coverage typically span?',
        a: 'Coverage varies by show, but commonly includes Brazil, Mexico, Chile, Colombia, and Argentina — reflecting both population size and the volume of well-documented cases in each country.',
      },
      {
        q: 'Is this a growing area for true crime podcasting?',
        a: 'Yes — Latin America has one of the fastest-growing podcast audiences globally, and English-language coverage of the region\'s true crime cases is still catching up to that demand.',
      },
    ],
    relatedLinks: [
      { href: '/country/US', label: 'American True Crime Podcasts' },
      { href: '/country/PH', label: 'Filipino True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  PH: {
    h1: 'Best Filipino True Crime Podcasts',
    metaDescription: 'True crime podcasts covering notable Filipino cases, bringing local stories rarely reported by English-language true crime shows.',
    intro: [
      'Filipino true crime podcasting brings a distinctive cultural voice to cases that rarely reach international audiences. The word "lagim" — dread, terror — captures the tone well: shows from the Philippines dig into infamous and lesser-known local cases with a specificity and cultural grounding that outside coverage usually misses.',
      'The Philippines has a large, highly engaged podcast audience, and its true crime scene reflects that — but like much of Southeast Asia, it has stayed largely invisible to English-language true crime directories built around Western content.',
    ],
    faqs: [
      {
        q: 'What is a notable Filipino true crime podcast?',
        a: 'LAGIM, hosted by Filipino-German host Christine Abrigana, covers infamous and lesser-known Filipino cases every two weeks. "Lagim" is a Filipino word meaning dread or terror.',
      },
      {
        q: 'How often does LAGIM release new episodes?',
        a: 'LAGIM releases fortnightly — every two weeks — giving it a steady, sustainable pace compared to some weekly Western shows.',
      },
      {
        q: 'Are Filipino true crime podcasts available internationally?',
        a: 'Yes — LAGIM and other Filipino true crime podcasts are available globally on Spotify and Apple Podcasts.',
      },
      {
        q: 'Why is there so little English-language coverage of Filipino true crime?',
        a: 'Major true crime review sites and directories have historically concentrated on US, UK, and Australian content. The Philippines has a substantial domestic true crime podcast audience, but very little of that content has been surfaced for an international English-speaking audience until now.',
      },
      {
        q: 'What kind of cases does Filipino true crime podcasting cover?',
        a: 'Coverage spans well-known national cases alongside more obscure local stories — the kind of cases that shaped public fear and fascination within the Philippines but stayed almost entirely unknown outside it.',
      },
    ],
    relatedLinks: [
      { href: '/country/IN', label: 'Indian True Crime Podcasts' },
      { href: '/country/BR', label: 'Brazilian & Latin American True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  IN: {
    h1: 'Best Indian True Crime Podcasts',
    metaDescription: 'True crime podcasts covering notable Indian cases, including serialised investigative journalism rarely reported internationally.',
    intro: [
      'Indian true crime podcasting has produced some of the most meticulously reported serialised audio journalism anywhere in the genre, even though the country is barely represented on most English-language true crime directories. The best Indian shows apply the same investigative depth as the biggest Western productions to cases that shocked the country but rarely made international headlines.',
      'With one of the largest podcast-listening populations in the world, India\'s true crime scene is enormous — this page is a first step toward surfacing the standout shows for an international audience that\'s likely never encountered them.',
    ],
    faqs: [
      {
        q: 'What is a notable Indian true crime podcast?',
        a: 'Death, Lies & Cyanide, a Spotify Original narrated by veteran journalist Sashi Kumar, chronicles the case of Jolly Joseph from Kerala, accused of poisoning six members of her own family over 14 years before coming under suspicion in 2019.',
      },
      {
        q: 'Is Death, Lies & Cyanide based on a real case?',
        a: 'Yes — it covers the real Koodathayi cyanide killings in Kerala, one of the most notorious family-murder cases in recent Indian history, which also became the subject of the Netflix documentary Curry & Cyanide.',
      },
      {
        q: 'Are Indian true crime podcasts available internationally?',
        a: 'Yes — Death, Lies & Cyanide is available on Spotify, and other Indian true crime podcasts are widely available on Spotify and Apple Podcasts.',
      },
      {
        q: 'Why has Indian true crime podcasting stayed under the radar internationally?',
        a: 'Most major true crime review sites and directories are built around US, UK, and Australian content. India has an enormous, highly engaged podcast audience and a growing body of serious true crime journalism, but very little of it has been catalogued for an international English-speaking audience.',
      },
      {
        q: 'What kinds of cases do Indian true crime podcasts cover?',
        a: 'Coverage includes family poisonings, high-profile murders, and cases that dominated Indian news cycles for months or years — often reported with the same narrative-driven, journalistic approach as the biggest Western serialised true crime shows.',
      },
    ],
    relatedLinks: [
      { href: '/country/PH', label: 'Filipino True Crime Podcasts' },
      { href: '/country/US', label: 'American True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
}

// ── Platform pages ───────────────────────────────────────────

export const PLATFORM_SEO: Record<string, PageSeoContent> = {
  'Spotify': {
    h1: 'Best True Crime Podcasts on Spotify',
    metaDescription: 'The best true crime podcasts on Spotify, expert-reviewed and community-rated, including exclusive shows and premium content.',
    intro: [
      'Spotify has become one of the most important platforms for true crime podcast listeners, hosting both free and premium content from the world\'s leading producers. With exclusive deals, high-quality audio, and a recommendation algorithm that knows what you like, Spotify has transformed how people discover crime podcasts.',
      'Many of the best-reviewed shows on ListenTrueCrime are available on Spotify, including both Spotify-exclusive productions and shows available across all platforms. Our community\'s highest-rated Spotify true crime podcasts are listed below.',
    ],
    faqs: [
      {
        q: 'Are the best true crime podcasts available on Spotify?',
        a: 'Most major true crime podcasts are available on Spotify, including Serial, Crime Junkie, Casefile, My Favorite Murder, and hundreds more. Spotify has also signed exclusive deals with some producers, making certain shows only available on the platform.',
      },
      {
        q: 'Does Spotify have exclusive true crime podcasts?',
        a: 'Yes — Spotify has signed exclusive deals with several podcast producers and studios. Some true crime content is available only on Spotify, either permanently or for a limited window. Check the platform section on each podcast\'s page on ListenTrueCrime to see where it\'s available.',
      },
      {
        q: 'Is Spotify free for true crime podcasts?',
        a: 'Most podcast content on Spotify is free, including major shows like Serial, Crime Junkie, and Casefile. Some premium or exclusive content requires a Spotify Premium subscription. Audiobook content and certain exclusive shows are behind the paywall.',
      },
      {
        q: 'How does Spotify recommend true crime podcasts?',
        a: 'Spotify uses listening history, followed shows, and similar listener behaviour to recommend new podcasts. If you follow and listen to true crime shows, Spotify\'s algorithm will surface similar content in your daily recommendations and the podcast discovery section.',
      },
      {
        q: 'Can I download true crime podcasts on Spotify for offline listening?',
        a: 'Yes — with Spotify Premium, you can download episodes for offline listening. Some content is also available for offline use on the free tier. This is particularly useful for long commutes or travel where connectivity is unreliable.',
      },
    ],
    relatedLinks: [
      { href: '/platform/Apple%20Podcasts', label: 'Apple Podcasts True Crime' },
      { href: '/platform/Audible', label: 'Audible True Crime Podcasts' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  'Apple Podcasts': {
    h1: 'Best True Crime Podcasts on Apple Podcasts',
    metaDescription: 'The best true crime podcasts on Apple Podcasts, expert-reviewed and community-rated, covering the full catalogue of the genre.',
    intro: [
      'Apple Podcasts is one of the oldest and most comprehensive podcast platforms, home to the full catalogue of true crime podcasts from the genre\'s earliest days. From the shows that defined the genre to the latest independent productions, Apple Podcasts remains a key destination for serious crime podcast listeners.',
      'Apple Podcasts\' curated sections and community ratings make it one of the best places to discover new true crime shows. Our highest-rated podcasts available on Apple Podcasts are listed below.',
    ],
    faqs: [
      {
        q: 'Are all the best true crime podcasts on Apple Podcasts?',
        a: 'The vast majority of true crime podcasts are available on Apple Podcasts, which functions as an open directory. Most shows that are on Spotify are also on Apple Podcasts. Spotify-exclusive shows are the main exception.',
      },
      {
        q: 'Does Apple Podcasts have its own true crime shows?',
        a: 'Apple has commissioned some exclusive podcast content through Apple Podcasts Subscriptions, but the platform is primarily an open directory rather than a content producer. The vast majority of content is from independent producers and studios.',
      },
      {
        q: 'Is Apple Podcasts free?',
        a: 'Apple Podcasts is free to download and use. Most podcast content is free. Some shows offer paid subscriptions through Apple Podcasts Subscriptions for ad-free listening, bonus episodes, or early access — but the core content is almost always free.',
      },
      {
        q: 'How do I find true crime podcasts on Apple Podcasts?',
        a: 'Use the search function to search by show name, or browse the Browse section and select Arts > True Crime or Education > History. Apple Podcasts also curates editorial lists of top true crime podcasts that are updated regularly.',
      },
      {
        q: 'Can I leave reviews on Apple Podcasts?',
        a: 'Yes — Apple Podcasts allows listeners to leave written reviews and star ratings. These ratings are visible to other listeners and can help you decide whether to try a new show. Some podcasts actively ask their audiences to leave Apple Podcasts reviews to help with their rankings.',
      },
    ],
    relatedLinks: [
      { href: '/platform/Spotify', label: 'Spotify True Crime Podcasts' },
      { href: '/platform/Audible', label: 'Audible True Crime' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
  'Audible': {
    h1: 'Best True Crime Podcasts on Audible',
    metaDescription: 'The best true crime podcasts and audio documentaries on Audible, expert-reviewed and community-rated for production quality and depth.',
    intro: [
      'Audible has become a major destination for premium true crime audio content, hosting both traditional audiobooks and podcast-style productions with the high production values that the platform is known for. Many of the most in-depth true crime investigations are available exclusively or first on Audible.',
      'Audible\'s true crime catalogue includes both professionally narrated audiobooks and original podcast series produced specifically for the platform. Our community\'s top-rated Audible true crime content is listed below.',
    ],
    faqs: [
      {
        q: 'What true crime podcasts are exclusive to Audible?',
        a: 'Audible has commissioned several original true crime productions as part of its exclusive content strategy. These include documentary-style audio series with high production values that function similarly to podcast seasons. Check the platform section on each podcast page to see what\'s available exclusively on Audible.',
      },
      {
        q: 'Is Audible true crime content different from regular podcasts?',
        a: 'Audible true crime content is often produced to a higher specification than average podcasts — more sophisticated editing, professional narration, and original music. Some Audible productions are indistinguishable from documentary films in audio form.',
      },
      {
        q: 'Do I need an Audible subscription to access true crime podcasts?',
        a: 'Most of the premium true crime content on Audible requires a subscription or individual purchase. Audible offers a one-credit-per-month subscription that can be used on any title. Some content is included free with an Audible Plus or Premium Plus subscription.',
      },
      {
        q: 'Can I get Audible content on other podcast apps?',
        a: 'Audible Originals and exclusive productions are not available on other platforms. If a show is listed as available on Audible on ListenTrueCrime, the full production or exclusive episodes can only be accessed through the Audible app or website.',
      },
      {
        q: 'What\'s the difference between Audible and other podcast platforms?',
        a: 'Unlike Spotify or Apple Podcasts, which primarily distribute existing podcasts, Audible commissions original content and distributes commercially produced audiobooks. True crime content on Audible is generally more polished and may include content that goes deeper than typical podcast episodes.',
      },
    ],
    relatedLinks: [
      { href: '/platform/Spotify', label: 'Spotify True Crime Podcasts' },
      { href: '/platform/Apple%20Podcasts', label: 'Apple Podcasts True Crime' },
      { href: '/best-true-crime-podcasts', label: 'Best True Crime Podcasts' },
    ],
  },
}

// ── Schema helpers ───────────────────────────────────────────

export function buildFAQSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function buildItemListSchema(name: string, description: string, items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    description,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  }
}
