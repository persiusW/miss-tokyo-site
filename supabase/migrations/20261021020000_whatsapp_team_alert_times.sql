-- While a person has a WhatsApp chat the assistant keeps answering. These
-- ration what the team and the customer hear, with a compare-and-set on each:
-- team_alerted_at: the last time the team was alerted (handover or "wrote
--   again"); the team is alerted again at most once an hour.
-- team_referred_at: the last "our team has your message" to the customer; at
--   most once every 6 hours.
alter table public.whatsapp_conversations add column if not exists team_alerted_at timestamptz;
alter table public.whatsapp_conversations add column if not exists team_referred_at timestamptz;

-- Chats with a person now were alerted when they were handed over.
update public.whatsapp_conversations set team_alerted_at = handed_off_at
where handed_off_at is not null and team_alerted_at is null;
