// ============================================================
// Famous criminal cases covered by podcasts in our database.
// Set published: true once you've reviewed each entry.
// ============================================================

export interface CasePodcast {
  slug: string      // must match a slug in the podcasts table
  note?: string     // shown on the case page, e.g. "Best place to start"
  bestStart?: boolean
}

export interface CaseData {
  slug: string
  name: string
  aliases: string[]     // alternative search terms / common names
  year: number          // year the crime occurred
  location: string
  country: string       // 2-letter code: US, UK, AU, CA
  status: 'solved' | 'cold' | 'ongoing' | 'partial'
  published: boolean    // flip to true after review
  summary: string[]     // 2–3 factual paragraphs; sensitive, no sensationalism
  podcasts: CasePodcast[]
  faqs: { q: string; a: string }[]
}

export const CASES: CaseData[] = [
  {
    slug: 'adnan-syed-hae-min-lee',
    name: 'The Murder of Hae Min Lee',
    aliases: ['Adnan Syed', 'Serial podcast case', 'Woodlawn High School murder'],
    year: 1999,
    location: 'Baltimore, Maryland',
    country: 'US',
    status: 'solved',
    published: false,
    summary: [
      'In January 1999, 18-year-old Hae Min Lee disappeared from Woodlawn High School in Baltimore, Maryland. Her body was found six weeks later in Leakin Park. Her ex-boyfriend, Adnan Syed, was arrested and convicted of first-degree murder in 2000. He maintained his innocence throughout his 23-year imprisonment.',
      'The case became the subject of Serial Season 1 (2014), the most downloaded podcast in history, which raised serious questions about the reliability of key witness Jay Wilds\' testimony and the cell tower evidence used at trial. The podcast generated worldwide attention and prompted renewed legal examination of the conviction.',
      'In September 2022, a Maryland court vacated Syed\'s conviction after prosecutors acknowledged they had withheld evidence about two alternative suspects, including Ronald Lee Moore. Following further proceedings, Syed\'s exoneration was finalised and he was released after 23 years. Hae Min Lee\'s murder remains officially unsolved.',
    ],
    podcasts: [
      { slug: 'serial', bestStart: true, note: 'The definitive investigation — start here' },
      { slug: 'undisclosed', note: 'Deep legal analysis by three attorneys' },
    ],
    faqs: [
      {
        q: 'What is the best podcast about Adnan Syed?',
        a: 'Serial Season 1 is the definitive podcast on the Adnan Syed case. It was the first major audio investigation and remains the most comprehensive single account. For deeper legal analysis, Undisclosed covers the case across multiple seasons with forensic attention to the evidence.',
      },
      {
        q: 'Was Adnan Syed exonerated?',
        a: 'Yes. In 2022, a Maryland court vacated Adnan Syed\'s conviction after prosecutors acknowledged they had withheld exculpatory evidence. Syed was released from prison in September 2022 after 23 years. His legal exoneration was finalised in 2024.',
      },
      {
        q: 'Who killed Hae Min Lee?',
        a: 'The murder of Hae Min Lee is officially unsolved. Adnan Syed\'s conviction was vacated in 2022. Prosecutors have not charged anyone else. The case remains open.',
      },
    ],
  },
  {
    slug: 'kristin-smart',
    name: 'The Disappearance of Kristin Smart',
    aliases: ['Kristin Smart', 'Cal Poly murder', 'Paul Flores'],
    year: 1996,
    location: 'San Luis Obispo, California',
    country: 'US',
    status: 'solved',
    published: false,
    summary: [
      'Kristin Smart was a 19-year-old freshman at California Polytechnic State University when she vanished in May 1996, following an off-campus party. She was last seen being walked home by fellow student Paul Flores. Smart\'s disappearance was reported the following day; her body has never been found.',
      'The case went cold for over two decades despite Paul Flores remaining the prime suspect from the outset. In 2018, amateur investigator and music teacher Chris Lambert began documenting his investigation in the podcast Your Own Backyard. The podcast generated renewed public attention, new witness tips, and contributed to a reinvestigation by law enforcement.',
      'In April 2021, Paul Flores and his father Ruben Flores were arrested. Paul Flores was convicted of first-degree murder in October 2022 and sentenced to 25 years to life in prison. Ruben Flores was acquitted of the accessory charge. Kristin Smart\'s remains have not been recovered.',
    ],
    podcasts: [
      { slug: 'your-own-backyard', bestStart: true, note: 'The podcast that contributed to the conviction' },
    ],
    faqs: [
      {
        q: 'What podcast covers the Kristin Smart case?',
        a: 'Your Own Backyard by Chris Lambert is the definitive podcast on the Kristin Smart case. Lambert spent years investigating the case and the podcast directly contributed to the 2022 conviction of Paul Flores.',
      },
      {
        q: 'Was Paul Flores convicted of killing Kristin Smart?',
        a: 'Yes. Paul Flores was convicted of first-degree murder in October 2022 and sentenced to 25 years to life in California. He was the prime suspect since Smart\'s 1996 disappearance.',
      },
    ],
  },
  {
    slug: 'lynette-dawson',
    name: 'The Disappearance of Lynette Dawson',
    aliases: ['Lynette Dawson', 'Chris Dawson', 'Teacher\'s Pet case', 'Bayview murder'],
    year: 1982,
    location: 'Bayview, Sydney',
    country: 'AU',
    status: 'solved',
    published: false,
    summary: [
      'Lynette Dawson was a 33-year-old mother of two who disappeared from her home in Bayview, Sydney, in January 1982. Her husband, former NRL player and PE teacher Chris Dawson, was the prime suspect from the outset. He claimed she had left voluntarily; police investigations in 1982 and 2003 concluded without charges.',
      'In 2018, journalist Hedley Thomas of The Australian investigated the case for the podcast Teacher\'s Pet. The podcast documented the affair between Chris Dawson and his underage student Joanna Curtis, witness accounts of Lynette\'s state before her disappearance, and decades of investigative failures. The podcast generated enormous public and media attention.',
      'The podcast directly contributed to charges being laid in 2018. Chris Dawson was tried for murder, convicted in August 2022, and sentenced to 24 years in prison with a non-parole period of 18 years. He was 74 at sentencing. Lynette\'s remains have never been found.',
    ],
    podcasts: [
      { slug: 'teachers-pet', bestStart: true, note: 'The investigation that led directly to Dawson\'s conviction' },
    ],
    faqs: [
      {
        q: 'What is the Teacher\'s Pet podcast about?',
        a: 'Teacher\'s Pet investigates the 1982 disappearance of Lynette Dawson from Sydney. Journalist Hedley Thomas documents the affair between Lynette\'s husband Chris Dawson and an underage student, the failures of the original police investigation, and new evidence gathered decades later.',
      },
      {
        q: 'Was Chris Dawson found guilty?',
        a: 'Yes. Chris Dawson was convicted of murdering Lynette Dawson in August 2022 and sentenced to 24 years in prison. He was 74 at sentencing. The Teacher\'s Pet podcast is widely credited with generating the public pressure that led to him being charged 40 years after Lynette\'s disappearance.',
      },
    ],
  },
  {
    slug: 'onecoin-ruja-ignatova',
    name: 'The OneCoin Cryptocurrency Fraud',
    aliases: ['OneCoin', 'Ruja Ignatova', 'Cryptoqueen', 'Missing Cryptoqueen'],
    year: 2014,
    location: 'Global (headquartered Sofia, Bulgaria)',
    country: 'UK',
    status: 'ongoing',
    published: false,
    summary: [
      'OneCoin was a cryptocurrency investment scheme founded in 2014 by Ruja Ignatova, who marketed herself as the "Cryptoqueen." The scheme raised approximately $4 billion from investors worldwide by selling a cryptocurrency that had no actual blockchain. It was one of the largest financial frauds in history.',
      'OneCoin operated through a multilevel marketing structure, recruiting investors across Europe, Asia, Africa, and the Americas. Ignatova presented the scheme at large investor conferences and cultivated a following that resembled a cult. Victims included people who invested life savings and borrowed money to participate.',
      'In October 2017, as US prosecutors began closing in, Ruja Ignatova boarded a flight from Sofia to Athens and disappeared. She remains a fugitive. Her brother Konstantin Ignatov pleaded guilty to fraud charges in 2019. In 2022, Ignatova was added to the FBI\'s Ten Most Wanted list. The BBC\'s investigation, The Missing Cryptoqueen, is widely credited with escalating international law enforcement attention on the case.',
    ],
    podcasts: [
      { slug: 'the-missing-cryptoqueen', bestStart: true, note: 'BBC investigation — the definitive account' },
    ],
    faqs: [
      {
        q: 'What is the best podcast about OneCoin?',
        a: 'The Missing Cryptoqueen by BBC journalist Jamie Bartlett is the definitive investigation into OneCoin and the disappearance of Ruja Ignatova. The podcast contributed to Ignatova being added to the FBI\'s Most Wanted list in 2022.',
      },
      {
        q: 'Was Ruja Ignatova ever caught?',
        a: 'No. As of 2026, Ruja Ignatova remains a fugitive. She was added to the FBI\'s Ten Most Wanted list in 2022. Her current whereabouts are unknown.',
      },
    ],
  },
  {
    slug: 'heaven-s-gate',
    name: "Heaven's Gate Mass Suicide",
    aliases: ["Heaven's Gate", 'Marshall Applewhite', 'UFO cult 1997', 'Rancho Santa Fe'],
    year: 1997,
    location: 'Rancho Santa Fe, California',
    country: 'US',
    status: 'solved',
    published: false,
    summary: [
      "Heaven's Gate was a UFO religious movement founded in the early 1970s by Marshall Applewhite (known as 'Do') and Bonnie Nettles (known as 'Ti'). The group believed that human bodies were containers for souls, that Earth was about to be 'recycled', and that salvation lay in leaving the planet aboard a spacecraft.",
      'In March 1997, as the Hale-Bopp comet made its closest approach to Earth, Applewhite and 38 followers participated in a carefully planned mass suicide in a rented mansion in Rancho Santa Fe, California. Members were found in matching outfits with purple shrouds, having consumed phenobarbital mixed with applesauce. Each had packed a bag for the journey they believed they were taking.',
      'The event remains the largest mass suicide on US soil. Surviving members, who were not at the house that night, have continued to maintain the group\'s website and beliefs. The case raises profound questions about religious freedom, the psychology of belief, and how ordinary people enter high-control groups. Glynn Washington\'s podcast Heaven\'s Gate, featuring interviews with surviving members, is widely considered the definitive audio account.',
    ],
    podcasts: [
      { slug: 'heavens-gate', bestStart: true, note: 'Definitive investigation featuring surviving members' },
    ],
    faqs: [
      {
        q: 'What happened at Heaven\'s Gate?',
        a: "In March 1997, 39 members of the Heaven's Gate UFO cult — including founder Marshall Applewhite — died in a coordinated mass suicide in Rancho Santa Fe, California. They believed they were leaving their bodies to board a spacecraft following the Hale-Bopp comet.",
      },
      {
        q: 'What is the best podcast about Heaven\'s Gate?',
        a: "Heaven's Gate by Snap Judgment's Glynn Washington is the definitive audio investigation, featuring interviews with surviving members who were not at the house on the night of the mass suicide.",
      },
    ],
  },
  {
    slug: 'maura-murray',
    name: 'The Disappearance of Maura Murray',
    aliases: ['Maura Murray', 'Route 112 disappearance', 'UMass student disappearance'],
    year: 2004,
    location: 'Haverhill, New Hampshire',
    country: 'US',
    status: 'cold',
    published: false,
    summary: [
      'Maura Murray was a 21-year-old University of Massachusetts Amherst student who disappeared on 9 February 2004. Her car was found crashed on Route 112 near Haverhill, New Hampshire, after a snowstorm. When a local resident offered to call for help, Murray was present. Minutes later, she was gone.',
      'Murray had left campus without notice and sent emails to professors indicating she would be away for a family emergency. There was no family emergency. No body has been found and no definitive explanation of what happened has been established.',
      'The case has generated an enormous amateur investigation community, one of the largest in any missing persons case. The Missing Maura Murray podcast by Lance Reenstierna and Tim Pilleri has run for over 150 episodes and remains the longest-running investigation of the case. Maura Murray\'s disappearance remains one of America\'s most discussed unsolved missing persons cases.',
    ],
    podcasts: [
      { slug: 'missing-maura-murray', bestStart: true, note: 'The longest-running investigation of the case' },
    ],
    faqs: [
      {
        q: 'Was Maura Murray ever found?',
        a: 'No. As of 2026, Maura Murray has never been found. Her disappearance in February 2004 remains unsolved. Her fate is unknown.',
      },
      {
        q: 'What happened to Maura Murray?',
        a: 'What happened to Maura Murray is unknown. She disappeared on 9 February 2004 from the site of a car accident on Route 112 in New Hampshire. Dozens of theories have been proposed but none has been established. The Missing Maura Murray podcast documents the full investigation.',
      },
    ],
  },
  {
    slug: 'golden-state-killer',
    name: 'The Golden State Killer',
    aliases: ['Golden State Killer', 'Joseph DeAngelo', 'East Area Rapist', 'Original Night Stalker', 'EARONS'],
    year: 1973,
    location: 'California',
    country: 'US',
    status: 'solved',
    published: false,
    summary: [
      'The Golden State Killer committed at least 13 murders and 50 rapes across California between 1973 and 1986, operating under several names before being linked as a single offender in 2001. He was known as the East Area Rapist (for crimes in the Sacramento area), the Original Night Stalker (for murders in Southern California), and finally the Golden State Killer when investigators connected the cases.',
      'The case remained unsolved for over 40 years despite being one of the most intensively investigated cold cases in American history. The breakthrough came in 2018 through genetic genealogy: investigators uploaded DNA from crime scenes to GEDmatch, a public genealogy database, and used family matching to identify Joseph James DeAngelo, a former police officer living in suburban Sacramento.',
      'DeAngelo was arrested in April 2018 at the age of 72. He pleaded guilty to 13 counts of first-degree murder in 2020 and was sentenced to life in prison without the possibility of parole. The case is a landmark in forensic science for demonstrating the power of genetic genealogy in cold case investigations.',
    ],
    podcasts: [
      { slug: 'the-bg-files', note: 'Paul Holes\' investigation — one of the detectives who caught DeAngelo' },
    ],
    faqs: [
      {
        q: 'Who was the Golden State Killer?',
        a: 'The Golden State Killer was Joseph James DeAngelo, a former California police officer. He committed at least 13 murders and 50 rapes across California between 1973 and 1986. He was identified in 2018 through genetic genealogy and sentenced to life in prison in 2020.',
      },
      {
        q: 'How was the Golden State Killer caught?',
        a: 'Joseph DeAngelo was identified through genetic genealogy in 2018. Investigators uploaded crime scene DNA to the genealogy database GEDmatch, identified distant relatives, and worked backward through family trees to DeAngelo. Surveillance confirmed his identity. He was arrested in April 2018.',
      },
    ],
  },
  {
    slug: 'theranos-elizabeth-holmes',
    name: 'The Theranos Fraud',
    aliases: ['Theranos', 'Elizabeth Holmes', 'Silicon Valley fraud', 'blood testing fraud'],
    year: 2003,
    location: 'Palo Alto, California',
    country: 'US',
    status: 'solved',
    published: false,
    summary: [
      'Theranos was a Silicon Valley health technology company founded in 2003 by Elizabeth Holmes, who dropped out of Stanford University at 19. The company claimed to have developed revolutionary blood-testing technology that could perform hundreds of diagnostic tests from a single finger-prick of blood. At its peak, Theranos was valued at $9 billion and Holmes was celebrated as the world\'s youngest self-made female billionaire.',
      'The technology did not work. Theranos was using standard commercial blood-testing equipment (made by other companies) for most tests, and its proprietary devices produced unreliable results that were not disclosed to patients or partners. Investigations by the Wall Street Journal\'s John Carreyrou, beginning in 2015, brought the fraud to light.',
      'The Centers for Medicare & Medicaid Services found Theranos labs posed an "immediate jeopardy to patient health and safety" in 2016. The company closed in 2018. Holmes was convicted of fraud in January 2022 and sentenced to 11 years in federal prison. Former president Ramesh "Sunny" Balwani was convicted on 12 counts and sentenced to 13 years.',
    ],
    podcasts: [
      { slug: 'the-dropout', bestStart: true, note: 'Comprehensive investigation including the criminal trial' },
      { slug: 'american-scandal', note: 'American Scandal\'s Theranos season' },
    ],
    faqs: [
      {
        q: 'What podcasts cover the Theranos fraud?',
        a: 'The Dropout by ABC News journalist Rebecca Jarvis is the most comprehensive podcast on Theranos. American Scandal also dedicates a season to the case. Both cover the fraud, the cover-up, and the criminal trial.',
      },
      {
        q: 'Was Elizabeth Holmes found guilty?',
        a: 'Yes. Elizabeth Holmes was convicted of fraud and conspiracy charges in January 2022 and sentenced to 11 years and 3 months in federal prison. She began serving her sentence in 2023.',
      },
    ],
  },
  {
    slug: 'harold-shipman',
    name: 'Harold Shipman — GP Serial Killer',
    aliases: ['Harold Shipman', 'Dr Death UK', 'Hyde murders', 'most prolific UK serial killer'],
    year: 1975,
    location: 'Hyde, Greater Manchester',
    country: 'UK',
    status: 'solved',
    published: false,
    summary: [
      'Harold Shipman was a British general practitioner who murdered 215 of his patients between 1975 and 1998, making him the most prolific serial killer in British history by confirmed victim count, and one of the most prolific in world history. His victims were predominantly elderly women who died in their homes or at his surgery, killed by lethal doses of diamorphine (medical heroin).',
      'Shipman aroused suspicion in 1998 when a colleague noted an unusual number of deaths among his patients and the unusual frequency with which he had signed death certificates. An initial police investigation found no wrongdoing. It was the suspicion of a local funeral director and a GP colleague that led to further investigation. Shipman was arrested when he forged the will of his final victim, Kathleen Grundy.',
      'He was convicted in January 2000 of 15 murders and sentenced to life in prison. The Shipman Inquiry (2000–2005), chaired by Dame Janet Smith, concluded he had killed at least 215 patients, with a possible upper limit of 250. Shipman was found dead in his cell in January 2004, having hanged himself the day before his 58th birthday.',
    ],
    podcasts: [
      { slug: 'casefile', bestStart: true, note: 'Casefile\'s Shipman episodes are the best audio account' },
    ],
    faqs: [
      {
        q: 'How many people did Harold Shipman kill?',
        a: 'The Shipman Inquiry concluded that Harold Shipman killed at least 215 patients, with a possible upper limit of 250. He was convicted of 15 murders. He is the most prolific serial killer in British recorded history by confirmed victim count.',
      },
      {
        q: 'What podcast covers Harold Shipman?',
        a: 'Casefile True Crime has produced some of the most thorough audio coverage of the Shipman case, covering his crimes, the failures of the investigation, and the Shipman Inquiry that followed his conviction.',
      },
    ],
  },
  {
    slug: 'christopher-duntsch',
    name: 'Christopher Duntsch — Dr Death',
    aliases: ['Christopher Duntsch', 'Dr Death', 'Dallas neurosurgeon', 'Dr Death podcast case'],
    year: 2011,
    location: 'Dallas, Texas',
    country: 'US',
    status: 'solved',
    published: false,
    summary: [
      'Christopher Duntsch was a Dallas neurosurgeon who, between 2011 and 2013, performed spinal surgeries that left 31 of his 38 patients permanently injured or dead. Two patients died. His malpractice occurred across multiple Dallas-area hospitals, which passed him on rather than reporting him to regulatory authorities.',
      'Neurosurgeons Robert Henderson and Randall Kirby, outraged by the damage Duntsch was doing, campaigned for his prosecution. In 2017, Duntsch became the first surgeon in Texas to be charged under a statute typically used to prosecute elder abuse, after prosecutors argued his conduct amounted to intentional harm rather than mere negligence.',
      'He was convicted in February 2017 of injury to an elderly person and sentenced to life in prison. The case prompted reform discussions about hospital credentialing practices and the failure of the medical system to stop a demonstrably dangerous surgeon who had moved between institutions. The Dr. Death podcast and subsequent TV series brought the case to international attention.',
    ],
    podcasts: [
      { slug: 'dr-death', bestStart: true, note: 'The definitive eight-episode investigation' },
    ],
    faqs: [
      {
        q: 'What happened to Christopher Duntsch?',
        a: 'Christopher Duntsch was convicted of intentionally injuring an elderly patient in 2017 and sentenced to life in prison in Texas. He had injured or killed 33 patients across multiple hospitals between 2011 and 2013.',
      },
      {
        q: 'Is Dr. Death a true story?',
        a: 'Yes. The Dr. Death podcast and TV series are based on the true story of Christopher Duntsch, a Dallas neurosurgeon who harmed or killed dozens of patients while Texas hospitals failed to report him. His conviction in 2017 was the first of its kind in Texas.',
      },
    ],
  },
  {
    slug: 'jonbenet-ramsey',
    name: 'The Murder of JonBenét Ramsey',
    aliases: ['JonBenét Ramsey', 'JonBenet Ramsey', 'Boulder Colorado murder', 'child pageant murder'],
    year: 1996,
    location: 'Boulder, Colorado',
    country: 'US',
    status: 'cold',
    published: false,
    summary: [
      'JonBenét Ramsey was a 6-year-old child beauty queen found murdered in the basement of her family\'s home in Boulder, Colorado, on 26 December 1996. She had been reported missing by her parents that morning; her body was discovered hours later by her father, John Ramsey, during a police search of the house. She had been strangled and shown signs of head trauma.',
      'A ransom note found at the scene was later determined to have been written on paper from the Ramsey home. The case immediately raised questions about the parents, John and Patsy Ramsey, who were the initial focus of police suspicion. The Boulder Police Department\'s handling of the crime scene — members of the public were allowed to walk through the house in the hours after the discovery — was widely criticised as having compromised evidence.',
      'Patsy Ramsey died of ovarian cancer in 2006 without being charged. In 2008, DNA testing led Boulder authorities to formally clear both parents. The case remains unsolved. An unknown male DNA profile was found on JonBenét\'s clothing but has never been matched to anyone in national databases. It is among the most extensively discussed unsolved child murder cases in American history.',
    ],
    podcasts: [
      { slug: 'casefile', note: 'Casefile\'s JonBenét episode is thorough and restrained' },
    ],
    faqs: [
      {
        q: 'Who killed JonBenét Ramsey?',
        a: 'The murder of JonBenét Ramsey remains unsolved. Her parents, initially suspects, were cleared by DNA evidence in 2008. An unknown male DNA profile found on her clothing has never been matched. No one has been charged.',
      },
      {
        q: 'What happened to the JonBenét Ramsey case?',
        a: 'JonBenét Ramsey was murdered in Boulder, Colorado, on 25 December 1996. Her parents were cleared by DNA in 2008. The case remains open. Boulder police continue to investigate when new information becomes available.',
      },
    ],
  },
  {
    slug: 'asha-degree',
    name: 'The Disappearance of Asha Degree',
    aliases: ['Asha Degree', 'Shelby NC disappearance', 'Valentine\'s Day mystery', 'Highway 18 disappearance'],
    year: 2000,
    location: 'Shelby, North Carolina',
    country: 'US',
    status: 'cold',
    published: false,
    summary: [
      'Asha Degree was 9 years old when she disappeared on 14 February 2000 — Valentine\'s Day — in Shelby, North Carolina. Multiple witnesses saw a young girl matching her description walking alone on Highway 18 between 2:30 and 4:15am during a rainstorm, moving away from her home. When a motorist slowed down, the girl ran into the woods.',
      'Asha\'s belongings, including a book bag, were found buried beneath a tarpaulin in a wooded area off Highway 18 in Cherryville, North Carolina, in August 2001 — approximately 26 miles from her home. The bag had been reburied after initial discovery; investigators believe it was moved. No explanation has been found for why Asha was walking alone in the dark during a storm.',
      'Despite extensive investigation, no witnesses to what happened to Asha after she entered the woods have come forward, and her fate remains unknown. The FBI is actively involved in the case. Journalist Pamela Colloff\'s podcast In the Red Clay is considered the most thorough investigation of the case in any medium.',
    ],
    podcasts: [
      { slug: 'in-the-red-clay', bestStart: true, note: 'Pamela Colloff\'s meticulous multi-episode investigation' },
    ],
    faqs: [
      {
        q: 'What happened to Asha Degree?',
        a: 'What happened to Asha Degree after she was seen walking along Highway 18 in the early hours of 14 February 2000 is unknown. Her book bag was found buried nearby in 2001. The case remains open and unsolved.',
      },
      {
        q: 'What podcast covers Asha Degree?',
        a: 'In the Red Clay by journalist Pamela Colloff is the most thorough investigation of the Asha Degree case. Colloff is one of the best crime journalists in American media and the podcast is considered essential listening for anyone following the case.',
      },
    ],
  },
  {
    slug: 'zodiac-killer',
    name: 'The Zodiac Killer',
    aliases: ['Zodiac Killer', 'Zodiac', 'San Francisco murders 1960s', 'SFPD cold case'],
    year: 1968,
    location: 'Northern California',
    country: 'US',
    status: 'cold',
    published: false,
    summary: [
      'The Zodiac Killer was an unidentified serial killer who operated in Northern California in the late 1960s and early 1970s. He claimed responsibility for 37 murders in letters to newspapers; five confirmed victims have been attributed to him. His letters included cryptograms, some of which remain unsolved.',
      'The killer sent dozens of letters to Bay Area newspapers including the San Francisco Chronicle and the San Francisco Examiner, taunting police and the press. The letters included coded ciphers, some of which were solved (including by an amateur codebreaker in 2020 who decoded the 340-character cipher that had resisted solution since 1969).',
      'Despite being one of the most investigated cold cases in American history, the Zodiac Killer was never identified. The case inspired David Fincher\'s 2007 film Zodiac, based on the book by Robert Graysmith, and has generated more amateur investigation than almost any other unsolved case in the world.',
    ],
    podcasts: [
      { slug: 'casefile', note: 'Casefile covers the Zodiac case across several episodes' },
    ],
    faqs: [
      {
        q: 'Was the Zodiac Killer ever caught?',
        a: 'No. The Zodiac Killer was never identified or caught. The case remains one of the most famous unsolved serial murder cases in American history. Several suspects have been proposed over the decades but none has been established.',
      },
      {
        q: 'How many people did the Zodiac Killer kill?',
        a: 'The Zodiac Killer claimed 37 murders in his letters. Law enforcement has confirmed five victims: David Faraday and Betty Lou Jensen (December 1968), Darlene Ferrin (July 1969), Cecelia Shepard (September 1969), and Paul Stine (October 1969). Other attacks are attributed to him with varying degrees of certainty.',
      },
    ],
  },
  {
    slug: 'missing-murdered-indigenous-women',
    name: 'Missing and Murdered Indigenous Women and Girls (Canada)',
    aliases: ['MMIWG', 'Missing Indigenous women Canada', 'Finding Cleo'],
    year: 1970,
    location: 'Canada (national)',
    country: 'CA',
    status: 'ongoing',
    published: false,
    summary: [
      'Missing and Murdered Indigenous Women and Girls (MMIWG) describes a crisis in Canada involving the disproportionate disappearance, murder, and ongoing violence experienced by Indigenous women and girls. Indigenous women in Canada are killed at more than six times the rate of non-Indigenous women. Hundreds of cases remain unsolved or uninvestigated.',
      'The crisis has roots in colonial policies including the residential school system, forced removal of Indigenous children from their families, and systematic marginalisation. A 2019 National Inquiry concluded that what was happening constituted genocide.',
      'The CBC\'s Missing & Murdered: Finding Cleo investigates one case within this broader crisis: Cleo Nicotine, a Saskatchewan Cree girl forcibly removed from her family in the 1970s and placed in the American foster care system. Host Connie Walker, herself of Saulteaux First Nation, brings both personal and journalistic authority to the investigation.',
    ],
    podcasts: [
      { slug: 'missing-murdered-finding-cleo', bestStart: true, note: 'Essential investigation by Connie Walker — the best starting point' },
    ],
    faqs: [
      {
        q: 'What is the MMIWG crisis?',
        a: 'MMIWG refers to the crisis of Missing and Murdered Indigenous Women and Girls in Canada. Indigenous women are killed at more than six times the rate of non-Indigenous women. A 2019 National Inquiry found the pattern constitutes genocide. Many cases remain uninvestigated.',
      },
      {
        q: 'What is the Finding Cleo podcast about?',
        a: 'Finding Cleo investigates the case of Cleo Nicotine, a Cree girl from Saskatchewan who was removed from her family and placed in the American foster care system in the 1970s. The podcast is part of CBC\'s Missing & Murdered series and is hosted by journalist Connie Walker.',
      },
    ],
  },
  {
    slug: 'curtis-flowers',
    name: 'The Curtis Flowers Case',
    aliases: ['Curtis Flowers', 'Winona Mississippi', 'six trials same crime', 'Flowers v Mississippi'],
    year: 1996,
    location: 'Winona, Mississippi',
    country: 'US',
    status: 'solved',
    published: false,
    summary: [
      'In July 1996, four people were shot and killed at the Tardy Furniture store in Winona, Mississippi. Curtis Flowers, a Black man who had previously worked at the store, was charged with the murders. He was tried six times by the same prosecutor, District Attorney Doug Evans, over the next two decades — a constitutional record. Three trials ended in hung juries; three convictions were overturned on appeal by the Mississippi Supreme Court for prosecutorial misconduct.',
      'APM Reports journalist Madeleine Baran and the In the Dark team spent two years investigating the case, publishing their findings in Season 2 (2018). Their statistical analysis documented that Evans struck Black potential jurors from the jury pool at 4.4 times the rate of white jurors across his entire career. The team submitted this analysis in an amicus brief to the Supreme Court.',
      'In June 2019, the United States Supreme Court ruled 7–2 in Flowers v. Mississippi that Evans had violated the Equal Protection Clause through discriminatory jury selection in the sixth trial. Curtis Flowers\' conviction was vacated. In September 2020, the Mississippi Attorney General\'s office dropped all charges against Flowers. He was released after 23 years in prison.',
    ],
    podcasts: [
      { slug: 'in-the-dark', bestStart: true, note: 'Season 2 — the definitive investigation that contributed to the Supreme Court ruling' },
    ],
    faqs: [
      {
        q: 'What happened to Curtis Flowers?',
        a: 'Curtis Flowers was tried six times for a 1996 quadruple murder in Mississippi by the same prosecutor. In 2019, the Supreme Court ruled the jury selection process was racially discriminatory (Flowers v. Mississippi). All charges were dropped in 2020. Flowers was released after 23 years.',
      },
      {
        q: 'What is the In the Dark podcast about?',
        a: 'In the Dark Season 2 investigates the six trials of Curtis Flowers in Mississippi and documents systematic racial discrimination in jury selection by District Attorney Doug Evans. The investigation contributed to a 2019 Supreme Court ruling that vacated Flowers\' conviction.',
      },
    ],
  },
  {
    slug: 'lucy-letby',
    name: 'The Countess of Chester Hospital Murders',
    aliases: ['Lucy Letby', 'Countess of Chester', 'Operation Hummingbird'],
    year: 2015,
    location: 'Chester, England',
    country: 'UK',
    status: 'solved',
    published: true,
    summary: [
      'Between June 2015 and June 2016, seventeen babies on the neonatal unit at the Countess of Chester Hospital died or suffered sudden, unexplained collapses. Nurse Lucy Letby, who had worked on the unit since 2012, was present for a disproportionate number of the incidents — a pattern consultant paediatricians began raising informally with hospital management from October 2015, only for Letby to remain on the ward, by the consultants\' own later account, for several more months before being moved to an administrative role in July 2016.',
      'Cheshire Police launched Operation Hummingbird in May 2017, building a case with no crime scene or forensic trace evidence — instead working through years of medical charts, staffing rotas, and material recovered from Letby\'s home, including handwritten notes and more than 250 nursing handover sheets she should not have had. She was charged in November 2020 and tried at Manchester Crown Court from October 2022. On 18 August 2023, a jury convicted her of seven counts of murder and seven of attempted murder; a 2024 retrial on a single remaining count added a fifteenth conviction. She is serving 15 whole-life prison terms and denies all charges.',
      'Letby\'s convictions remain the legal record, upheld through two rounds of appeal. Since 2025, however, an international panel of neonatal specialists led by Dr Shoo Lee — whose own published research the prosecution relied on for its central medical theory — has said publicly it found no medical evidence of deliberate harm in the cases reviewed. A formal application is under active review by the Criminal Cases Review Commission, and a statutory public inquiry chaired by Lady Justice Thirlwall is separately examining how the hospital handled the concerns raised about her. As of August 2026, neither process has changed her legal status.',
    ],
    podcasts: [
      { slug: 'amanda-knox-hosts-doubt-lucy-letby', bestStart: true, note: 'Amanda Knox examines the case in detail, episode by episode' },
    ],
    faqs: [
      {
        q: 'Was Lucy Letby convicted?',
        a: 'Yes. Two juries convicted her — in August 2023 and at a retrial in July 2024 — of murdering seven babies and attempting to murder seven others. She is serving 15 whole-life prison terms and two applications for permission to appeal have been refused by the Court of Appeal.',
      },
      {
        q: 'Is Lucy Letby\'s conviction being challenged?',
        a: 'Yes, through two separate active processes: a formal application under review by the Criminal Cases Review Commission, following a 2025 challenge to the medical evidence by an international panel of specialists, and a statutory public inquiry into how the hospital handled concerns raised about her. Neither has changed her legal status — her convictions remain in place as of August 2026.',
      },
      {
        q: 'What podcast covers the Lucy Letby case?',
        a: 'DOUBT: The Case of Lucy Letby, hosted by Amanda Knox and reviewed on this site, gives a detailed episode-by-episode account running from the original investigation through to the ongoing legal challenge.',
      },
    ],
  },
]
