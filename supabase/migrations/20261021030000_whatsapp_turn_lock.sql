-- One assistant turn at a time per WhatsApp chat. Two messages answered at
-- once both load the chat, and the second save loses ("I'm still answering
-- your last message"). A turn takes the lock with a compare-and-set
-- (null or expired), the next message waits for it, and a crashed turn's
-- lock simply expires.
alter table public.whatsapp_conversations add column if not exists turn_lock_until timestamptz;
