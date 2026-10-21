-- The Chatbots Africa wallet pays for every WhatsApp message; when it runs out
-- replies and order updates stop. The 5-minute sweep checks it hourly and
-- texts the alert number once a day when it is below this many cedis.
INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_wallet_alert_ghs', '50', 'Text the alert number when the Chatbots Africa wallet is below this many GHS (0 = off)')
ON CONFLICT (key) DO NOTHING;

-- Blank no longer means "no alerts": it falls back to the handoff number, then the shop's WhatsApp number.
UPDATE ai_settings
SET description = 'Who gets WhatsApp wallet and AI budget alerts (blank = the handoff number, else the shop''s WhatsApp number)'
WHERE key = 'whatsapp_wallet_alert_number';
