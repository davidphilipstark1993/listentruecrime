// One-off: data fixes found while rewriting /podcasts-like/up-and-vanished (23 Nov 2026).
// - episode_length held "30-60 min per episode; 195 episodes across multiple
//   seasons; over 800M downloads" (unsourced and out of date); it is shown as the
//   "Episode Length" card, so it goes back to the length only.
// - if_you_liked_this gains the closest editorial picks (see
//   lib/seo/podcasts-like-editorial.ts), so the podcast page agrees with the guide.
// - platform_urls was empty; Apple link checked via the iTunes Search API.
// Dry run unless --apply.
//   node scripts/one-off/ltc-up-and-vanished-data-2026-11-23.js [--apply]
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
const slug = 'up-and-vanished';

const patch = {
  episode_length: '30-60 min',
  if_you_liked_this: ['your-own-backyard', 'the-teachers-pet', 'cold', 'bear-brook', 'someone-knows-something'],
  platform_urls: {
    'Apple Podcasts': 'https://podcasts.apple.com/podcast/id1140596919',
    iHeart: 'https://www.iheart.com/podcast/270-up-and-vanished-27926281/',
  },
};

(async () => {
  const { data, error } = await supabase.from('podcasts').select(Object.keys(patch).join(',')).eq('slug', slug).single();
  if (error) throw new Error(error.message);
  for (const k of Object.keys(patch)) if (JSON.stringify(data[k]) !== JSON.stringify(patch[k])) console.log(`${k}:\n  was ${JSON.stringify(data[k])}\n  now ${JSON.stringify(patch[k])}`);
  if (!APPLY) { console.log('dry run — pass --apply to write'); return; }
  const { error: ue } = await supabase.from('podcasts').update(patch).eq('slug', slug);
  if (ue) throw new Error(ue.message);
  console.log('updated');
})().catch(e => { console.error(e); process.exitCode = 1; });
