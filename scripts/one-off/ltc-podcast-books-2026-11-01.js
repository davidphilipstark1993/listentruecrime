// One-off: give every published podcast that still has no book a themed one, as in
// ltc-podcast-books-2026-10-04.js. Covers the 44 podcasts added 27 Oct 2026 and the other
// published shows added since 4 Oct. Uses ONLY products that already exist and are live
// (no new affiliate URLs). The note on each placement is the one already used for that
// product on other pages, so wording is unchanged: themed picks say they are not about the
// podcast's own case. Audiobook editions are shown through their book, so only books are placed.
//
// Insert-only and safe to re-run (existing placements are never touched).
// Dry run unless --apply is passed.
//   node scripts/one-off/ltc-podcast-books-2026-11-01.js [--apply]
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

const DEFAULTS = ['the-stranger-beside-me', 'ill-be-gone-in-the-dark', 'in-cold-blood'];
const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

// First match wins. Returns a product slug, or null when no existing book fits.
function pick(p) {
  const t = new Set((p.case_types ?? []).map(x => x.toLowerCase()));
  const has = (...k) => k.some(x => t.has(x));
  if (has('fraud', 'scam', 'white-collar crime')) return 'bad-blood';
  if (has('courtroom', 'wrongful conviction')) return 'just-mercy';
  if (has('organised crime')) return 'wiseguy';
  if (has('serial killer', 'profiling')) return 'mindhunter';
  if (has('missing person', 'cold case')) return 'people-who-eat-darkness';
  if (has('historical crime')) return p.country === 'UK' ? 'the-five' : 'the-devil-in-the-white-city';
  if (has('investigative', 'journalism')) return 'killers-of-the-flower-moon';
  if (has('espionage')) return null; // no suitable book in the catalogue
  return DEFAULTS[hash(p.slug) % DEFAULTS.length];
}

async function main() {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN (use --apply to write)');
  const { data: prods, error: e1 } = await supabase.from('affiliate_products').select('id, slug, category, active, affiliate_url').range(0, 999);
  if (e1) throw new Error(e1.message);
  const bySlug = new Map(prods.map(p => [p.slug, p]));
  const byId = new Map(prods.map(p => [p.id, p]));

  const { data: pl, error: e2 } = await supabase.from('affiliate_placements').select('product_id, page_key, note').eq('page_type', 'podcast').range(0, 9999);
  if (e2) throw new Error(e2.message);
  const covered = new Set(pl.map(x => x.page_key));

  // Most common existing note per product, so wording stays identical to what is live.
  const counts = new Map();
  for (const x of pl) {
    if (!x.note) continue;
    const slug = byId.get(x.product_id)?.slug;
    const m = counts.get(slug) ?? new Map();
    m.set(x.note, (m.get(x.note) ?? 0) + 1);
    counts.set(slug, m);
  }
  const noteFor = slug => [...(counts.get(slug) ?? new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const { data: pods, error: e3 } = await supabase.from('podcasts').select('slug, title, country, case_types').eq('is_published', true).range(0, 4999);
  if (e3) throw new Error(e3.message);

  const rows = [];
  for (const p of pods.filter(p => !covered.has(p.slug)).sort((a, b) => a.slug.localeCompare(b.slug))) {
    const slug = pick(p);
    const prod = slug && bySlug.get(slug);
    if (!prod || !prod.active || !prod.affiliate_url) { console.log(`no book: ${p.slug} (${(p.case_types ?? []).join('+') || 'none'})`); continue; }
    const note = noteFor(slug);
    if (!note) { console.log(`no existing note for ${slug}, skipping ${p.slug}`); continue; }
    console.log(`${p.slug.padEnd(52)} -> ${slug}`);
    rows.push({ product_id: prod.id, page_type: 'podcast', page_key: p.slug, position: 0, note });
  }
  const tally = {};
  rows.forEach(r => { const s = byId.get(r.product_id).slug; tally[s] = (tally[s] ?? 0) + 1; });
  console.log(`\n${rows.length} placements`, tally);
  if (!APPLY) { console.log('dry run — pass --apply to write'); return; }
  const { error } = await supabase.from('affiliate_placements').upsert(rows, { onConflict: 'product_id,page_type,page_key', ignoreDuplicates: true });
  if (error) throw new Error('placement upsert: ' + error.message);
  console.log('done');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
