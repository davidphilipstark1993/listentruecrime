// One-off: details supplied by True Crime Culinary's host, Leah Llach, in her
// email reply of 23 Nov 2026 (location, bio, where to start, extra platforms).
// Overwrites these fields only. Dry run unless --apply.
//   node scripts/one-off/ltc-tcc-owner-details-2026-11-23.js [--apply]
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
const slug = 'true-crime-culinary';

const patch = {
  country: 'US',
  country_name: 'United States',
  host_bio:
    'Leah Llach is the creator and host of True Crime Culinary, a podcast born from her love of true crime and random food facts. As an eating disorder survivor, she rebuilt her relationship with food through curiosity, learning to enjoy it rather than fear it. That curiosity turned into a podcast exploring where our favourite foods come from and the strange, sometimes criminal, stories behind them. The show is made in San Francisco, California.',
  best_episode_to_start:
    'Episode 53: Animal Crackers and the Clown Riot of 1855 (the host’s pick). After that, dip into any episode, or browse them by theme on the show’s website',
  platforms: ['Apple Podcasts', 'Spotify', 'YouTube', 'iHeart', 'Pocket Casts', 'Castbox'],
  platform_urls: {
    'Apple Podcasts': 'https://podcasts.apple.com/us/podcast/true-crime-culinary/id1845736042',
    Spotify: 'https://open.spotify.com/show/2uAkaW8TNb4ivObCjbZbY5',
    YouTube: 'https://www.youtube.com/@TrueCrimeCulinary',
    iHeart: 'https://www.iheart.com/podcast/269-true-crime-culinary-300281520/',
    'Pocket Casts': 'https://pocketcasts.com/podcast/true-crime-culinary/c5c03d40-b7ad-013e-0dc1-0243b8a24f53',
    Castbox: 'https://castbox.fm/channel/id6784436',
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
