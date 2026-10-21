-- Customer tags (BACKEND_GAPS 11) and private notes (BACKEND_GAPS 12).
--
-- contact_key is lower(email), the same key the customer page URL uses
-- (/customers/<email>) and the one the customer list groups by. Neither table
-- references contacts or profiles by id: most customers are known only from
-- their orders, so the email is the only key every source shares.
--
-- RLS on with no policies: only the service role (server actions that check
-- the staff role first) reads or writes them.
create table if not exists public.contact_tags (
  contact_key text not null check (contact_key <> '' and contact_key = lower(contact_key)),
  tag text not null check (char_length(tag) between 1 and 30 and tag = btrim(tag)),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (contact_key, tag)
);
-- "VIP" and "vip" are one tag on one customer.
create unique index if not exists contact_tags_key_tag_ci on public.contact_tags (contact_key, lower(tag));
create index if not exists contact_tags_tag_ci on public.contact_tags (lower(tag));

alter table public.contact_tags enable row level security;
revoke all on public.contact_tags from public, anon, authenticated;
grant select, insert, update, delete on public.contact_tags to service_role;

create table if not exists public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  contact_key text not null check (contact_key <> '' and contact_key = lower(contact_key)),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  author uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists contact_notes_key_created on public.contact_notes (contact_key, created_at desc);

alter table public.contact_notes enable row level security;
revoke all on public.contact_notes from public, anon, authenticated;
grant select, insert, update, delete on public.contact_notes to service_role;
