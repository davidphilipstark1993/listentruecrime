// One-off: data fixes that followed the Nov 2026 binge-ratings research
// (binge-ratings-log.md). Dry run by default; pass --apply to write. Safe to re-run.
//
// 1. Correct Apple IDs, each verified via the iTunes lookup API:
//      true-crime-guys: stored 1594254870 returns nothing; real feed is 1192864007
//      gone-cold: blank; it is "Gone Cold - Texas True Crime" (1214679007). Its
//      stored artwork is the same image file as that feed's.
// 2. Repoint "if you liked this" from the unpublished crime-next-door stub to the
//    published crime-next-door-beast-of-birkenhead series.
// 3. Delete unpublished stubs that duplicate a published page or aren't true crime.
//    Each must be unpublished and referenced by nothing (same checks as
//    ltc-stub-cleanup-2026-11-17.js), or it is left alone. Includes stubs that
//    matched no real podcast after searching Apple Podcasts and the web.
// 4. Binge ratings from a second research pass (press reviews plus Apple), filling nulls only.
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

const APPLE_IDS = { 'true-crime-guys': 1192864007, 'gone-cold': 1214679007 };
const REPOINT = { from: 'crime-next-door', to: 'crime-next-door-beast-of-birkenhead' };
const DELETE = {
  'crime-next-door': 'parent feed; its series are published separately',
  'rough-diamondrough-diamond': 'exact copy of the published rough-diamond, created 4 minutes later',
  'gone-cold-texas-true-crime': 'same show as the published gone-cold',
  'broomgate': 'not true crime (curling comedy)',
  'factinate': 'not true crime (music and pop-culture scandals)',
  'snook': 'not true crime (Reddit horror stories)',
  'solved-murders-true-crime-stories': 'AI-narrated Reddit-style stories, 2.1 stars',
  // No matching podcast found on Apple Podcasts or the web (title + listed host)
  'the-dating-game-killer': 'no matching podcast found',
  'not-a-very-good-murderer': 'no matching podcast found',
  'the-greatest-menace': 'no matching podcast found',
  'mr-big': 'no matching podcast found (only unrelated Dutch/NZ shows)',
  'mystery-mondays': 'no matching podcast found',
  'best-served-cold': 'no podcast by the listed hosts found',
  'crossing-the-line': 'no matching podcast found',
  'unseen': 'no Goalcast podcast of this name found',
  'midweek-murders': 'no matching podcast found',
  'hasina-36-days-in-july': 'no podcast found; appears to be an Al Jazeera documentary',
};
const RATINGS = {
  'heart-podcast': 5,
  'foul-play-a-historical-true-crime-podcast': 5,
  'blood-relatives': 7,
};
const BY_ID = [
  ['ratings', 'podcast_id'], ['reviews', 'podcast_id'], ['favourites', 'podcast_id'],
  ['anonymous_ratings', 'podcast_id'], ['podcast_discoveries', 'matched_podcast_id'],
  ['newsletter_podcasts', 'podcast_id'], ['newsletter_events', 'podcast_id'],
  ['newsletter_submissions', 'matched_podcast_id'],
];
async function count(table, col, val) {
  const { count: n, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(col, val);
  if (error) throw new Error(`${table}.${col}: ${error.message}`);
  return n;
}

async function main() {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN (use --apply to write)');

  for (const [slug, id] of Object.entries(APPLE_IDS)) {
    const { data: row } = await supabase.from('podcasts').select('id, apple_collection_id').eq('slug', slug).single();
    if (String(row.apple_collection_id) === String(id)) { console.log(`OK ${slug} apple id already ${id}`); continue; }
    console.log(`${slug}: apple_collection_id ${row.apple_collection_id} -> ${id}`);
    if (APPLY) { const { error } = await supabase.from('podcasts').update({ apple_collection_id: id }).eq('id', row.id); if (error) console.log('  ERROR', error.message); }
  }

  const { data: target } = await supabase.from('podcasts').select('slug, is_published').eq('slug', REPOINT.to).single();
  if (!target?.is_published) throw new Error(`${REPOINT.to} is not published`);
  const { data: referrers } = await supabase.from('podcasts').select('id, slug, if_you_liked_this').contains('if_you_liked_this', [REPOINT.from]);
  for (const r of referrers) {
    const next = [...new Set(r.if_you_liked_this.map(s => (s === REPOINT.from ? REPOINT.to : s)))];
    console.log(`${r.slug}: if_you_liked_this ${JSON.stringify(r.if_you_liked_this)} -> ${JSON.stringify(next)}`);
    if (APPLY) { const { error } = await supabase.from('podcasts').update({ if_you_liked_this: next }).eq('id', r.id); if (error) console.log('  ERROR', error.message); }
  }

  for (const [slug, value] of Object.entries(RATINGS)) {
    const { data: row } = await supabase.from('podcasts').select('id, binge_factor').eq('slug', slug).single();
    if (row.binge_factor != null) { console.log(`OK ${slug} binge_factor already ${row.binge_factor}`); continue; }
    console.log(`${slug}: binge_factor null -> ${value}`);
    if (APPLY) { const { error } = await supabase.from('podcasts').update({ binge_factor: value }).eq('id', row.id).is('binge_factor', null); if (error) console.log('  ERROR', error.message); }
  }

  const { data: rows } = await supabase.from('podcasts').select('*').in('slug', Object.keys(DELETE));
  for (const s of Object.keys(DELETE)) if (!rows.find(r => r.slug === s)) console.log(`MISSING ${s} (already gone?)`);
  for (const row of rows) {
    const problems = [];
    if (row.is_published) problems.push('published');
    for (const [table, col] of BY_ID) { const n = await count(table, col, row.id); if (n) problems.push(`${n} in ${table}`); }
    const n1 = await count('affiliate_placements', 'page_key', row.slug); if (n1) problems.push(`${n1} affiliate placements`);
    const { data: red } = await supabase.from('redirects').select('id').or(`from_path.eq./podcasts/${row.slug},to_path.eq./podcasts/${row.slug}`);
    if (red?.length) problems.push(`${red.length} redirects`);
    const { data: liked } = await supabase.from('podcasts').select('slug').contains('if_you_liked_this', [row.slug]);
    // On a dry run the crime-next-door referrers haven't been repointed yet.
    const blocking = (liked ?? []).filter(l => !(row.slug === REPOINT.from && !APPLY && referrers.some(r => r.slug === l.slug)));
    if (blocking.length) problems.push(`in if_you_liked_this of ${blocking.map(l => l.slug).join(', ')}`);
    if (problems.length) { console.log(`KEEP ${row.slug}: ${problems.join('; ')}`); continue; }
    console.log(`DELETE ${row.slug}: ${DELETE[row.slug]}`);
    if (APPLY) { const { error } = await supabase.from('podcasts').delete().eq('id', row.id).eq('is_published', false); if (error) console.log('  ERROR', error.message); }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
