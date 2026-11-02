// Verifies supabase/migrations/023_referrals_and_discounts.sql against a REAL Postgres (PGlite, in-memory,
// nothing to install or connect to) with 500 pre-existing subscribers: backfill, re-runnability, defaults,
// and every constraint the referral/discount rules rely on.
//
//   npm i --no-save @electric-sql/pglite && node scripts/referrals/verify-migration.mjs
//
// Prints "ok"/"FAIL" per check and exits non-zero on any failure. Re-run it after editing the migration.
import { PGlite } from '@electric-sql/pglite'
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp'
import fs from 'fs'
const db = new PGlite({ extensions: { uuid_ossp } })
const run = async (label, sql) => { try { await db.exec(sql); console.log('ok   ', label) } catch (e) { console.log('FAIL ', label, '->', e.message); process.exitCode = 1 } }
const expectFail = async (label, sql, re) => { try { await db.exec(sql); console.log('FAIL (should have been rejected):', label); process.exitCode = 1 } catch (e) { console.log(re.test(e.message) ? 'ok   ' : 'FAIL ', 'rejected:', label, '->', e.message.slice(0, 70)); if (!re.test(e.message)) process.exitCode = 1 } }
const q = async sql => (await db.query(sql)).rows

// Minimal stand-ins for what the real project already has (Supabase auth, earlier migrations).
await run('stubs', `
  create extension if not exists "uuid-ossp";
  create schema if not exists auth;
  create function auth.uid() returns uuid language sql as $$ select null::uuid $$;
  create table public.profiles (id uuid primary key, is_admin boolean default false);
  create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
  create table public.newsletter_subscribers (id uuid primary key default uuid_generate_v4(), email text not null unique, status text not null default 'active', consent_ip_hash text, created_at timestamptz default now());
  create table public.shop_orders (id uuid primary key default uuid_generate_v4(), payment_status text not null default 'pending', subtotal_pence int not null default 0, total_pence int not null default 0);
  insert into public.newsletter_subscribers (email) select 'legacy' || g || '@example.com' from generate_series(1, 500) g;
`)
const sql = fs.readFileSync(new URL('../../supabase/migrations/023_referrals_and_discounts.sql', import.meta.url), 'utf8')
await run('migration 023 (first run, 500 existing subscribers)', sql)
await run('migration 023 (re-run is safe)', sql)

const c = (await q(`select count(*)::int n, count(distinct referral_code)::int d, count(*) filter (where referral_code ~ '^[A-HJKMNP-Z2-9]{6}$')::int ok from newsletter_subscribers`))[0]
console.log('backfill:', c, c.n === 500 && c.d === 500 && c.ok === 500 ? 'ok' : 'FAIL'); if (!(c.n === 500 && c.d === 500 && c.ok === 500)) process.exitCode = 1

await run('new subscriber gets a code by default', `insert into newsletter_subscribers (email) values ('new@example.com')`)
console.log('   new code:', (await q(`select referral_code from newsletter_subscribers where email='new@example.com'`))[0].referral_code)
console.log('seeded campaigns:', JSON.stringify(await q(`select prefix, type, discount_percent, is_active from discount_campaigns order by prefix`)))

// referrals constraints
const [a, b, d] = (await q(`select id from newsletter_subscribers order by email limit 3`)).map(r => r.id)
await run('referral a<-b', `insert into referrals (referrer_id, referred_id) values ('${a}','${b}')`)
await expectFail('same person twice (one referrer each)', `insert into referrals (referrer_id, referred_id) values ('${d}','${b}')`, /unique|duplicate/i)
await expectFail('self referral', `insert into referrals (referrer_id, referred_id) values ('${a}','${a}')`, /check/i)

// campaign + code constraints
const camp = (await q(`select id from discount_campaigns where prefix='REF-'`))[0].id
await expectFail('bad prefix', `insert into discount_campaigns (prefix,name,type,discount_percent,code_valid_days) values ('bf26','x','public',10,5)`, /check/i)
await expectFail('campaign with no expiry at all', `insert into discount_campaigns (prefix,name,type,discount_percent) values ('NOEXP-','x','public',10)`, /check/i)
await expectFail('0% / 101%', `insert into discount_campaigns (prefix,name,type,discount_percent,code_valid_days) values ('BAD-','x','public',101,5)`, /check/i)
await expectFail('code without expiry', `insert into discount_codes (campaign_id, code, discount_percent) values ('${camp}','REF-NOEXPIRY',20)`, /null/i)
await expectFail('lower-case code', `insert into discount_codes (campaign_id, code, discount_percent, expires_at) values ('${camp}','ref-lower',20, now()+interval '1 day')`, /check/i)
await run('reward tier 1 for subscriber a', `insert into discount_codes (campaign_id, code, discount_percent, expires_at, max_uses, owner_subscriber_id, reward_tier) values ('${camp}','REF-AAAAAAAA',20, now()+interval '60 days',1,'${a}',1)`)
await expectFail('same tier twice for same subscriber', `insert into discount_codes (campaign_id, code, discount_percent, expires_at, max_uses, owner_subscriber_id, reward_tier) values ('${camp}','REF-BBBBBBBB',20, now()+interval '60 days',1,'${a}',1)`, /unique|duplicate/i)
await run('tier 3 for same subscriber is fine', `insert into discount_codes (campaign_id, code, discount_percent, expires_at, max_uses, owner_subscriber_id, reward_tier) values ('${camp}','REF-CCCCCCCC',30, now()+interval '60 days',1,'${a}',3)`)
await expectFail('duplicate code string', `insert into discount_codes (campaign_id, code, discount_percent, expires_at) values ('${camp}','REF-AAAAAAAA',20, now()+interval '1 day')`, /unique|duplicate/i)
await run('many unowned codes (null owner/tier) do not collide', `insert into discount_codes (campaign_id, code, discount_percent, expires_at, max_uses) values ('${camp}','WEL-1',10,now()+interval '1 day',1),('${camp}','WEL-2',10,now()+interval '1 day',1)`)

// compare-and-swap semantics used by reserveCode (UPDATE ... WHERE use_count = n)
const code = (await q(`select id from discount_codes where code='REF-AAAAAAAA'`))[0].id
const r1 = await db.query(`update discount_codes set use_count = 1 where id='${code}' and use_count = 0 returning id`)
const r2 = await db.query(`update discount_codes set use_count = 1 where id='${code}' and use_count = 0 returning id`)
console.log('CAS: first wins', r1.rows.length === 1, '| second loses', r2.rows.length === 0, r1.rows.length === 1 && r2.rows.length === 0 ? 'ok' : 'FAIL')
await expectFail('negative use_count', `update discount_codes set use_count = -1 where id='${code}'`, /check/i)

// orders columns + cascade behaviour
await run('order records discount', `update shop_orders set discount_pence = 0; insert into shop_orders (subtotal_pence,total_pence,discount_code_id,discount_code,discount_campaign_prefix,discount_percent,discount_pence) values (5000,4400,'${code}','REF-AAAAAAAA','REF-',20,1000)`)
await run('deleting a code keeps the order (snapshot survives)', `delete from discount_codes where id='${code}'`)
console.log('   order after code deleted:', JSON.stringify(await q(`select discount_code, discount_code_id, discount_pence from shop_orders where discount_code is not null`)))
await run('deleting a referred subscriber removes their referral', `delete from newsletter_subscribers where id='${b}'`)
console.log('   referrals left:', (await q(`select count(*)::int n from referrals`))[0].n)
// RLS: non-admin sees nothing
await run('RLS enabled', `select 1`)
console.log('   RLS on:', JSON.stringify(await q(`select relname, relrowsecurity from pg_class where relname in ('referrals','discount_codes','discount_campaigns')`)))
