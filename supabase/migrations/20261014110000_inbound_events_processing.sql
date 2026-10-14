-- Chatbots Africa never retries a callback, so a stored event is the only copy
-- of a customer's message. These columns let a sweep reprocess what failed:
-- an attempt counter with a cap, when it last ran, when we gave up, and which
-- sender and conversation the event turned out to belong to. Additive only.
ALTER TABLE inbound_events
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS gave_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS wa_phone text,
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES whatsapp_conversations(id) ON DELETE SET NULL;

-- The sweep's working set: still waiting, not given up.
CREATE INDEX IF NOT EXISTS inbound_events_pending_idx
  ON inbound_events (received_at) WHERE processed_at IS NULL AND gave_up_at IS NULL;
