-- Where a WhatsApp chat is forwarded when it goes to a person. Blank means
-- the shop's WhatsApp number (shop_whatsapp_number, else the store phone).
-- Editable on AI Settings. Additive only.
INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_handoff_number', '""',
   'WhatsApp number that gets chats needing a person (blank = shop WhatsApp number)')
ON CONFLICT (key) DO NOTHING;
