// One-off: binge_factor for the two promotion-enquiry listings of 22 Nov 2026.
// Reasons and sources are in binge-ratings-log.md ("22 November 2026: promotion-enquiry listings").
// Only fills rows where binge_factor is still null. Dry run unless --apply.
//   node scripts/one-off/ltc-binge-promo-listings-2026-11-22.js [--apply]
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
const RATINGS = { 'true-crime-culinary': 6, 'shadows-of-eire': 6 };

(async () => {
  for (const [slug, score] of Object.entries(RATINGS)) {
    const { data, error } = await supabase.from('podcasts').select('binge_factor').eq('slug', slug).single();
    if (error) throw new Error(`${slug}: ${error.message}`);
    if (data.binge_factor != null) { console.log(`skip ${slug} (already ${data.binge_factor})`); continue; }
    console.log(`${slug} -> ${score}`);
    if (!APPLY) continue;
    const { error: ue } = await supabase.from('podcasts').update({ binge_factor: score }).eq('slug', slug).is('binge_factor', null);
    if (ue) throw new Error(`${slug}: ${ue.message}`);
  }
  console.log(APPLY ? 'done' : 'dry run — pass --apply to write');
})().catch(e => { console.error(e); process.exitCode = 1; });
