// One-off: create the initial affiliate book/audiobook inventory and the
// placements that live in the database (the in-article placements are in
// the MDX files themselves, as <FurtherReading> / <AffiliateProduct>).
//
// Every product is created switched OFF with NO affiliate URL — nothing
// appears on the site until the real Amazon Associates URL is pasted into
// /admin/affiliates and the product is switched on. No URLs, tracking IDs,
// prices, ratings or audiobook editions are invented here.
//
// Safe to re-run: products that already exist (by slug) are left
// untouched, so URLs and on/off settings added in admin are never
// overwritten; existing placements are skipped.
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

const AWAITING = 'Awaiting Amazon Associates URL.';
const AUDIOBOOK_NOTE =
  'Only add a URL once an audiobook edition is confirmed on Amazon/Audible. If the link you generate is an audible.co.uk link, change Provider to Audible.';

const book = (slug, title, creator, description) => ({
  slug, title, creator, description,
  provider: 'amazon', category: 'book', active: false, disclosure_required: true, admin_notes: AWAITING,
});

// No description: the edition, narrator and length aren't confirmed until
// the real product link is supplied. Shown only as the book's
// "Prefer to listen? Check the audiobook" line.
const audiobook = (bookSlug, title, creator) => ({
  slug: `${bookSlug}-audiobook`, title: `${title} (audiobook)`, creator, description: null,
  provider: 'amazon', category: 'audiobook', link_text: 'Check the audiobook',
  active: false, disclosure_required: true, admin_notes: AUDIOBOOK_NOTE,
});

const PRODUCTS = [
  book('the-stranger-beside-me', 'The Stranger Beside Me', 'Ann Rule',
    'Ann Rule’s account of the Ted Bundy case, by a crime writer who had worked alongside Bundy before he was identified as a suspect.'),
  book('ill-be-gone-in-the-dark', 'I’ll Be Gone in the Dark', 'Michelle McNamara',
    'McNamara’s investigation into the offender she named the Golden State Killer, completed after her death and published in 2018.'),
  book('people-who-eat-darkness', 'People Who Eat Darkness', 'Richard Lloyd Parry',
    'The Times’s Tokyo correspondent on the disappearance of Lucie Blackman, a young British woman working in Tokyo in 2000, and the investigation and trials that followed.'),
  book('in-cold-blood', 'In Cold Blood', 'Truman Capote',
    'Capote’s account of the 1959 murders of the Clutter family in Holcomb, Kansas, and of the two men convicted of the killings.'),
  book('the-cases-that-haunt-us', 'The Cases That Haunt Us', 'John E. Douglas and Mark Olshaker',
    'A former FBI profiler and his co-author revisit famous unsolved and disputed cases, from Jack the Ripper to JonBenét Ramsey.'),
  book('the-five', 'The Five', 'Hallie Rubenhold',
    'A history of the lives of the five women murdered in Whitechapel in 1888, told without making their killer the focus.'),
  book('the-jigsaw-man', 'The Jigsaw Man', 'Paul Britton',
    'A British psychologist’s account of his work with police in the 1980s and 1990s. Some of that work, notably on the Rachel Nickell investigation, was later heavily criticised.'),
  book('the-devil-in-the-white-city', 'The Devil in the White City', 'Erik Larson',
    'The 1893 Chicago World’s Fair and the killer H. H. Holmes, told as two intertwined histories.'),
  book('killers-of-the-flower-moon', 'Killers of the Flower Moon', 'David Grann',
    'The murders of members of the Osage Nation in 1920s Oklahoma, and the early FBI investigation that followed.'),
  book('mindhunter', 'Mindhunter', 'John E. Douglas and Mark Olshaker',
    'Douglas’s account of the FBI’s early work on criminal profiling, including interviews with convicted serial killers.'),
  book('the-murder-room', 'The Murder Room', 'Michael Capuzzo',
    'The Vidocq Society, a Philadelphia group of detectives and forensic specialists who meet to review cold cases.'),
  book('the-good-nurse', 'The Good Nurse', 'Charles Graeber',
    'The US case of Charles Cullen, a nurse who admitted killing patients in hospitals in New Jersey and Pennsylvania.'),

  audiobook('ill-be-gone-in-the-dark', 'I’ll Be Gone in the Dark', 'Michelle McNamara'),
  audiobook('in-cold-blood', 'In Cold Blood', 'Truman Capote'),
  audiobook('mindhunter', 'Mindhunter', 'John E. Douglas and Mark Olshaker'),
  audiobook('the-cases-that-haunt-us', 'The Cases That Haunt Us', 'John E. Douglas and Mark Olshaker'),
  audiobook('people-who-eat-darkness', 'People Who Eat Darkness', 'Richard Lloyd Parry'),
];

// Placements managed in the database. (Articles carry theirs in the MDX.)
const PLACEMENTS = [
  // Placement D — restrained section above the FAQ on /best-true-crime-podcasts
  { slug: 'in-cold-blood', page_type: 'page', page_key: 'best-true-crime-podcasts', position: 0 },
  { slug: 'mindhunter', page_type: 'page', page_key: 'best-true-crime-podcasts', position: 1 },
  { slug: 'ill-be-gone-in-the-dark', page_type: 'page', page_key: 'best-true-crime-podcasts', position: 2 },
  // Placement E — Your Own Backyard sidebar. None of these books is about Kristin Smart.
  ...['ill-be-gone-in-the-dark', 'the-cases-that-haunt-us', 'people-who-eat-darkness'].map((slug, position) => ({
    slug, page_type: 'podcast', page_key: 'your-own-backyard', position,
    note: 'For listeners who like long-form investigative true crime. These books cover other cases, not Kristin Smart’s.',
  })),
];

async function main() {
  const { data: existing, error: readError } = await supabase.from('affiliate_products').select('id, slug');
  if (readError) throw new Error(readError.message);
  const ids = new Map(existing.map(p => [p.slug, p.id]));

  for (const product of PRODUCTS) {
    if (ids.has(product.slug)) { console.log(`skip product (exists): ${product.slug}`); continue; }
    const { data, error } = await supabase.from('affiliate_products').insert(product).select('id').single();
    if (error) { console.error(`FAILED product ${product.slug}:`, error.message); process.exitCode = 1; continue; }
    ids.set(product.slug, data.id);
    console.log(`OK  product: ${product.slug}`);
  }

  for (const { slug, ...placement } of PLACEMENTS) {
    const product_id = ids.get(slug);
    if (!product_id) { console.error(`FAILED placement: no product ${slug}`); process.exitCode = 1; continue; }
    const { error } = await supabase
      .from('affiliate_placements')
      .upsert({ product_id, ...placement }, { onConflict: 'product_id,page_type,page_key', ignoreDuplicates: true });
    if (error) { console.error(`FAILED placement ${slug} → ${placement.page_type}/${placement.page_key}:`, error.message); process.exitCode = 1; continue; }
    console.log(`OK  placement: ${slug} → ${placement.page_type}/${placement.page_key}`);
  }
}

main().catch(e => { console.error(e); process.exitCode = 1; });
