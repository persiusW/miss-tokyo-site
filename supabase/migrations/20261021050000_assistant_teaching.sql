-- Teach the assistant (shared WhatsApp agent spec, ported from GlowBook).
-- Lessons are short standing facts staff teach it: typed notes about the shop
-- and its products, corrections of a reply, hints given in a chat, and photo
-- flashcards (a photo of a piece and which product it is). They reach the
-- model as data in its prompt, never as instructions. Server only (service
-- role): RLS on, no policies.
create table if not exists public.assistant_lessons (
    id uuid primary key default gen_random_uuid(),
    kind text not null check (kind in ('note', 'correction', 'hint', 'photo')),
    title text not null check (char_length(title) between 1 and 80),
    body text not null check (char_length(body) between 1 and 400),
    active boolean not null default true,
    source_message_id uuid references public.message_log(id) on delete set null,
    image_path text,
    created_by uuid,
    created_by_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists assistant_lessons_active_idx on public.assistant_lessons (active, created_at desc);
alter table public.assistant_lessons enable row level security;
revoke all on public.assistant_lessons from anon, authenticated;

-- One photo in a flashcard round: the model's guess, then staff's verdict.
create table if not exists public.assistant_photo_cards (
    id uuid primary key default gen_random_uuid(),
    round_id uuid not null,
    image_path text not null,
    description text,
    guess_product_id uuid,
    guess_name text,
    verdict text not null default 'pending' check (verdict in ('pending', 'correct', 'wrong', 'skipped', 'failed')),
    answer_product_id uuid,
    answer_name text,
    why_text text,
    lesson_id uuid references public.assistant_lessons(id) on delete set null,
    claimed_at timestamptz,
    created_by uuid,
    created_at timestamptz not null default now()
);
create index if not exists assistant_photo_cards_round_idx on public.assistant_photo_cards (round_id, created_at);
alter table public.assistant_photo_cards enable row level security;
revoke all on public.assistant_photo_cards from anon, authenticated;

-- A message staff sent from the inbox (Reply myself): who sent it. Never corrected as the assistant's.
alter table public.message_log add column if not exists sent_by_staff uuid;
alter table public.message_log add column if not exists sent_by_name text;

-- Chat markers for the composer: staff replied from the inbox, or told the assistant something.
alter table public.whatsapp_conversation_events drop constraint if exists whatsapp_conversation_events_kind_check;
alter table public.whatsapp_conversation_events add constraint whatsapp_conversation_events_kind_check
    check (kind in ('handed_off', 'handed_back', 'dealt_with', 'answered_waiting', 'auto_resumed', 're_alerted', 'staff_replied', 'told_assistant'));
