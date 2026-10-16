-- Returns and exchanges asked for in a WhatsApp chat (start_return). The team
-- arranges each one from the inbox; status is for them to mark later. Service
-- role only: RLS on with no policies. Additive only.
CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('wrong_size', 'faulty', 'not_as_described', 'wrong_item', 'changed_mind', 'other')),
  wants text NOT NULL DEFAULT 'unsure' CHECK (wants IN ('exchange', 'store_credit', 'unsure')),
  details text CHECK (details IS NULL OR char_length(details) <= 500),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
-- One open request per order.
CREATE UNIQUE INDEX IF NOT EXISTS return_requests_open_order_key ON return_requests (order_id) WHERE status = 'new';
CREATE INDEX IF NOT EXISTS return_requests_conversation_idx ON return_requests (conversation_id, created_at);

INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_returns_enabled', 'false', 'WhatsApp assistant takes return and exchange requests, then hands the chat to the team')
ON CONFLICT (key) DO NOTHING;
