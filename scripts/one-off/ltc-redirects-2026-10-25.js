// One-off: merge duplicate podcast pages into their keepers, then 301 the old URLs.
// Dry run by default; pass --apply to write. Safe to re-run.
//
//   counter-clock                -> counterclock
//   uk-true-crime-podcast-always -> uk-true-crime-podcast
//   bear-brook-nhpr              -> bear-brook
// (uncover-cbc -> uncover is deliberately NOT here: it waits for Fact Checker sign-off.)
//
// For each pair: confirm the keeper is published, add any platforms only the twin
// listed (names only: a platform shows as available once it has a URL), repoint
// other podcasts' if_you_liked_this from the twin to the keeper, unpublish the
// twin (never delete), and insert the 301 (needs migration 018).
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

const PAIRS = [
  ['counter-clock', 'counterclock'],
  ['uk-true-crime-podcast-always', 'uk-true-crime-podcast'],
  ['bear-brook-nhpr', 'bear-brook'],
];

async function main() {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN (use --apply to write)');
  for (const [from, to] of PAIRS) {
    const { data: rows } = await supabase.from('podcasts').select('id, slug, is_published, platforms').in('slug', [from, to]);
    const twin = rows.find(r => r.slug === from), keeper = rows.find(r => r.slug === to);
    if (!twin || !keeper) { console.log(`SKIP ${from}: pair not found`); continue; }
    if (!keeper.is_published) { console.log(`SKIP ${from}: keeper ${to} is not published`); continue; }

    const merged = [...new Set([...(keeper.platforms ?? []), ...(twin.platforms ?? [])])];
    const addedPlatforms = merged.filter(p => !(keeper.platforms ?? []).includes(p));
    const { data: refs } = await supabase.from('podcasts').select('id, slug, if_you_liked_this').contains('if_you_liked_this', [from]);
    console.log(`${from} -> ${to}: +platforms [${addedPlatforms.join(', ')}], ${refs.length} similar-podcast refs to repoint`);
    if (!APPLY) continue;

    if (addedPlatforms.length) await supabase.from('podcasts').update({ platforms: merged }).eq('id', keeper.id);
    for (const r of refs) {
      const next = [...new Set(r.if_you_liked_this.map(s => (s === from ? to : s)).filter(s => s !== r.slug))];
      await supabase.from('podcasts').update({ if_you_liked_this: next }).eq('id', r.id);
    }
    await supabase.from('podcasts').update({ is_published: false }).eq('id', twin.id);
    const { error } = await supabase.from('redirects').upsert(
      { from_path: `/podcasts/${from}`, to_path: `/podcasts/${to}`, note: 'Duplicate merged 2026-10-25' },
      { onConflict: 'from_path' });
    console.log(error ? `  redirect NOT inserted: ${error.message}` : '  redirect inserted');
  }
}
main().catch(e => { console.error(e); process.exit(1); });
