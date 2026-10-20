-- ============================================================
-- SHOP (merchandise store)
-- Print-on-demand merchandise sold through Stripe Checkout and fulfilled by
-- Printify. Everything here is server-side data: the storefront reads it with
-- the service-role client, so the only anon-readable rows are published
-- catalogue rows. Orders, events and settings are admin-only (RLS enabled with
-- no public policy) because they hold customer addresses and email addresses.
--
-- Money is stored as integer pence (GBP). Printify supplier costs are stored in
-- Printify's own minor units ("cost_minor") and converted using
-- shop_settings.printify_to_gbp_rate — they are never assumed to be GBP.
--
-- Nothing in this file creates or implies a real Printify product: placeholder
-- catalogue rows have printify_product_id / printify_variant_id NULL and a NULL
-- price, which makes them impossible to purchase until an admin links them.
-- ============================================================

-- ------------------------------------------------------------
-- Catalogue
-- ------------------------------------------------------------
create table public.shop_products (
  id                   uuid primary key default uuid_generate_v4(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title                text not null,
  category             text not null check (category in ('t-shirts', 'hoodies', 'mugs', 'accessories')),
  short_description    text,
  description          text,
  -- [{ "url": "https://…", "alt": "…", "placeholder": false }]
  images               jsonb not null default '[]'::jsonb,
  -- Optional facts shown as bullet points. Only ever filled from the supplier
  -- specification — never invented.
  specs                text[] not null default '{}',
  -- { "unit": "cm", "columns": ["Size","Chest","Length"], "rows": [["S","51","71"]] }
  size_guide           jsonb,
  printify_product_id  text,
  is_published         boolean not null default false,
  is_featured          boolean not null default false,
  is_best_seller       boolean not null default false,
  is_new               boolean not null default false,
  -- True until real artwork and a real Printify product are linked.
  is_placeholder       boolean not null default true,
  sort_order           integer not null default 0,
  seo_title            text,
  seo_description      text,
  admin_notes          text
);

create index shop_products_published_idx on public.shop_products (is_published, category, sort_order);

create trigger shop_products_set_updated_at
  before update on public.shop_products
  for each row execute procedure public.set_updated_at();

create table public.shop_variants (
  id                   uuid primary key default uuid_generate_v4(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  product_id           uuid not null references public.shop_products(id) on delete cascade,
  -- Real Printify variant id. NULL = placeholder, cannot be purchased.
  printify_variant_id  bigint,
  sku                  text,
  colour               text not null default 'Default',
  colour_hex           text,
  size                 text not null default 'One size',
  -- Selling price in pence. NULL = price not set, cannot be purchased.
  price_pence          integer check (price_pence is null or price_pence > 0),
  -- Printify production cost for this variant, in Printify minor units
  -- (see shop_settings.printify_cost_currency). NULL = unknown.
  cost_minor           integer check (cost_minor is null or cost_minor >= 0),
  is_enabled           boolean not null default true,
  sort_order           integer not null default 0,
  unique (product_id, colour, size)
);

create index shop_variants_product_idx on public.shop_variants (product_id);
create unique index shop_variants_printify_uidx on public.shop_variants (product_id, printify_variant_id)
  where printify_variant_id is not null;

create trigger shop_variants_set_updated_at
  before update on public.shop_variants
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Settings (single-row-per-key; edited in /admin/shop/settings)
-- ------------------------------------------------------------
create table public.shop_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

-- Deliberately conservative defaults. printify_to_gbp_rate is NULL on purpose:
-- until it is set (or the Printify currency is GBP) live shipping quotes
-- refuse rather than guess an exchange rate.
insert into public.shop_settings (key, value) values
  ('printify_cost_currency', 'USD'),
  ('printify_to_gbp_rate', null),
  ('stripe_fee_percent', '1.5'),
  ('stripe_fee_fixed_pence', '20'),
  ('vat_percent', '0');

-- ------------------------------------------------------------
-- Orders
-- ------------------------------------------------------------
create sequence public.shop_order_number_seq start 10001;

create table public.shop_orders (
  id                        uuid primary key default uuid_generate_v4(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  order_number              text not null unique default ('LTC-' || nextval('public.shop_order_number_seq')),

  -- Payment
  payment_status            text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'expired', 'partially_refunded', 'refunded')),
  currency                  text not null default 'gbp',
  subtotal_pence            integer not null check (subtotal_pence >= 0),
  shipping_pence            integer not null check (shipping_pence >= 0),
  total_pence               integer not null check (total_pence >= 0),
  refunded_pence            integer not null default 0,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id  text,
  stripe_fee_pence          integer,        -- actual fee from Stripe's balance transaction
  paid_at                   timestamptz,

  -- Customer (collected by Stripe Checkout; filled in when payment completes)
  customer_email            text,
  customer_name             text,
  customer_phone            text,
  shipping_address          jsonb,          -- { name, line1, line2, city, state, postal_code, country }

  -- Fulfilment
  fulfilment_status         text not null default 'awaiting_payment'
    check (fulfilment_status in (
      'awaiting_payment', 'queued', 'submitting', 'created', 'in_production',
      'shipped', 'delivered', 'failed', 'needs_review', 'cancelled'
    )),
  printify_order_id         text,
  printify_status           text,
  printify_sent_to_production_at timestamptz,
  -- Printify's actual charges for this order, in Printify minor units. NULL
  -- until Printify has reported them (this is what makes profit "confirmed").
  printify_cost_minor           integer,
  printify_shipping_minor       integer,
  printify_tax_minor            integer,
  -- What we expected Printify to charge, snapshotted at checkout.
  est_printify_shipping_minor   integer,
  fulfilment_attempts       integer not null default 0,
  next_retry_at             timestamptz,
  last_error                text,
  submitting_since          timestamptz,

  -- Emails (claimed atomically so a replayed webhook can never double-send)
  confirmation_email_sent_at timestamptz,
  admin_alerted_at          timestamptz,

  notes                     text
);

create index shop_orders_status_idx on public.shop_orders (payment_status, fulfilment_status);
create index shop_orders_created_idx on public.shop_orders (created_at desc);
create index shop_orders_email_idx on public.shop_orders (customer_email);
create index shop_orders_retry_idx on public.shop_orders (next_retry_at) where fulfilment_status = 'failed';
create unique index shop_orders_printify_uidx on public.shop_orders (printify_order_id) where printify_order_id is not null;

create trigger shop_orders_set_updated_at
  before update on public.shop_orders
  for each row execute procedure public.set_updated_at();

-- Line items are a snapshot: the title/colour/size/price the customer paid
-- for, plus the Printify ids needed to fulfil — so later catalogue edits can
-- never change what an existing order contains.
create table public.shop_order_items (
  id                    uuid primary key default uuid_generate_v4(),
  order_id              uuid not null references public.shop_orders(id) on delete cascade,
  variant_id            uuid references public.shop_variants(id) on delete set null,
  product_title         text not null,
  colour                text not null,
  size                  text not null,
  quantity              integer not null check (quantity between 1 and 20),
  unit_price_pence      integer not null check (unit_price_pence > 0),
  printify_product_id   text not null,
  printify_variant_id   bigint not null,
  est_cost_minor        integer          -- variant cost at time of order, Printify minor units
);

create index shop_order_items_order_idx on public.shop_order_items (order_id);

-- Shipments reported by Printify. The unique key makes a replayed shipment
-- webhook a no-op and guarantees one dispatch email per parcel.
create table public.shop_shipments (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  order_id         uuid not null references public.shop_orders(id) on delete cascade,
  carrier          text,
  tracking_number  text not null,
  tracking_url     text,
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  email_sent_at    timestamptz,
  unique (order_id, tracking_number)
);

-- Troubleshooting log. Never stores card data; payloads are summaries only.
create table public.shop_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  order_id    uuid references public.shop_orders(id) on delete cascade,
  level       text not null default 'info' check (level in ('info', 'warn', 'error')),
  type        text not null,
  message     text not null,
  data        jsonb
);

create index shop_events_order_idx on public.shop_events (order_id, created_at desc);
create index shop_events_level_idx on public.shop_events (level, created_at desc);

-- Webhook de-duplication. Primary key = the provider's own event id.
create table public.shop_webhook_events (
  provider      text not null check (provider in ('stripe', 'printify')),
  event_id      text not null,
  type          text not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text,
  primary key (provider, event_id)
);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.shop_products        enable row level security;
alter table public.shop_variants        enable row level security;
alter table public.shop_settings        enable row level security;
alter table public.shop_orders          enable row level security;
alter table public.shop_order_items     enable row level security;
alter table public.shop_shipments       enable row level security;
alter table public.shop_events          enable row level security;
alter table public.shop_webhook_events  enable row level security;

create policy "Published shop products are public"
  on public.shop_products for select using (is_published = true);

create policy "Variants of published shop products are public"
  on public.shop_variants for select using (
    exists (select 1 from public.shop_products p where p.id = product_id and p.is_published = true)
  );

-- Everything else: admins only (the service role bypasses RLS for server code).
create policy "Admins can do everything on shop_products"
  on public.shop_products for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
create policy "Admins can do everything on shop_variants"
  on public.shop_variants for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
create policy "Admins can do everything on shop_settings"
  on public.shop_settings for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
create policy "Admins can do everything on shop_orders"
  on public.shop_orders for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
create policy "Admins can do everything on shop_order_items"
  on public.shop_order_items for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
create policy "Admins can do everything on shop_shipments"
  on public.shop_shipments for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
create policy "Admins can read shop_events"
  on public.shop_events for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
create policy "Admins can read shop_webhook_events"
  on public.shop_webhook_events for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ------------------------------------------------------------
-- PLACEHOLDER CATALOGUE
-- The seven launch products, as clearly-labelled placeholders: no Printify
-- ids, no prices, no supplier costs, no images. They display as "coming soon"
-- and cannot be bought. Replace via /admin/shop/products once the Printify
-- products exist and you have approved them.
-- ============================================================
insert into public.shop_products
  (slug, title, category, short_description, description, is_published, is_featured, is_best_seller, is_new, sort_order, seo_title, seo_description, admin_notes)
values
  ('professional-armchair-detective-tshirt',
   'Professional Armchair Detective T-Shirt',
   't-shirts',
   'Black tee with premium detective-style lettering, for solving cases from the sofa.',
   E'You''ve named the culprit before the second ad break, and you''ve been right often enough that nobody at the pub quiz argues any more. This is the shirt for it.\n\nBlack, with detective-inspired typography that looks more like a case file than a slogan.\n\nA proper gift for the person in your life who says "hang on, that doesn''t add up" at the telly.',
   true, true, true, false, 10,
   'Armchair Detective T-Shirt | True Crime T-Shirts UK',
   'A black armchair detective T-shirt for true crime fans. Printed to order and delivered across the UK.',
   'PLACEHOLDER — design artwork, Printify product and prices to follow.'),
  ('my-search-history-needs-an-alibi-tshirt',
   'My Search History Needs an Alibi T-Shirt',
   't-shirts',
   'Black tee with minimalist white and red lettering.',
   E'Forensic pathology, untraceable poisons, how long a body takes to be found. All of it research. Honestly.\n\nMinimalist white lettering with a single line picked out in red, on a black tee. Quiet enough for the office, loud enough that the right people will smile.',
   true, true, false, true, 20,
   'My Search History Needs an Alibi T-Shirt | True Crime Gifts',
   'A funny true crime T-shirt in black with white and red lettering. Printed to order, delivered in the UK.',
   'PLACEHOLDER — design artwork, Printify product and prices to follow.'),
  ('coffee-crime-and-conspiracies-tshirt',
   'Coffee, Crime & Conspiracies T-Shirt',
   't-shirts',
   'Vintage-style black tee with cream lettering.',
   E'Three things that get you through a Tuesday: a strong coffee, a fresh case file and a theory nobody asked for.\n\nVintage-style cream lettering on black, worn-in in look and not in price. For the person who has a corkboard and, at least once, has used string.',
   true, false, true, false, 30,
   'Coffee, Crime & Conspiracies T-Shirt | True Crime Merchandise UK',
   'Vintage-style true crime T-shirt with cream lettering on black. Printed to order and delivered across the UK.',
   'PLACEHOLDER — design artwork, Printify product and prices to follow.'),
  ('true-crime-is-my-comfort-zone-tshirt',
   'True Crime Is My Comfort Zone T-Shirt',
   't-shirts',
   'Minimalist black tee for people who relax with a murder mystery.',
   E'Some people unwind with a bath and a candle. You prefer a documentary about a cold case and a cup of tea, and you sleep fine afterwards.\n\nA minimalist black tee with a single line of type. No skulls, no splatter.',
   true, false, false, true, 40,
   'True Crime Is My Comfort Zone T-Shirt | Gifts for True Crime Lovers',
   'A minimalist black T-shirt for true crime lovers. Printed to order, delivered in the UK.',
   'PLACEHOLDER — design artwork, Printify product and prices to follow.'),
  ('professional-armchair-detective-hoodie',
   'Professional Armchair Detective Hoodie',
   'hoodies',
   'Black hoodie with the Professional Armchair Detective artwork.',
   E'The same standards of evidence as the T-shirt, with room for a thermos and a stack of case notes.\n\nBlack, with the Professional Armchair Detective lettering across the chest. Built for long episodes and longer theories.',
   true, true, false, true, 50,
   'Armchair Detective Hoodie | True Crime Hoodies UK',
   'A black armchair detective hoodie for true crime fans. Printed to order and delivered across the UK.',
   'PLACEHOLDER — design artwork, Printify product and prices to follow.'),
  ('listen-true-crime-hoodie',
   'Listen True Crime Hoodie',
   'hoodies',
   'Black hoodie with the official Listen True Crime logo.',
   E'The official Listen True Crime hoodie. Our logo, a black hoodie, and a quiet signal to fellow listeners that you know your Casefile from your Crime Junkie.',
   true, true, true, false, 60,
   'Listen True Crime Hoodie | True Crime Hoodies UK',
   'The official Listen True Crime logo hoodie in black. Printed to order and delivered across the UK.',
   'PLACEHOLDER — needs the final logo artwork file.'),
  ('professional-armchair-detective-mug',
   'Professional Armchair Detective Mug',
   'mugs',
   'Ceramic mug for the serious investigator''s brew.',
   E'Every investigation needs a brew. This mug holds enough tea for a full two-part episode.\n\nCeramic, with the Professional Armchair Detective lettering. Colour (black or white) to be confirmed.',
   true, false, false, true, 70,
   'Armchair Detective Mug | True Crime Gifts UK',
   'A ceramic armchair detective mug for true crime fans. Printed to order and delivered across the UK.',
   'PLACEHOLDER — choose black or white (or both), then link the Printify product.');

-- Placeholder variants: sizes/colours only. No Printify ids, prices or costs.
insert into public.shop_variants (product_id, colour, colour_hex, size, sort_order)
select p.id, 'Black', '#0a0a0f', s.size, s.ord
from public.shop_products p
cross join (values ('S', 1), ('M', 2), ('L', 3), ('XL', 4), ('2XL', 5)) as s(size, ord)
where p.category in ('t-shirts', 'hoodies');

insert into public.shop_variants (product_id, colour, colour_hex, size, sort_order)
select p.id, c.colour, c.hex, 'One size', c.ord
from public.shop_products p
cross join (values ('White', '#f2f2f5', 1), ('Black', '#0a0a0f', 2)) as c(colour, hex, ord)
where p.category = 'mugs';
