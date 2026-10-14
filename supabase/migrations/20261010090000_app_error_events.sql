-- Admin AI tools: error codes users hit (codes and places only — causes stay
-- in the server logs), kept 30 days, recorded only while the switch is on.
-- Also schedules notification_log's 180-day retention, which spec A promised
-- but was never scheduled.
CREATE TABLE IF NOT EXISTS app_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL CHECK (char_length(code) <= 10),
  place text CHECK (char_length(place) <= 120),
  audience text NOT NULL CHECK (audience IN ('staff','customer')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_error_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS app_error_events_created_idx ON app_error_events (created_at DESC);
INSERT INTO ai_settings (key, value, description) VALUES ('mtai_error_log_enabled','false','Record error codes for the errors card on AI Settings') ON CONFLICT (key) DO NOTHING;
SELECT cron.schedule('app-error-events-retention', '25 3 * * *', $$DELETE FROM public.app_error_events WHERE created_at < now() - interval '30 days'$$);
SELECT cron.schedule('notification-log-retention', '30 3 * * *', $$DELETE FROM public.notification_log WHERE created_at < now() - interval '180 days'$$);
