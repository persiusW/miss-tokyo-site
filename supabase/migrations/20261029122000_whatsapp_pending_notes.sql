-- Messages staff wrote to a customer whose 24-hour WhatsApp window had shut.
-- WhatsApp won't deliver free text then, so the customer gets an approved
-- template ("the team has a message for you, reply and we'll send it") and
-- the message waits here; it goes the moment they reply (delivered_at set by
-- a claim, so only one run sends it). Notes older than 7 days are not sent.
-- Server only (service role): RLS on, no policies. Additive.
create table if not exists public.whatsapp_pending_notes (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
    kind text not null check (kind in ('follow_up', 'order_note')),
    body text not null check (char_length(body) between 1 and 1000),
    order_id uuid references public.orders(id) on delete set null,
    staff_id uuid,
    staff_name text,
    created_at timestamptz not null default now(),
    delivered_at timestamptz
);
create index if not exists whatsapp_pending_notes_waiting_idx
    on public.whatsapp_pending_notes (conversation_id, created_at) where delivered_at is null;
alter table public.whatsapp_pending_notes enable row level security;
revoke all on public.whatsapp_pending_notes from anon, authenticated;
