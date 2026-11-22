// One-off: list the two free-listing promotion enquiries of 20–21 Nov 2026
// (True Crime Culinary, Shadows of Éire). Fields were researched on 22 Nov 2026
// from each show's RSS feed, Apple Podcasts listing and website; see
// data/ltc-promo-enquiry-listings-2026-11-22.json. Artwork is the show's own
// cover (Apple, 1400x1400, checked by eye) mirrored into the podcast-artwork
// bucket as a manual/verified override, same as A Million Other Choices.
//
// binge_factor / quick_verdict are deliberately NOT set (editorial scoring),
// so a re-run never wipes them. Safe to re-run: upsert by slug, deterministic
// artwork path. Dry run unless --apply is passed.
//   node scripts/one-off/ltc-promo-enquiry-listings-2026-11-22.js [--apply]
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
const entries = require('./data/ltc-promo-enquiry-listings-2026-11-22.json');
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function addOne({ podcast, similar_slug_candidates, artwork_file, enquiry_id }) {
  console.log(`\n== ${podcast.title}`);
  const { data: all, error } = await supabase.from('podcasts').select('id, slug, title').range(0, 4999);
  if (error) throw new Error(error.message);
  const clash = all.filter(p => p.slug !== podcast.slug && norm(p.title).startsWith(norm(podcast.title)));
  if (clash.length) throw new Error('possible duplicate under another slug: ' + JSON.stringify(clash));
  const existing = all.find(p => p.slug === podcast.slug);
  console.log(existing ? `existing row ${existing.id} — will update` : 'no existing row — will insert');

  const slugs = new Set(all.map(p => p.slug));
  const if_you_liked_this = similar_slug_candidates.filter(s => slugs.has(s));
  const missing = similar_slug_candidates.filter(s => !slugs.has(s));
  console.log('similar linked:', if_you_liked_this.join(', ') || '(none)');
  if (missing.length) console.log('similar not in directory (skipped):', missing.join(', '));

  const row = { ...podcast, if_you_liked_this };
  if (!APPLY) { console.log(row); return; }

  const { data: saved, error: ue } = await supabase
    .from('podcasts').upsert(row, { onConflict: 'slug' }).select('id').single();
  if (ue) throw new Error('upsert: ' + ue.message);
  console.log('podcast saved:', saved.id);

  const buffer = fs.readFileSync(path.join(__dirname, 'data', artwork_file));
  const objectPath = `${saved.id}.jpg`;
  const { error: upErr } = await supabase.storage
    .from('podcast-artwork').upload(objectPath, buffer, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' });
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

  const { error: ee } = await supabase.from('podcast_promotion_enquiries')
    .update({ admin_notes: `Listed at /podcasts/${podcast.slug} on ${now.slice(0, 10)}` }).eq('id', enquiry_id);
  if (ee) throw new Error('enquiry note: ' + ee.message);
  console.log(`done: /podcasts/${podcast.slug}`);
}

(async () => {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN (use --apply to write)');
  for (const e of entries) await addOne(e);
})().catch(e => { console.error(e); process.exitCode = 1; });
