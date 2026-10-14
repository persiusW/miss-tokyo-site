-- WhatsApp inbound capture. Every authenticated POST to the provider callback
-- URL is stored raw, before any parsing, so the payload format can be read off
-- real deliveries. Service role only: rows hold customer phone numbers and
-- message text. Kept 30 days, the same as shop_chats.
CREATE TABLE IF NOT EXISTS inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (char_length(provider) <= 40),
  external_id text,                          -- the provider's event/message id, once the format is known
  raw_body text NOT NULL,                    -- exactly as received
  parsed jsonb,                              -- filled by a later parser, never at capture
  headers jsonb NOT NULL DEFAULT '{}',       -- auth, api key, cookie and token headers redacted
  source_ip text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);
ALTER TABLE inbound_events ENABLE ROW LEVEL SECURITY;      -- no policies: service role only
REVOKE ALL ON inbound_events FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS inbound_events_received_idx ON inbound_events (received_at DESC);
-- A provider retry of the same event lands once the parser sets external_id.
CREATE UNIQUE INDEX IF NOT EXISTS inbound_events_provider_external_key
  ON inbound_events (provider, external_id) WHERE external_id IS NOT NULL;

-- One row per WhatsApp message id, so a redelivered message is never handled twice.
-- message_log was empty when this was written (0 rows, 0 duplicate ids).
CREATE UNIQUE INDEX IF NOT EXISTS message_log_wa_message_id_key
  ON message_log (wa_message_id) WHERE wa_message_id IS NOT NULL;

SELECT cron.schedule('inbound-events-retention', '40 3 * * *',
  $$DELETE FROM public.inbound_events WHERE received_at < now() - interval '30 days'$$);
