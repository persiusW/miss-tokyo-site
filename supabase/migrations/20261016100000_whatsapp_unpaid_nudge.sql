-- One WhatsApp reminder for an order placed in a WhatsApp chat and still
-- unpaid 30 to 60 minutes later. wa_nudged_at is the claim: set before the
-- send, so an order is reminded at most once. Off until the owner switches it
-- on from AI Settings. Additive only.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wa_nudged_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_wa_unpaid_nudge_idx ON orders (created_at)
  WHERE source = 'whatsapp' AND wa_nudged_at IS NULL;

INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_unpaid_nudge_enabled', 'false',
   'One WhatsApp reminder for WhatsApp orders unpaid after 30 minutes')
ON CONFLICT (key) DO NOTHING;
