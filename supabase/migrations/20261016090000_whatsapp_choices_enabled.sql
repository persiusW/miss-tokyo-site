-- Tappable answers on WhatsApp: the assistant may ask with reply buttons or a
-- list (offer_choices). Off until the owner switches it on from AI Settings,
-- after a live check of both shapes. Additive only.
INSERT INTO ai_settings (key, value, description) VALUES
  ('whatsapp_choices_enabled', 'false',
   'WhatsApp assistant may ask with tappable buttons and lists')
ON CONFLICT (key) DO NOTHING;
