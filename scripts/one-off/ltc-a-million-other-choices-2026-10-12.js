// One-off: add "A Million Other Choices" (host Kim Toller) to the directory,
// from the owner's submission email of 2026-10-12. The owner created the
// artwork and confirmed rights to use it in the directory.
//
// Safe to re-run: the podcast is upserted by slug, artwork is overwritten at
// a deterministic storage path, and binge_factor / quick_verdict are
// deliberately NOT in the payload so a re-run never wipes later editorial
// scoring. Dry run unless --apply is passed.
//   node scripts/one-off/ltc-a-million-other-choices-2026-10-12.js [--apply]
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
const { podcast, similar_slug_candidates, artwork_file } = require('./data/ltc-a-million-other-choices-2026-10-12.json');

async function main() {
  // Guard against a duplicate under a different slug.
  const { data: dupes, error: de } = await supabase
    .from('podcasts').select('id, slug, title').ilike('title', '%million other choices%');
  if (de) throw new Error(de.message);
  const clash = dupes.filter(d => d.slug !== podcast.slug);
  if (clash.length) throw new Error('possible duplicate under another slug: ' + JSON.stringify(clash));
  const existing = dupes.find(d => d.slug === podcast.slug);
  console.log(existing ? `existing row ${existing.id} — will update` : 'no existing row — will insert');

  // Only link "if you liked this" to podcasts that actually exist.
  const { data: sims, error: se } = await supabase.from('podcasts').select('slug').in('slug', similar_slug_candidates);
  if (se) throw new Error(se.message);
  const found = new Set(sims.map(s => s.slug));
  const if_you_liked_this = similar_slug_candidates.filter(s => found.has(s));
  const missing = similar_slug_candidates.filter(s => !found.has(s));
  console.log('similar linked:', if_you_liked_this.join(', ') || '(none)');
  if (missing.length) console.log('similar not in directory (skipped):', missing.join(', '));

  const row = { ...podcast, if_you_liked_this };
  if (!APPLY) { console.log(row); console.log('dry run — pass --apply to write'); return; }

  const { data: saved, error: ue } = await supabase
    .from('podcasts').upsert(row, { onConflict: 'slug' }).select('id').single();
  if (ue) throw new Error('upsert: ' + ue.message);
  console.log('podcast saved:', saved.id);

  // Mirror the owner-supplied artwork into the same bucket/path scheme the
  // artwork recovery system uses (lib/artwork/storage.ts).
  const buffer = fs.readFileSync(path.join(__dirname, 'data', artwork_file));
  const objectPath = `${saved.id}.webp`;
  const { error: upErr } = await supabase.storage
    .from('podcast-artwork').upload(objectPath, buffer, { contentType: 'image/webp', upsert: true, cacheControl: '3600' });
  if (upErr) throw new Error('artwork upload: ' + upErr.message);
  const { data: pub } = supabase.storage.from('podcast-artwork').getPublicUrl(objectPath);

  const now = new Date().toISOString();
  const { error: ae } = await supabase.from('podcasts').update({
    image_url: `${pub.publicUrl}?v=${Date.now()}`,
    artwork_source: 'manual',
    artwork_status: 'verified',
    artwork_confidence: 'high',
    artwork_manual_override: true,
    artwork_candidate: null,
    artwork_verified_at: now,
    artwork_checked_at: now,
  }).eq('id', saved.id);
  if (ae) throw new Error('artwork update: ' + ae.message);
  console.log('artwork set. Live at /podcasts/' + podcast.slug + ' within an hour (ISR), or hit /api/admin/revalidate now.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
