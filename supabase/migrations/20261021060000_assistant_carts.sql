-- The shop assistant's basket on WhatsApp: pieces a customer collects across
-- messages before checkout. Kept outside the chat's history, so a long chat or
-- the 4-hour fresh start never loses it; one per shopper (the visitor key,
-- which on WhatsApp is the number), ignored after 24 hours idle and emptied
-- when the order is placed. Server only (service role): RLS on, no policies.
create table if not exists public.assistant_carts (
    visitor_key text primary key,
    items jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
);
alter table public.assistant_carts enable row level security;
revoke all on public.assistant_carts from anon, authenticated;
