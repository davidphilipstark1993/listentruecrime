// One-off: add the Audible membership as an affiliate product (SiteStripe Full Link on
// amazon.co.uk, tag stark03a-21, so the Audible membership bounty applies) and place it on
// /platform/Audible and the default related-books set. No price is stored or shown.
// Insert-only and safe to re-run. Dry run unless --apply is passed.
//   node scripts/one-off/ltc-audible-membership-2026-11-01.js [--apply]
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

const PRODUCT = {
  slug: 'audible-membership',
  provider: 'amazon',
  title: 'Audible membership',
  creator: 'Audible',
  description: 'Audible is Amazon’s audiobook service, with a large catalogue of true crime audiobooks. Membership is paid and renews until cancelled; terms are set by Audible.',
  destination_url: 'https://www.amazon.co.uk/hz/audible/mlp',
  affiliate_url: 'https://www.amazon.co.uk/hz/audible/arya/mlp?_encoding=UTF8&purchaseType=MPAID&SHOPPING_PORTAL_MODE=AUGMENTED&linkCode=ll2&tag=stark03a-21&linkId=8930649fc318235f5f7cd25e21466061&ref_=as_li_ss_tl',
  link_text: 'Try Audible',
  category: 'subscription',
  active: true,
  disclosure_required: true,
};
const NOTE = 'Audible is a paid membership service run by Amazon. Not specific to the podcasts on this page.';
const PLACEMENTS = [['platform-audible', 6], ['books-default', 3]];

async function main() {
  console.log(APPLY ? 'APPLYING' : 'DRY RUN (use --apply to write)');
  let { data: existing, error } = await supabase.from('affiliate_products').select('id').eq('slug', PRODUCT.slug);
  if (error) throw new Error(error.message);
  console.log(existing.length ? 'product exists, leaving it untouched' : 'would insert product audible-membership');
  if (!APPLY) { PLACEMENTS.forEach(([k, pos]) => console.log(`would place on ${k} at position ${pos}`)); return; }
  let id = existing[0]?.id;
  if (!id) {
    const { data, error: e } = await supabase.from('affiliate_products').insert(PRODUCT).select('id').single();
    if (e) throw new Error('product insert: ' + e.message);
    id = data.id;
  }
  const rows = PLACEMENTS.map(([page_key, position]) => ({ product_id: id, page_type: 'page', page_key, position, note: NOTE }));
  const { error: e2 } = await supabase.from('affiliate_placements').upsert(rows, { onConflict: 'product_id,page_type,page_key', ignoreDuplicates: true });
  if (e2) throw new Error('placement upsert: ' + e2.message);
  console.log('done');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
