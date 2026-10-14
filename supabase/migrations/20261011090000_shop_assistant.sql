-- Ask Miss Tokyo, the shop assistant: chats kept on the server (service role
-- only), its own channel and chat link on ai_turns, its switches (off), and
-- 30-day retention. Additive: the channel CHECK is widened, never narrowed.
CREATE TABLE IF NOT EXISTS shop_chats (
  id uuid PRIMARY KEY,                       -- the mt_chat cookie id
  visitor_key text NOT NULL,                 -- HMAC of the visitor's first chat id; no IP stored
  customer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  transcript jsonb NOT NULL DEFAULT '[]',
  verified_orders uuid[] NOT NULL DEFAULT '{}',
  open_orders uuid[] NOT NULL DEFAULT '{}',
  pay_links jsonb NOT NULL DEFAULT '{}',     -- order id -> Paystack link, for open orders only
  sale_key uuid,
  wrong_tries int NOT NULL DEFAULT 0,
  last_quote jsonb,                          -- { key, total, at } for the quote-before-place check
  turns int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shop_chats ENABLE ROW LEVEL SECURITY;          -- no policies: service role only
REVOKE ALL ON shop_chats FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS shop_chats_last_idx ON shop_chats (last_message_at DESC);
CREATE INDEX IF NOT EXISTS shop_chats_visitor_idx ON shop_chats (visitor_key, last_message_at DESC);

ALTER TABLE ai_turns ADD COLUMN IF NOT EXISTS shop_chat_id uuid REFERENCES shop_chats(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ai_turns_shop_chat_idx ON ai_turns (shop_chat_id, created_at) WHERE shop_chat_id IS NOT NULL;

-- Widen the channel list to add 'web'. Every existing row still passes.
ALTER TABLE ai_turns DROP CONSTRAINT IF EXISTS ai_turns_channel_check;
ALTER TABLE ai_turns ADD CONSTRAINT ai_turns_channel_check CHECK (channel IN ('whatsapp', 'dashboard', 'web'));

INSERT INTO ai_settings (key, value, description) VALUES
  ('shop_assistant_enabled', 'false', 'Ask Miss Tokyo chat on the shop'),
  ('shop_assistant_daily_messages_per_visitor', '20', 'Messages per visitor per day'),
  ('shop_assistant_cap_share_pct', '40', 'Share of the daily AI cap the shop chat may use'),
  ('shop_whatsapp_number', '""', 'WhatsApp number for Talk to us (blank = store phone)')
ON CONFLICT (key) DO NOTHING;

SELECT cron.schedule('shop-chats-retention', '35 3 * * *',
  $$DELETE FROM public.shop_chats WHERE last_message_at < now() - interval '30 days'$$);
