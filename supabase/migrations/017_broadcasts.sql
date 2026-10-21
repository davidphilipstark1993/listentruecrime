-- ============================================================
-- BROADCASTS
-- One-off emails sent to all active subscribers from /admin/broadcast:
-- a single written message plus optional uploaded media (photos, PDFs…).
-- Entirely separate from the weekly newsletter (newsletters tables).
--
-- Files live in the public `broadcast-media` bucket. The browser uploads
-- directly using a signed upload URL issued by an admin-only API route, so
-- there are no storage write policies for anon/authenticated users.
-- Anyone with a file's (unguessable) URL can open it — that is how email
-- recipients download it.
-- ============================================================
create table if not exists public.broadcasts (
  id               uuid primary key default uuid_generate_v4(),
  subject          text not null,
  message          text not null,
  attachments      jsonb not null default '[]'::jsonb,
  status           text not null default 'sending'
    check (status in ('sending', 'sent', 'failed')),
  recipient_count  integer,
  provider_ref     text,
  error            text,
  sent_by          uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz
);

alter table public.broadcasts enable row level security;

create policy "Admins can do everything on broadcasts"
  on public.broadcasts for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'broadcast-media', 'broadcast-media', true, 26214400,
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'application/zip', 'audio/mpeg'
  ]
)
on conflict (id) do nothing;
