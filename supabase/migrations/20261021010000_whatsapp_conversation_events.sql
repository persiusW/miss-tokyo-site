-- What happened to a WhatsApp chat and who did it: handed to a person, handed
-- back (by whom), marked dealt with, the assistant asked to reply to waiting
-- messages, resumed by itself after 24 h, the team re-alerted. The inbox shows
-- these as markers in the chat. Server only (service role): RLS on, no policies.
create table if not exists public.whatsapp_conversation_events (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.whatsapp_conversations(id) on delete cascade,
    kind text not null check (kind in ('handed_off', 'handed_back', 'dealt_with', 'answered_waiting', 'auto_resumed', 're_alerted')),
    reason text,
    staff_id uuid,
    staff_name text,
    created_at timestamptz not null default now()
);
create index if not exists whatsapp_conversation_events_conv_idx
    on public.whatsapp_conversation_events (conversation_id, created_at desc);
alter table public.whatsapp_conversation_events enable row level security;
revoke all on public.whatsapp_conversation_events from anon, authenticated;

-- Staff marked the chat handled; a later customer message puts it back in "Needs you".
alter table public.whatsapp_conversations add column if not exists dealt_with_at timestamptz;

-- Chats with a person right now get their handover marker.
insert into public.whatsapp_conversation_events (conversation_id, kind, reason, created_at)
select c.id, 'handed_off', c.state->>'reason', c.handed_off_at
from public.whatsapp_conversations c
where c.handed_off_at is not null
  and not exists (select 1 from public.whatsapp_conversation_events e where e.conversation_id = c.id and e.kind = 'handed_off');
