-- WhatsApp templates WITH variables (Chatbots Africa now submits sample
-- values): one id per template key in src/lib/whatsapp/templates.ts, and the
-- staff numbers told about each new paid order. Both start empty, so nothing
-- changes until the owner pastes an approved id or a number in Tools ›
-- WhatsApp. Additive only: the variable-free template rows stay and remain
-- the fallback.
INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_template_ids', '{}',
   'Approved Chatbots Africa template id per template key (src/lib/whatsapp/templates.ts); a key without one falls back to the variable-free template or SMS'),
  ('whatsapp_staff_alert_numbers', '[]',
   'Staff WhatsApp numbers (233…, up to 5) that get the new paid order template; empty = none')
ON CONFLICT (key) DO NOTHING;
