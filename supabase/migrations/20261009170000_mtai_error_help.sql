-- Spec B PR 3: the switch for "Ask Miss Tokyo AI" on payment errors (off),
-- and the key that rate-limits seeded asks.
INSERT INTO ai_settings (key, value, description) VALUES ('mtai_error_help_enabled','false','Ask Miss Tokyo AI on payment error toasts') ON CONFLICT (key) DO NOTHING;
ALTER TABLE ai_turns ADD COLUMN IF NOT EXISTS seed_key text;
CREATE INDEX IF NOT EXISTS ai_turns_seed_idx ON ai_turns (user_id, seed_key, created_at) WHERE seed_key IS NOT NULL;
