// One-off CMS cleanup per:
// - critical-murder-mile-duplicates-2026-09-11.md
// - critical-parcast-twins-2026-09-11.md
// - critical-host-name-corrections-2026-09-11.md
// - red-collar-about-rewrite-2026-09-16.md
// Run once; safe to re-run (idempotent updates keyed by slug).
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

const now = new Date().toISOString();

async function update(slug, fields, label) {
  const { error, data } = await supabase.from('podcasts').update(fields).eq('slug', slug).select('slug').single();
  if (error) { console.error(`FAILED ${label} (${slug}):`, error.message); process.exitCode = 1; return false; }
  console.log(`OK  ${label} (${slug})`);
  return true;
}

async function main() {
  // --- Murder Mile: unpublish twin (title/host already wrong, but it's leaving) ---
  await update('murder-mile-uk-true-crime-podcast', { is_published: false }, 'unpublish Murder Mile twin');

  // --- Parcast: unpublish twins ---
  await update('cults-parcast', { is_published: false }, 'unpublish Cults twin');
  await update('serial-killers-parcast', { is_published: false }, 'unpublish Serial Killers twin');
  await update('unsolved-murders-parcast', { is_published: false }, 'unpublish Unsolved Murders twin');

  // --- Parcast: fix if_you_liked_this on a surviving podcast that pointed at a twin ---
  await update('killer-psyche', { if_you_liked_this: ['real-crime-profile', 'anatomy-of-murder', 'serial-killers'] }, 'repoint killer-psyche similar-podcasts link');

  // --- Serial Killers canonical: repair artwork/identity (both old covers were confirmed wrong shows) ---
  await update('serial-killers', {
    image_url: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/f5/d6/59/f5d659cd-d9ca-2ea5-9cd6-295b4d200427/mza_15633811809801599009.jpeg/600x600bb.jpg',
    apple_collection_id: 1205030005,
    artwork_manual_override: true,
    artwork_status: 'verified',
    artwork_source: 'manual',
    artwork_confidence: 'high',
    artwork_verified_at: now,
    artwork_checked_at: now,
  }, 'repair Serial Killers artwork/identity');

  // --- Con Artists: wrong artwork (was wearing Conspiracy Theories' cover) ---
  await update('con-artists', {
    image_url: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/61/5a/51/615a5103-4a0f-76d6-316a-b808bcdfe980/mza_14832371867411815369.jpg/600x600bb.jpg',
    apple_collection_id: 1570317933,
    artwork_manual_override: true,
    artwork_status: 'verified',
    artwork_source: 'manual',
    artwork_confidence: 'high',
    artwork_verified_at: now,
    artwork_checked_at: now,
  }, 'repair Con Artists artwork');

  // --- Conspiracy Theories: wrong artwork (was wearing Rabbit Hole's cover) ---
  await update('conspiracy-theories', {
    image_url: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/97/a6/ee/97a6eee7-f122-29f2-64ef-d3266c19fabd/mza_16933982100645847650.jpg/600x600bb.jpg',
    apple_collection_id: 1337195586,
    artwork_manual_override: true,
    artwork_status: 'verified',
    artwork_source: 'manual',
    artwork_confidence: 'high',
    artwork_verified_at: now,
    artwork_checked_at: now,
  }, 'repair Conspiracy Theories artwork');

  // --- Mafia / Dangerous Personalities: no confirmed live official feed found (fresh Apple search,
  // 17 Sep 2026) — matches pack's own inconclusive finding. Wrong/placeholder art was worse than
  // unpublishing an unverifiable stub.
  await update('mafia', { is_published: false }, 'unpublish unverifiable Mafia stub');
  await update('dangerous-personalities', { is_published: false }, 'unpublish unverifiable Dangerous Personalities stub');

  // --- Unsolved Murders canonical: fix wrong-person host name + port platforms from twin ---
  await update('unsolved-murders-true-crime-stories', {
    host_name: 'Carter Roy, Wenndy Mackenzie',
    platforms: ['Apple Podcasts', 'Spotify', 'Amazon Music'],
  }, 'fix Unsolved Murders host + platforms');

  // --- Host-name corrections (exact per pack) ---
  await update('canadian-true-crime', {
    host_name: 'Kristi Lee',
    description: "Kristi Lee's popular podcast dedicated entirely to Canadian criminal cases — missing Indigenous women, rural murders, cold cases, and domestic crimes that receive little coverage outside Canada due to the US dominance of the true crime media landscape.",
  }, 'fix Canadian True Crime host');

  await update('once-upon-a-crime', {
    host_name: 'Esther Ludlow',
    description: "LA-based host Esther Ludlow presents meticulously researched true crime stories in a cinematic, storytelling-focused style — bringing a novelist's eye for character and atmosphere to crimes from across the world, with particular interest in lesser-covered international cases.",
  }, 'fix Once Upon a Crime host');

  await update('they-walk-among-us', {
    host_name: 'Benjamin and Rosanna Fitton',
    description: 'The most listened-to true crime podcast in the UK — hosted by Benjamin and Rosanna Fitton, covering British and international criminal cases with empathy, meticulous research, and consistently high production values. Released every fortnight since 2016 with over 200 cases covered.',
  }, 'fix They Walk Among Us host');

  await update('southern-fried-true-crime', {
    host_name: 'Erica Kelley',
    description: 'Erica Kelley covers crimes from the American South with a friendly, accessible style and decent case selection. Limited original reporting and production values, but a solid regional gateway for cases that rarely get national attention.',
  }, 'fix Southern Fried True Crime host spelling');

  // --- Red Collar: host + about swap (approved draft, plain-text/format-converted, no new facts) ---
  const redCollarAbout = "Red Collar is a solo true crime series hosted by Catherine Townsend, a writer and licensed private investigator. Each episode looks at red-collar crime — cases where fraud, cons and money schemes collide with violence or murder — rather than corporate white-collar fraud alone. Episodes are case-led and scripted, with no co-host banter. Recent episodes typically run about half an hour; the Apple Podcasts catalogue has remained active under the title Red Collar (some trailer or historical materials also use the related “Blood Money” / red-collar framing — the public Apple title remains Red Collar).";
  await update('red-collar', {
    host_name: 'Catherine Townsend',
    description: redCollarAbout,
    short_description: redCollarAbout.slice(0, 200),
    newsletter_worthy_summary: 'Red Collar examines red-collar crime — cases where fraud, cons and money schemes collide with violence or murder — hosted by writer and licensed PI Catherine Townsend.',
    best_episode_to_start: "Any recent standalone episode, or the earlier “Goth Teen 'Jack the Ripper'” episode as a known entry point.",
    apple_collection_id: 1625003615,
  }, 'fix Red Collar host + about');

  console.log('\nDone.');
}

main();
