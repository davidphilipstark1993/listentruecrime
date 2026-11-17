// One-off: delete junk podcast stubs found during the binge-ratings research
// (see binge-ratings-log.md, "Unpublished podcasts"). Dry run by default; pass --apply to delete.
//
// Every target is one of the empty stubs bulk-created on 12 Aug 2026 (plus one
// self-labelled duplicate). They were never published, so no public URL ever existed.
// A row is deleted only if ALL of these hold:
//   - it is unpublished and has no description or verdict
//   - nothing references it: ratings, reviews, favourites, anonymous ratings,
//     discoveries, newsletter rows, affiliate placements, redirects, or another
//     podcast's if_you_liked_this
// Anything that fails a check is reported and left alone.
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

const TARGETS = {
  // Duplicates of published pages
  'amanda-knox-hosts-doubt': 'duplicate of amanda-knox-hosts-doubt-lucy-letby',
  'crime-next-door': 'parent feed; its series are published separately',
  'the-teachers-pet-related': 'duplicate of the-teachers-pet',
  'unravel-series': 'duplicate of the published Unravel season pages',
  'rough-diamondrough-diamond': 'titled "Rough Diamond (duplicate - do not use)"',
  // Placeholders that aren't a single podcast
  'the-binge-cases-the-binge-crimes-series': 'placeholder, not a single podcast',
  'full-trial-audio-series-various-cases': 'placeholder, not a single podcast',
  'this-american-life-select-true-crime-eps': 'placeholder, not a true-crime podcast',
  'vanished-podcast-various': 'placeholder, not a single podcast',
};

const BY_ID = [
  ['ratings', 'podcast_id'],
  ['reviews', 'podcast_id'],
  ['favourites', 'podcast_id'],
  ['anonymous_ratings', 'podcast_id'],
  ['podcast_discoveries', 'matched_podcast_id'],
  ['newsletter_podcasts', 'podcast_id'],
  ['newsletter_events', 'podcast_id'],
  ['newsletter_submissions', 'matched_podcast_id'],
];

async function count(table, col, val) {
  const { count: n, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(col, val);
  if (error) throw new Error(`${table}.${col}: ${error.message}`);
  return n;
}

async function main() {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN (use --apply to delete)');
  const slugs = Object.keys(TARGETS);
  const { data: rows, error } = await supabase
    .from('podcasts').select('id, slug, title, is_published, description, quick_verdict').in('slug', slugs);
  if (error) throw error;
  for (const s of slugs) if (!rows.find(r => r.slug === s)) console.log(`MISSING ${s} (already gone?)`);

  let deleted = 0, kept = 0;
  for (const row of rows) {
    const problems = [];
    if (row.is_published) problems.push('published');
    if (row.description || row.quick_verdict) problems.push('has editorial content');
    for (const [table, col] of BY_ID) {
      const n = await count(table, col, row.id);
      if (n) problems.push(`${n} in ${table}`);
    }
    const n1 = await count('affiliate_placements', 'page_key', row.slug);
    if (n1) problems.push(`${n1} affiliate placements`);
    const { data: red } = await supabase.from('redirects').select('id')
      .or(`from_path.eq./podcasts/${row.slug},to_path.eq./podcasts/${row.slug}`);
    if (red?.length) problems.push(`${red.length} redirects`);
    const { data: liked } = await supabase.from('podcasts').select('slug').contains('if_you_liked_this', [row.slug]);
    if (liked?.length) problems.push(`in if_you_liked_this of ${liked.map(l => l.slug).join(', ')}`);

    if (problems.length) { console.log(`KEEP ${row.slug}: ${problems.join('; ')}`); kept++; continue; }
    console.log(`DELETE ${row.slug} (${row.title}): ${TARGETS[row.slug]}`);
    if (APPLY) {
      const { error: e } = await supabase.from('podcasts').delete().eq('id', row.id).eq('is_published', false);
      if (e) { console.log(`  ERROR ${e.message}`); continue; }
    }
    deleted++;
  }
  console.log(`${APPLY ? 'Deleted' : 'Would delete'} ${deleted}, kept ${kept}`);
}
main().catch(e => { console.error(e); process.exit(1); });
