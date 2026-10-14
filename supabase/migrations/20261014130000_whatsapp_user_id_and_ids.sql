-- WhatsApp sender identity and the provider ids we expect. Conversations stay
-- keyed on the phone number (wa_phone_number, NOT NULL); the WhatsApp user id
-- ("GH.<digits>") is kept beside it because usernames may hide numbers later.
-- The two settings drive a soft check on each callback: blank skips it, a
-- mismatch only logs a warning. Additive only.
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS wa_user_id text;

CREATE INDEX IF NOT EXISTS whatsapp_conversations_wa_user_idx
  ON whatsapp_conversations (wa_user_id)
  WHERE wa_user_id IS NOT NULL;

INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_chatbot_id', '""',
   'Expected Chatbots Africa chatbot_id (blank = skip check)'),
  ('whatsapp_phone_number_id', '""',
   'Expected WhatsApp phone_number_id (blank = skip check)')
ON CONFLICT (key) DO NOTHING;
