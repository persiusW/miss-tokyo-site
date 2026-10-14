-- notification_log records WhatsApp sends alongside SMS and email. The CHECK
-- is swapped in one migration (one transaction), so there is no moment when
-- the table accepts any channel at all. Widening only: every existing row
-- ('sms' or 'email') still passes.
ALTER TABLE notification_log DROP CONSTRAINT IF EXISTS notification_log_channel_check;
ALTER TABLE notification_log ADD CONSTRAINT notification_log_channel_check
  CHECK (channel IN ('sms', 'email', 'whatsapp'));
