-- Merchandise collections.
-- Additive only: three new columns on shop_products, all nullable or defaulted, so
-- existing rows and every existing query keep working unchanged.
--
--   collection  which themed collection a product belongs to (storefront grouping)
--   design      the artwork a product carries; the same design sold on several
--               products (tee, hoodie, mug...) shares this value, used for cross-sells
--   tags        search/merchandising tags (not shown in the UI yet; used for SEO copy)

alter table public.shop_products
  add column if not exists collection text
    check (collection is null or collection in ('armchair-detective', 'podcast-addict', 'case-files')),
  add column if not exists design text,
  add column if not exists tags text[] not null default '{}';

create index if not exists shop_products_collection_idx
  on public.shop_products (collection, sort_order)
  where collection is not null;

create index if not exists shop_products_design_idx
  on public.shop_products (design)
  where design is not null;
