-- WhatsApp templates without variables (Chatbots Africa's template form can't
-- send Meta the sample each variable needs, so every template with one was
-- rejected): one approved template per order status, and team_chat_alert for
-- the WhatsApp half of a handoff alert. Both start empty; the owner pastes the
-- ids from Chatbots Africa once Meta approves them. Additive only: the old
-- whatsapp_status_template_id row stays and is no longer read.
INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_status_template_ids', '{}',
   'Approved Chatbots Africa template id per order status (paid, packed, shipped, ready_for_pickup, fulfilled, cancelled); a missing status goes by SMS only outside the 24h window'),
  ('whatsapp_handoff_template_id', '""',
   'Approved template id (team_chat_alert) for the WhatsApp half of handoff alerts; blank = free text, which WhatsApp drops outside the 24h window')
ON CONFLICT (key) DO NOTHING;
