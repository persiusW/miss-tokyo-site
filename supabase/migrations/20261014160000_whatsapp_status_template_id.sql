-- The approved Chatbots Africa template (order_status_update) for WhatsApp
-- order updates sent more than 24 hours after the customer's last message.
-- Blank: those updates go by SMS only. Editable on AI Settings. Additive only.
INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_status_template_id', '""',
   'Approved Chatbots Africa template id for order updates (blank = text inside 24h window only)')
ON CONFLICT (key) DO NOTHING;
