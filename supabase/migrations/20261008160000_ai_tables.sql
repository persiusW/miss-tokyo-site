-- Tables for the WhatsApp agent and the staff Store Assistant.
-- RLS is on everywhere. Only ai_settings has a policy (admin/owner); the rest
-- have none, so they are reachable through the service role alone.

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_phone_number text NOT NULL,
  wa_contact_name text,
  state jsonb NOT NULL DEFAULT '{}',
  current_order_draft jsonb,
  assigned_staff_id uuid REFERENCES profiles(id),
  handed_off_at timestamptz,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(wa_phone_number)
);
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  content text, media_url text, wa_message_id text,
  message_type text DEFAULT 'text',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS message_log_conversation_created_idx ON message_log (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS ai_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'dashboard')),
  model text, input_tokens int, output_tokens int, thinking_tokens int,
  cost_usd numeric(12, 6), tool_calls jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ai_turns ENABLE ROW LEVEL SECURITY;
-- Additive extras: who asked (dashboard), and cache usage so cost is exact.
ALTER TABLE ai_turns ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE ai_turns ADD COLUMN IF NOT EXISTS cache_read_tokens int;
ALTER TABLE ai_turns ADD COLUMN IF NOT EXISTS cache_write_tokens int;
CREATE INDEX IF NOT EXISTS ai_turns_created_idx ON ai_turns (created_at);
CREATE INDEX IF NOT EXISTS ai_turns_user_created_idx ON ai_turns (user_id, created_at);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  paystack_reference text UNIQUE, authorization_url text,
  amount_ghs numeric(10, 2),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  paid_at timestamptz, created_at timestamptz DEFAULT now()
);
ALTER TABLE payment_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS payment_attempts_order_idx ON payment_attempts (order_id);

CREATE TABLE IF NOT EXISTS ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL, value jsonb NOT NULL,
  description text, updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_owner_only" ON ai_settings
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'owner')
  ));

INSERT INTO ai_settings (key, value, description) VALUES
  ('daily_spend_cap_ghs', '50', 'Max GHS to spend on AI API per day'),
  ('whatsapp_enabled', 'true', 'Enable WhatsApp agent'),
  ('dashboard_agent_enabled', 'true', 'Enable on-site dashboard agent'),
  ('hold_minutes_whatsapp', '15', 'Stock hold time for WhatsApp orders (minutes)'),
  ('admin_cost_markup_pct', '0', 'Hidden admin markup on AI costs (percentage)')
ON CONFLICT (key) DO NOTHING;
