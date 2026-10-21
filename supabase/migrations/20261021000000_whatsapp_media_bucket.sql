-- Copies of the photos, voice notes, videos and files customers send on
-- WhatsApp, so staff can review a chat after Meta drops the original (~30
-- days). Private: only the server (service role) writes, and the inbox shows
-- a file through a short-lived signed link after a staff check. Kept until
-- deleted (owner decision 2026-10-21). 5 MB matches the download cap.
insert into storage.buckets (id, name, public, file_size_limit)
values ('whatsapp-media', 'whatsapp-media', false, 5242880)
on conflict (id) do nothing;
