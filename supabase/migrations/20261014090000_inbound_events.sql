-- WhatsApp inbound capture. Every authenticated POST to the provider callback
-- URL is stored raw, before any parsing and before we answer. Chatbots Africa
-- never retries a callback, so this row is the only copy of the customer's
-- message: a sweep reprocesses what failed, counting attempts up to a cap.
-- Service role only: rows hold phone numbers and message text. Kept 30 days,
-- the same as shop_chats.
CREATE TABLE IF NOT EXISTS inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (char_length(provider) <= 40),
  external_id text,                          -- the provider's event/message id, once the format is known
  raw_body text NOT NULL,                    -- exactly as received ('' for an oversized delivery)
  parsed jsonb,                              -- filled by a later parser, never at capture
  headers jsonb NOT NULL DEFAULT '{}',       -- auth, api key, cookie and token headers redacted
  source_ip text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text,                                -- the last processing error
  attempts int NOT NULL DEFAULT 0,           -- processing attempts, capped by the sweep
  last_attempt_at timestamptz,
  gave_up_at timestamptz,                    -- set when the cap or the 24h window is reached
  wa_phone text,                             -- the sender, once parsed
  conversation_id uuid REFERENCES whatsapp_conversations(id) ON DELETE SET NULL
);
ALTER TABLE inbound_events ENABLE ROW LEVEL SECURITY;      -- no policies: service role only
REVOKE ALL ON inbound_events FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS inbound_events_received_idx ON inbound_events (received_at DESC);
-- The sweep's working set: still waiting, not given up.
CREATE INDEX IF NOT EXISTS inbound_events_pending_idx
  ON inbound_events (received_at) WHERE processed_at IS NULL AND gave_up_at IS NULL;
-- A provider replay of the same event lands once the parser sets external_id.
CREATE UNIQUE INDEX IF NOT EXISTS inbound_events_provider_external_key
  ON inbound_events (provider, external_id) WHERE external_id IS NOT NULL;

-- One row per WhatsApp message id, so a replayed or test-posted message is never handled twice.
-- message_log was empty when this was written (0 rows, 0 duplicate ids).
CREATE UNIQUE INDEX IF NOT EXISTS message_log_wa_message_id_key
  ON message_log (wa_message_id) WHERE wa_message_id IS NOT NULL;

SELECT cron.schedule('inbound-events-retention', '40 3 * * *',
  $$DELETE FROM public.inbound_events WHERE received_at < now() - interval '30 days'$$);
