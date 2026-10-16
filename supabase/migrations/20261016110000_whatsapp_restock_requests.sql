-- Back-in-stock alerts asked for in a WhatsApp chat: a product, optionally a
-- size and colour, and when the customer was told. The website's
-- back_in_stock_requests (email, unused) is left as it is. Service role only:
-- RLS on with no policies. Additive only.
CREATE TABLE IF NOT EXISTS whatsapp_restock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size text CHECK (size IS NULL OR char_length(size) <= 40),
  colour text CHECK (colour IS NULL OR char_length(colour) <= 60),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz
);
ALTER TABLE whatsapp_restock_requests ENABLE ROW LEVEL SECURITY;
-- One open alert per piece per chat.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_restock_requests_open_key
  ON whatsapp_restock_requests (conversation_id, product_id, coalesce(size, ''), coalesce(colour, ''))
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS whatsapp_restock_requests_pending_idx
  ON whatsapp_restock_requests (created_at) WHERE status = 'pending';

INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_restock_alerts_enabled', 'false', 'Back-in-stock alerts on WhatsApp for pieces customers ask about'),
  ('whatsapp_restock_template_id', '""', 'Approved Chatbots Africa template id for back-in-stock alerts (blank = only inside the 24h window)')
ON CONFLICT (key) DO NOTHING;
