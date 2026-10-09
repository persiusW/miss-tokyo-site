-- Miss Tokyo AI extras, each off until it passes its production check.
INSERT INTO ai_settings (key, value, description) VALUES
  ('mtai_send_to_admin_enabled', 'false', 'Staff can send a question Miss Tokyo AI could not answer to the admin inbox'),
  ('mtai_bell_enabled', 'false', 'Topbar bell shows unread admin replies (staff) or open questions (admin)'),
  ('mtai_walkthroughs_enabled', 'false', 'Miss Tokyo AI can start step-by-step walkthroughs'),
  ('mtai_voice_enabled', 'false', 'Microphone button in the Miss Tokyo AI chat box')
ON CONFLICT (key) DO NOTHING;
