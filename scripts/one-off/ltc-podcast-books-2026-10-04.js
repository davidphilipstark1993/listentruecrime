// One-off: put a book (and its Audible edition where one exists on amazon.co.uk)
// on each podcast page. 29 new products (affiliate URLs generated with
// Amazon SiteStripe, tag stark03a-21) and 715 podcast placements (audiobooks attach to their book by slug).
//
// Safe to re-run: existing products (by slug) are never touched, existing
// placements are skipped. Dry run unless --apply is passed.
//   node scripts/one-off/ltc-podcast-books-2026-10-04.js [--apply]
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
const { products, placements } = require('./data/ltc-podcast-books-2026-10-04.json');
const AUDIO = '-audiobook';

async function main() {
  const { data: existing, error } = await supabase.from('affiliate_products').select('id, slug');
  if (error) throw new Error(error.message);
  const ids = new Map(existing.map(p => [p.slug, p.id]));

  const fresh = products.filter(p => !ids.has(p.slug));
  console.log(`${fresh.length} new products (${products.length - fresh.length} already exist)`);
  if (APPLY && fresh.length) {
    const { data, error: e } = await supabase.from('affiliate_products').insert(fresh).select('id, slug');
    if (e) throw new Error('product insert: ' + e.message);
    data.forEach(p => ids.set(p.slug, p.id));
  }

  const { data: pods, error: pe } = await supabase.from('podcasts').select('slug').eq('is_published', true).range(0, 4999);
  if (pe) throw new Error(pe.message);
  const live = new Set(pods.map(p => p.slug));

  const rows = [];
  for (const [slug, items] of Object.entries(placements)) {
    if (!live.has(slug)) { console.warn(`skip: no published podcast ${slug}`); continue; }
    items.forEach((it, position) => {
      const product_id = ids.get(it.product);
      if (!product_id && APPLY) throw new Error(`no product ${it.product}`);
      rows.push({ product_id, page_type: 'podcast', page_key: slug, position, note: it.note });
    });
  }
  console.log(`${rows.length} placements across ${new Set(rows.map(r => r.page_key)).size} podcasts`);
  if (!APPLY) { console.log('dry run — pass --apply to write'); return; }
  for (let i = 0; i < rows.length; i += 200) {
    const { error: e } = await supabase
      .from('affiliate_placements')
      .upsert(rows.slice(i, i + 200), { onConflict: 'product_id,page_type,page_key', ignoreDuplicates: true });
    if (e) throw new Error('placement upsert: ' + e.message);
  }
  console.log('done');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
