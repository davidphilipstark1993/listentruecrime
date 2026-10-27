// One-off: add the 44 new podcasts from the 27 Oct 2026 master list that passed fact-checking
// (data/ltc-new-podcasts-2026-10-27.json). Every row was checked against Apple Podcasts and the
// show's own RSS feed on 27 Oct 2026. Editorial fields (tone, binge score, verdict, newsletter
// summary...) are left blank on purpose; image_url is left blank so artwork recovery fills it.
//
// Insert-only: a slug or title that is already on the site is skipped and never overwritten
// (unlike /admin/import, which upserts on slug). Dry run unless --apply is passed.
//   node scripts/one-off/ltc-new-podcasts-2026-10-27.js [--apply]
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
const rows = require('./data/ltc-new-podcasts-2026-10-27.json');
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function main() {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN (use --apply to write)');
  const { data: existing, error } = await supabase.from('podcasts').select('slug, title').range(0, 4999);
  if (error) throw new Error(error.message);
  const slugs = new Set(existing.map(p => p.slug));
  const titles = new Set(existing.map(p => norm(p.title)));

  const fresh = [];
  for (const r of rows) {
    if (slugs.has(r.slug)) { console.log(`skip (slug exists): ${r.slug}`); continue; }
    if (titles.has(norm(r.title))) { console.log(`skip (title exists): ${r.title}`); continue; }
    fresh.push(r);
  }
  console.log(`${fresh.length} to insert, ${rows.length - fresh.length} skipped`);
  if (!APPLY) { fresh.forEach(r => console.log(`  + ${r.slug} (${r.country}, ${r.episode_count})`)); return; }
  for (let i = 0; i < fresh.length; i += 25) {
    const { error: e } = await supabase.from('podcasts').insert(fresh.slice(i, i + 25));
    if (e) { console.error('FAILED batch at', i, e.message); process.exitCode = 1; return; }
  }
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
