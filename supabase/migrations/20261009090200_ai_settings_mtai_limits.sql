-- Miss Tokyo AI spend share and per-user daily message limit (spec A).
INSERT INTO ai_settings (key, value, description) VALUES
  ('dashboard_cap_share_pct', '60', 'Max % of daily cap Miss Tokyo AI may use (leaves rest for WhatsApp)'),
  ('dashboard_daily_messages_per_user', '100', 'Max messages per staff/owner per day (admin gets 3×)')
ON CONFLICT (key) DO NOTHING;
