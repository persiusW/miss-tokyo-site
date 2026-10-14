-- WhatsApp agent groundwork: link a conversation to the shop chat engine's
-- transcript and to a customer account, record opt-in/opt-out (Ghana Data
-- Protection Act 2012 and WhatsApp's opt-in rules), track the 24-hour reply
-- window, and name the provider. Additive only; every column is nullable.
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS shop_chat_id uuid REFERENCES shop_chats(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opted_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS opt_in_source text CHECK (opt_in_source IS NULL OR char_length(opt_in_source) <= 40),
  ADD COLUMN IF NOT EXISTS opted_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider text CHECK (provider IS NULL OR char_length(provider) <= 40);
CREATE INDEX IF NOT EXISTS whatsapp_conversations_customer_idx ON whatsapp_conversations (customer_id) WHERE customer_id IS NOT NULL;

INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_provider', '"chatbots_africa"', 'Which WhatsApp provider sends and receives'),
  ('whatsapp_status_notifications', 'false', 'Send order status updates on WhatsApp to opted-in customers'),
  ('whatsapp_wallet_alert_number', '""', 'Staff number alerted when the WhatsApp wallet runs low (blank = none)')
ON CONFLICT (key) DO NOTHING;

-- whatsapp_enabled was found ON in production with nothing yet reading it.
-- Processing will be gated on it, so it starts off; the owner turns it on.
UPDATE ai_settings SET value = 'false' WHERE key = 'whatsapp_enabled';
