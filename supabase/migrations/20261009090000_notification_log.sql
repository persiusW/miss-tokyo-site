-- Every SMS and email the app sends, written by sendSMS / sendEmail.
-- Service role only (RLS on, no policies). Retention: 180 days (spec A).
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  recipient text NOT NULL,
  recipient_key text NOT NULL,
  event text,
  subject text,
  body text,
  provider_id text,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_code text,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS notification_log_recipient_idx ON notification_log (recipient_key, created_at DESC);
CREATE INDEX IF NOT EXISTS notification_log_created_idx ON notification_log (created_at);
