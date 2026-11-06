// One-off: seed the "Related books & audiobooks" module on listing pages (components/affiliates/
// related-books.tsx). Uses only products that already exist and are live; adds `page` placements:
//   books-default       fallback shown on any listing page without its own set
//   platform-audible    books that have an Audible edition on amazon.co.uk
//   category-<slug>     a small themed set for the main categories
// Notes are plain descriptions and say the books are not specific to the podcasts on the page.
// Insert-only and safe to re-run. Dry run unless --apply is passed.
//   node scripts/one-off/ltc-page-books-2026-11-01.js [--apply]
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

const GENERIC = 'True crime books and audiobooks for listeners who want more. Not specific to the podcasts on this page.';
const SETS = {
  'books-default': { note: GENERIC, products: ['ill-be-gone-in-the-dark', 'people-who-eat-darkness', 'in-cold-blood'] },
  'platform-audible': {
    note: 'True crime books that have an Audible edition, for listeners who want the long form. Not specific to the podcasts on this page.',
    products: ['ill-be-gone-in-the-dark', 'people-who-eat-darkness', 'in-cold-blood', 'mindhunter', 'helter-skelter', 'killers-of-the-flower-moon'],
  },
  'category-cold-cases': { note: 'Cold-case investigation, for listeners who like long-form cases. Not specific to the podcasts on this page.', products: ['people-who-eat-darkness', 'cold-case-christianity'] },
  'category-missing-persons': { note: 'Missing-person investigations, for listeners who like these cases. Not specific to the podcasts on this page.', products: ['people-who-eat-darkness', 'lost-girls'] },
  'category-fraud-scams': { note: 'Fraud and scam stories, for listeners who like these cases. Not specific to the podcasts on this page.', products: ['bad-blood', 'the-missing-cryptoqueen'] },
  'category-courtroom': { note: 'Trials and the justice system, for listeners who like courtroom cases. Not specific to the podcasts on this page.', products: ['just-mercy', 'helter-skelter'] },
  'category-investigative': { note: 'Investigative true crime, for listeners who like in-depth reporting. Not specific to the podcasts on this page.', products: ['killers-of-the-flower-moon', 'catch-and-kill'] },
  'category-serial-killers': { note: 'Serial-offender cases and how they were investigated. Not specific to the podcasts on this page.', products: ['mindhunter', 'the-stranger-beside-me'] },
};

async function main() {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN (use --apply to write)');
  const { data: prods, error } = await supabase.from('affiliate_products').select('id, slug, active, affiliate_url').range(0, 999);
  if (error) throw new Error(error.message);
  const bySlug = new Map(prods.map(p => [p.slug, p]));
  const rows = [];
  for (const [key, set] of Object.entries(SETS)) {
    set.products.forEach((slug, position) => {
      const p = bySlug.get(slug);
      if (!p || !p.active || !p.affiliate_url) { console.log(`skip ${key}: ${slug} is not a live product`); return; }
      rows.push({ product_id: p.id, page_type: 'page', page_key: key, position, note: set.note });
    });
  }
  const audible = rows.filter(r => r.page_key === 'platform-audible').length;
  console.log(`${rows.length} placements across ${new Set(rows.map(r => r.page_key)).size} pages (platform-audible: ${audible} books)`);
  if (!APPLY) return;
  const { error: e } = await supabase.from('affiliate_placements').upsert(rows, { onConflict: 'product_id,page_type,page_key', ignoreDuplicates: true });
  if (e) throw new Error('placement upsert: ' + e.message);
  console.log('done');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
