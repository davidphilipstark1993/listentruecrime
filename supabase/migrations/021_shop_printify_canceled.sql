-- Shop hardening (29 Oct 2026). SCHEMA ONLY — no existing rows are changed.
-- Run this BEFORE deploying the matching code: the code writes the new status
-- and columns.
--
--  • 'printify_canceled': a PAID order that Printify has cancelled. Terminal and
--    shown under "needs attention"; nothing is retried or recreated automatically.
--  • send_attempts / next_send_retry_at: cap and back off the send-to-production
--    step (it used to retry on every run, forever).
--  • printify_synced_at: lets the scheduled job poll Printify for in-flight
--    orders, so cancellations are noticed even without a webhook.
--  • shop_webhook_events.livemode: records whether each Stripe event was LIVE or
--    TEST, so a key / webhook-secret mix-up shows in the admin.

do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.shop_orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%fulfilment_status%'
  loop
    execute format('alter table public.shop_orders drop constraint %I', c);
  end loop;
end $$;

alter table public.shop_orders
  add constraint shop_orders_fulfilment_status_check check (fulfilment_status in (
    'awaiting_payment', 'queued', 'submitting', 'created', 'in_production',
    'shipped', 'delivered', 'failed', 'needs_review', 'cancelled', 'printify_canceled'
  ));

alter table public.shop_orders
  add column if not exists send_attempts      integer not null default 0,
  add column if not exists next_send_retry_at timestamptz,
  add column if not exists printify_synced_at timestamptz;

alter table public.shop_webhook_events
  add column if not exists livemode boolean;
