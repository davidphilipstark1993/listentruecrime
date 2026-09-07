-- Tracks the order published podcasts get auto-featured in the weekly
-- newsletter. A trigger (not app-level bookkeeping) assigns the position so
-- every current and future path that publishes a podcast — add-to-directory,
-- discovery approval, CSV import, manual admin edit — appends it to the back
-- of the queue automatically, with nothing to remember to keep in sync.

alter table podcasts add column if not exists newsletter_queue_position integer;

create or replace function assign_newsletter_queue_position()
returns trigger as $$
begin
  if new.is_published = true and new.newsletter_queue_position is null then
    select coalesce(max(newsletter_queue_position), 0) + 1 into new.newsletter_queue_position from podcasts;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assign_newsletter_queue_position on podcasts;
create trigger trg_assign_newsletter_queue_position
  before insert or update on podcasts
  for each row
  execute function assign_newsletter_queue_position();

create index if not exists idx_podcasts_newsletter_queue_position on podcasts (newsletter_queue_position);

-- One-time backfill: assign a random permutation to every currently-published
-- podcast that doesn't have a position yet (the existing catalog, shuffled
-- once — new podcasts publish onto the back of this order going forward).
with shuffled as (
  select id, row_number() over (order by random()) as rn
  from podcasts
  where is_published = true and newsletter_queue_position is null
)
update podcasts
set newsletter_queue_position = shuffled.rn
from shuffled
where podcasts.id = shuffled.id;
