export interface BestOfPage {
  slug: string
  title: string
  h1: string
  description: string
  intro: string
  caseTypes?: string[]
  country?: string
  minBinge?: number
  format?: string
}

export const BEST_OF_PAGES: BestOfPage[] = [
  {
    slug: 'murder-mystery',
    title: 'Best Murder Mystery Podcasts 2025',
    h1: 'Best Murder Mystery True Crime Podcasts',
    description: 'The best murder mystery podcasts, ranked by binge-worthiness and investigative depth. Community-rated and expert-reviewed.',
    intro: 'Murder mystery podcasts are the backbone of true crime. The best combine rigorous journalism with compelling narrative — keeping you gripped from episode one. We\'ve ranked every murder podcast in our database by binge factor, storytelling quality, and research depth.',
    caseTypes: ['Murder'],
  },
  {
    slug: 'serial-killer',
    title: 'Best Serial Killer Podcasts 2025',
    h1: 'Best Serial Killer True Crime Podcasts',
    description: 'In-depth true crime podcasts covering the most notorious serial killers and the investigations that caught them. Ranked by community ratings.',
    intro: 'Serial killer podcasts explore some of the most disturbing and complex criminal investigations in history. The best don\'t just sensationalise — they examine the psychology, the failures of law enforcement, and the communities left behind. These are the highest-rated serial killer podcasts in our database.',
    caseTypes: ['Serial Killer'],
  },
  {
    slug: 'cold-case',
    title: 'Best Cold Case Podcasts 2025',
    h1: 'Best Cold Case True Crime Podcasts',
    description: 'The best podcasts investigating cold cases — unsolved murders, disappearances, and decades-old mysteries finally getting the scrutiny they deserve.',
    intro: 'Cold case podcasts investigate murders and disappearances where official investigations have stalled. The best use modern forensic techniques, digital investigation, and persistent journalism to bring new attention to forgotten cases. Here are the highest-rated cold case podcasts in our community.',
    caseTypes: ['Cold Case'],
  },
  {
    slug: 'missing-persons',
    title: 'Best Missing Persons Podcasts 2025',
    h1: 'Best Missing Persons True Crime Podcasts',
    description: 'Podcasts investigating missing persons cases, unexplained disappearances, and the communities left searching for answers.',
    intro: 'Missing persons podcasts document some of the most emotionally devastating cases in true crime. These shows dig into disappearances that were dismissed, ignored, or inadequately investigated — and often bring new evidence to light. These are the most highly-rated missing persons podcasts in our database.',
    caseTypes: ['Missing Person'],
  },
  {
    slug: 'investigative',
    title: 'Best Investigative True Crime Podcasts 2025',
    h1: 'Best Investigative True Crime Podcasts',
    description: 'Award-winning investigative journalism podcasts that hold institutions accountable, expose systemic failures, and pursue justice.',
    intro: 'Investigative true crime podcasts represent the journalism end of the spectrum — rigorous, evidence-led, and willing to challenge official narratives. These shows have broken real stories, secured overturned convictions, and changed laws. The highest-rated investigative podcasts, ranked by our community.',
    caseTypes: ['Investigative', 'Systemic Injustice'],
  },
  {
    slug: 'fraud-and-scams',
    title: 'Best Fraud and Financial Crime Podcasts 2025',
    h1: 'Best Fraud & Financial Crime Podcasts',
    description: 'The best podcasts about con artists, Ponzi schemes, white-collar crime, and financial fraud — ranked by community ratings.',
    intro: 'Fraud and financial crime podcasts have exploded in popularity — and for good reason. Con artists, Ponzi schemes, corporate fraud, and financial manipulation make for endlessly compelling listening. These are the highest-rated fraud podcasts, from Theranos to Bernie Madoff and beyond.',
    caseTypes: ['Fraud', 'White-Collar Crime'],
  },
  {
    slug: 'courtroom-drama',
    title: 'Best Courtroom True Crime Podcasts 2025',
    h1: 'Best Courtroom & Trial True Crime Podcasts',
    description: 'True crime podcasts covering landmark trials, wrongful convictions, and the machinery of justice. Community-rated and expert-reviewed.',
    intro: 'Courtroom podcasts put you inside the trial — the arguments, the evidence, the drama, and the outcome. The best also examine wrongful convictions and the systemic failures that put innocent people behind bars. These are the highest-rated courtroom true crime podcasts in our community.',
    caseTypes: ['Courtroom', 'Wrongful Conviction'],
  },
  {
    slug: 'uk-true-crime',
    title: 'Best UK True Crime Podcasts 2025',
    h1: 'Best UK True Crime Podcasts',
    description: 'The best British true crime podcasts covering UK murders, cold cases, and criminal justice stories. Ranked by community ratings.',
    intro: 'British true crime has its own flavour — meticulous reporting, dry wit, and a deep respect for the legal process. UK true crime podcasts cover everything from Victorian murders to modern miscarriages of justice. These are the highest-rated UK podcasts in our community.',
    country: 'UK',
  },
  {
    slug: 'australian-true-crime',
    title: 'Best Australian True Crime Podcasts 2025',
    h1: 'Best Australian True Crime Podcasts',
    description: 'The top Australian true crime podcasts — from landmark murders to cold cases from across the Lucky Country.',
    intro: 'Australian true crime podcasts have produced some of the most celebrated shows in the genre — from Teacher\'s Pet to The Teacher\'s Pet. Australia\'s geographic isolation, frontier history, and complex justice system make for uniquely compelling cases. These are our highest-rated Australian podcasts.',
    country: 'AU',
  },
  {
    slug: 'binge-worthy',
    title: 'Most Binge-Worthy True Crime Podcasts 2025',
    h1: 'Most Binge-Worthy True Crime Podcasts',
    description: 'The most compulsively listenable true crime podcasts with the highest binge factors — once you start, you cannot stop.',
    intro: 'Binge-worthy true crime podcasts are the ones where you listen to three episodes before you realise it. They\'re paced brilliantly, told with urgency, and leave every episode on a hook. These are the podcasts with the highest binge factor scores in our community — rated by listeners who genuinely couldn\'t stop.',
    minBinge: 8,
  },
  {
    slug: 'beginners',
    title: 'Best True Crime Podcasts for Beginners 2025',
    h1: 'Best True Crime Podcasts for Beginners',
    description: 'New to true crime podcasts? Start with these highly-rated, accessible shows recommended for first-time listeners.',
    intro: 'If you\'re new to true crime podcasts, it can be hard to know where to start. The best beginner podcasts are accessible, well-produced, and don\'t assume prior knowledge of the case. These episodic shows let you dip in anywhere — perfect for building your true crime habit.',
    minBinge: 7,
    format: 'Episodic',
  },
  {
    slug: 'serialized',
    title: 'Best Serialized True Crime Podcasts 2025',
    h1: 'Best Serialized True Crime Podcasts',
    description: 'Long-form serialized true crime investigations that unfold over multiple episodes — like a true crime documentary series in audio form.',
    intro: 'Serialized true crime podcasts tell a single story across an entire season — unfolding like a novel, with each episode building on the last. The best serialized podcasts create genuine narrative tension and reward patient listening with fully-developed investigations. Here are the highest-rated serialized shows in our database.',
    format: 'Serialized',
  },
]

export function getBestOfPage(slug: string): BestOfPage | undefined {
  return BEST_OF_PAGES.find(p => p.slug === slug)
}
