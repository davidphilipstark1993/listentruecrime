// One-off: fill in binge_factor (1-10) for published podcasts that had none.
// Ratings are research-based; reasons and sources for each are in binge-ratings-log.md.
// Dry run by default; pass --apply to write. Only touches rows where binge_factor
// is still null, so it never overwrites an existing score and is safe to re-run.
//
// Podcasts marked NEEDS MANUAL REVIEW in the log are deliberately left out.
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

const RATINGS = {
  // Batch 1
  '3-spooked-girls': 6,
  'a-date-with-dateline': 7,
  'a-million-other-choices': 6,
  'affirmative-murder': 7,
  'agent-of-betrayal-the-double-life-of-robert-hanssen': 8,
  'all-crime-no-cattle': 7,
  'allegedly': 3,
  'already-gone-podcast': 7,
  // Batch 2
  'americas-most-infamous-crimes-with-katie-ring': 6,
  'anatomy-of-a-scam': 6,
  'and-then-they-were-gone': 6,
  'australian-murder': 7,
  'california-true-crime': 6,
  'chalk-murder-to-me': 6,
  // Batch 3
  'counterclock': 7,
  'crime-over-coffee': 6,
  'dark-poutine-true-crime-and-dark-history': 7,
  'disgraceland': 6,
  'examined-the-backfire-effect': 5,
  'forgotten-australia': 7,
  // Batch 4
  'fur-and-loathing': 6,
  'gone-south': 6,
  'in-her-defence-breach-of-trust': 7,
  'invisible-choir': 7,
  'ireland-crimes-and-mysteries': 6,
  'killers-cults-and-queens': 6,
  'miami-mystery-the-disappearance-of-olavi-hendrickson': 5,
  // Batch 5
  'michigan-monsters': 7,
  'murder-in-miami': 6,
  'murder-in-the-rain': 5,
  'murder-they-wrote-with-laura-whitmore-and-iain-stirling': 5,
  'murder-etc': 8,
  'murderish': 5,
  'profiler-true-crime-africa': 7,
  're-solved-mysteries-an-unsolved-mysteries-podcast': 7,
  // Batch 6
  'son-of-a-hitman': 7,
  'status-pending': 5,
  'stop-rewind-the-lost-boy': 8,
  'the-consult-real-fbi-profilers': 7,
  'the-scream-murder-a-true-teen-horror-story': 4,
  'the-true-crime-enthusiast-podcast': 7,
  'they-will-kill': 5,
  'this-feels-criminal-a-true-crime-podcast-formerly-killer-queens': 6,
  'true-crime-bullsh': 7,
  // Batch 7
  'true-crime-deadline': 6,
  'true-crime-fix': 6,
  'true-crime-guys': 6,
  'true-crime-recaps': 6,
  'true-crime-twins': 5,
  'true-north-crime': 3,
  'twisted-britain': 6,
  'uk-true-crime-podcast': 6,
  'unsolved-rte': 5,
  'which-murderer': 7,
};

async function main() {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN (use --apply to write)');
  const slugs = Object.keys(RATINGS);
  const { data: rows, error } = await supabase.from('podcasts').select('id, slug, title, binge_factor').in('slug', slugs);
  if (error) throw error;
  const found = new Set(rows.map(r => r.slug));
  for (const s of slugs) if (!found.has(s)) console.log(`MISSING slug: ${s}`);
  let updated = 0, skipped = 0;
  for (const row of rows) {
    const value = RATINGS[row.slug];
    if (row.binge_factor != null) { console.log(`SKIP ${row.slug}: already ${row.binge_factor}`); skipped++; continue; }
    console.log(`${row.slug}: null -> ${value}`);
    if (APPLY) {
      const { error: e } = await supabase.from('podcasts').update({ binge_factor: value }).eq('id', row.id).is('binge_factor', null);
      if (e) { console.log(`  ERROR ${e.message}`); continue; }
    }
    updated++;
  }
  console.log(`${APPLY ? 'Updated' : 'Would update'} ${updated}, skipped ${skipped}, of ${slugs.length}`);
}
main().catch(e => { console.error(e); process.exit(1); });
