-- ============================================================
-- REFERRALS + REUSABLE DISCOUNT CODES
-- Run in the Supabase SQL editor after 022. Safe to re-run.
--
--   1. Every newsletter subscriber gets a short unique referral code
--   2. referrals           one row per referred subscriber (max one referrer each)
--   3. discount_campaigns  a prefix (REF-, BF26-, LOYAL-, WELCOME-) + % + type + expiry
--   4. discount_codes      the actual codes (unique single-use, or one public code)
--   5. shop_orders         records which code (and campaign) each order used
-- ============================================================

-- ------------------------------------------------------------
-- 1. Subscriber referral codes
-- ------------------------------------------------------------
-- 6 characters from a 31-symbol alphabet with no look-alikes (no 0/O, 1/I/L).
create or replace function public.generate_referral_code()
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  i integer;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.newsletter_subscribers where referral_code = candidate);
  end loop;
  return candidate;
end;
$$;

alter table public.newsletter_subscribers
  add column if not exists referral_code text;

-- Backfill existing subscribers one row at a time so each uniqueness check sees the previous rows.
do $$
declare r record;
begin
  for r in select id from public.newsletter_subscribers where referral_code is null loop
    update public.newsletter_subscribers set referral_code = public.generate_referral_code() where id = r.id;
  end loop;
end $$;

alter table public.newsletter_subscribers
  alter column referral_code set default public.generate_referral_code(),
  alter column referral_code set not null;

create unique index if not exists newsletter_subscribers_referral_code_uidx
  on public.newsletter_subscribers (referral_code);

-- ------------------------------------------------------------
-- 2. Referrals
-- A row is created at sign-up ('pending') only for a genuinely new subscriber,
-- and flips to 'confirmed' when that subscriber clicks their double opt-in link.
-- UNIQUE(referred_id) = a subscriber can credit exactly one referrer.
-- ------------------------------------------------------------
create table if not exists public.referrals (
  id           uuid primary key default uuid_generate_v4(),
  referrer_id  uuid not null references public.newsletter_subscribers(id) on delete cascade,
  referred_id  uuid not null unique references public.newsletter_subscribers(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'confirmed')),
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz,
  check (referrer_id <> referred_id)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_id, status);

alter table public.referrals enable row level security;
drop policy if exists "Admins can read referrals" on public.referrals;
create policy "Admins can read referrals"
  on public.referrals for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ------------------------------------------------------------
-- 3. Discount campaigns
-- ------------------------------------------------------------
create table if not exists public.discount_campaigns (
  id                uuid primary key default uuid_generate_v4(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Naming convention: upper-case letters/digits ending in a hyphen, e.g. REF-, BF26-, LOYAL-, WELCOME-
  prefix            text not null unique check (prefix ~ '^[A-Z][A-Z0-9]{1,9}-$'),
  name              text not null,
  notes             text,
  -- 'unique' = one personal code per recipient, single use. 'public' = one shared code, many uses.
  type              text not null check (type in ('unique', 'public')),
  discount_percent  integer not null check (discount_percent between 1 and 100),
  -- The application caps this at MAX_DISCOUNT_PERCENT (lib/discounts/config.ts); that cap is
  -- checked again every time a code is used, so lowering it takes effect straight away.
  starts_at         timestamptz,
  -- Fixed end date for every code in the campaign (Black Friday) ...
  expires_at        timestamptz,
  -- ... and/or a rolling lifetime per issued code (referral rewards: 60 days). The earlier wins.
  code_valid_days   integer check (code_valid_days is null or code_valid_days > 0),
  -- Public campaigns only: optional cap on total uses of each code. NULL = unlimited.
  max_uses_per_code integer check (max_uses_per_code is null or max_uses_per_code > 0),
  is_active         boolean not null default true,
  check (expires_at is not null or code_valid_days is not null)
);

-- ------------------------------------------------------------
-- 4. Discount codes
-- ------------------------------------------------------------
create table if not exists public.discount_codes (
  id                  uuid primary key default uuid_generate_v4(),
  created_at          timestamptz not null default now(),
  campaign_id         uuid not null references public.discount_campaigns(id) on delete cascade,
  code                text not null unique check (code = upper(code)),
  discount_percent    integer not null check (discount_percent between 1 and 100),
  starts_at           timestamptz,
  -- Every code has an expiry date.
  expires_at          timestamptz not null,
  -- 1 for unique codes. NULL = unlimited (public). Reserved at checkout, released if the session expires.
  max_uses            integer check (max_uses is null or max_uses > 0),
  use_count           integer not null default 0 check (use_count >= 0),
  is_active           boolean not null default true,
  -- Referral rewards: who earned it and which tier (1 or 3 referrals).
  owner_subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  reward_tier         integer,
  email_sent_at       timestamptz
);

create index if not exists discount_codes_campaign_idx on public.discount_codes (campaign_id);
create index if not exists discount_codes_owner_idx on public.discount_codes (owner_subscriber_id);
-- A subscriber can only ever earn one code per campaign tier, however many times the reward runs.
create unique index if not exists discount_codes_owner_tier_uidx
  on public.discount_codes (owner_subscriber_id, campaign_id, reward_tier)
  where owner_subscriber_id is not null and reward_tier is not null;

drop trigger if exists discount_campaigns_set_updated_at on public.discount_campaigns;
create trigger discount_campaigns_set_updated_at
  before update on public.discount_campaigns
  for each row execute procedure public.set_updated_at();

alter table public.discount_campaigns enable row level security;
alter table public.discount_codes     enable row level security;

-- Admin-only. Customers never read these tables: codes are checked server-side with the service role.
drop policy if exists "Admins can do everything on discount_campaigns" on public.discount_campaigns;
create policy "Admins can do everything on discount_campaigns"
  on public.discount_campaigns for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
drop policy if exists "Admins can do everything on discount_codes" on public.discount_codes;
create policy "Admins can do everything on discount_codes"
  on public.discount_codes for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ------------------------------------------------------------
-- 5. Orders record the code used (snapshotted, so later edits never rewrite history)
-- ------------------------------------------------------------
alter table public.shop_orders
  add column if not exists discount_code_id        uuid references public.discount_codes(id) on delete set null,
  add column if not exists discount_code           text,
  add column if not exists discount_campaign_id    uuid references public.discount_campaigns(id) on delete set null,
  add column if not exists discount_campaign_prefix text,
  add column if not exists discount_percent        integer,
  -- Pence taken off the MERCHANDISE subtotal (delivery is never discounted).
  -- total_pence = subtotal_pence - discount_pence + shipping_pence.
  add column if not exists discount_pence          integer not null default 0 check (discount_pence >= 0),
  -- Set when an unpaid checkout gave its single-use code back (session expired / failed / superseded).
  add column if not exists discount_released_at    timestamptz;

create index if not exists shop_orders_discount_code_idx on public.shop_orders (discount_code_id);
create index if not exists shop_orders_discount_campaign_idx on public.shop_orders (discount_campaign_id);

-- ------------------------------------------------------------
-- Seed the four prefixes from the naming convention.
-- Only REF- is switched on; flip the others on in Admin > Shop > Discounts when you use them.
-- ------------------------------------------------------------
insert into public.discount_campaigns
  (prefix, name, notes, type, discount_percent, expires_at, code_valid_days, is_active)
values
  ('REF-',     'Referral rewards',  'Issued automatically when a subscriber reaches a referral tier (20% at 1, 30% at 3). The % on each code comes from REFERRAL_TIERS in lib/discounts/config.ts.', 'unique', 20, null, 60, true),
  ('WELCOME-', 'Welcome codes',     'For new subscribers. Generate codes from the admin page.',                       'unique', 10, null, 30, false),
  ('LOYAL-',   'Loyalty rewards',   'Personal thank-you codes for loyal customers/subscribers.',                      'unique', 15, null, 60, false),
  ('BF26-',    'Black Friday 2026', 'Public campaign. Create the shared code (e.g. BF26-BLACKFRIDAY) in the admin page, then switch the campaign on.', 'public', 30, '2026-12-01T00:00:00Z', null, false)
on conflict (prefix) do nothing;
