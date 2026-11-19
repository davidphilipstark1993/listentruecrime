// One-off: add Father Wants Us Dead (NJ.com), requested 19 Nov 2026 after the creators got in touch.
// Details checked against the show's Apple Podcasts page, Megaphone feed and website on 19 Nov 2026.
// Season 1 (2022): 9 episodes + 3 bonus, hosted by Rebecca Everett and Jessica Remo (per the show website).
// Season 2 (Uncle Paul): 4 episodes released 12 Nov 2026; the feed credits Rebecca Everett as host.
// host_style is left blank because the format changed from two hosts to one between seasons.
// Editorial fields are left blank on purpose; image_url is left blank so artwork recovery fills it.
//
// Insert-only: skips the show if its slug or title is already on the site. Dry run unless --apply is passed.
//   node scripts/one-off/ltc-new-podcasts-2026-11-19.js [--apply]
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
const rows = require('./data/ltc-new-podcasts-2026-11-19.json');
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
