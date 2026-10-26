// One-off: fill podcasts.country_name (full name) from the two-letter `country` code.
// `country` itself is untouched because it drives /country/[code] URLs.
// Dry run by default; --apply writes. Rows that already have a country_name are skipped.
// Codes that are not real countries are left blank and reported, never guessed.
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
const dn = new Intl.DisplayNames(['en-GB'], { type: 'region' });

const OVERRIDES = { UK: 'United Kingdom', HK: 'Hong Kong', TT: 'Trinidad and Tobago' };
function nameForCode(code) {
  const c = code.trim().toUpperCase();
  if (OVERRIDES[c]) return OVERRIDES[c];
  if (!/^[A-Z]{2}$/.test(c)) return null;
  try { const n = dn.of(c); return n && n !== c && !/unknown/i.test(n) ? n : null; } catch { return null; }
}

async function main() {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN (use --apply to write)');
  const { data, error } = await supabase.from('podcasts').select('id, slug, country, country_name').not('country', 'is', null).neq('country', '');
  if (error) throw error;
  const byCode = {}; const unknown = {}; let skipped = 0;
  for (const r of data) {
    if (r.country_name) { skipped++; continue; }
    const name = nameForCode(r.country);
    if (!name) { (unknown[r.country] ||= []).push(r.slug); continue; }
    (byCode[r.country] ||= { name, ids: [] }).ids.push(r.id);
  }
  for (const [code, { name, ids }] of Object.entries(byCode)) console.log(`${code} -> ${name}: ${ids.length}`);
  console.log(`already set (skipped): ${skipped}`);
  console.log('unknown codes left blank:', JSON.stringify(unknown));
  if (!APPLY) return;
  for (const { name, ids } of Object.values(byCode)) {
    for (let i = 0; i < ids.length; i += 100) {
      const { error: e } = await supabase.from('podcasts').update({ country_name: name }).in('id', ids.slice(i, i + 100));
      if (e) { console.error('FAILED', name, e.message); process.exitCode = 1; }
    }
  }
  console.log('done');
}
main().catch(e => { console.error(e); process.exit(1); });
