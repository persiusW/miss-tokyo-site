-- Spec B: every Paystack attempt per sale, so failures and outages can be
-- counted. Service role only. Plus the till's live payment status switch.
CREATE TABLE IF NOT EXISTS sale_payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_key uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('pos','online','pay_link','invoice','ai')),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  pos_session_id uuid REFERENCES pos_sessions(id) ON DELETE SET NULL,
  paystack_reference text,
  amount_ghs numeric(10,2),
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','paid','failed','unfinished','error')),
  error_code text,
  paystack_status text,
  paystack_errors int NOT NULL DEFAULT 0,
  gateway_message text CHECK (char_length(gateway_message) <= 200),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sale_payment_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS spa_sale_idx ON sale_payment_attempts (sale_key, created_at);
CREATE INDEX IF NOT EXISTS spa_ref_idx ON sale_payment_attempts (paystack_reference);
CREATE INDEX IF NOT EXISTS spa_session_idx ON sale_payment_attempts (pos_session_id, created_at);
CREATE INDEX IF NOT EXISTS spa_outage_idx ON sale_payment_attempts (created_at) WHERE error_code = 'PAY-01';

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS pos_live_payment_status boolean NOT NULL DEFAULT false;

-- 180-day retention, same as notification_log.
SELECT cron.schedule('sale-payment-attempts-retention', '20 3 * * *',
  $$DELETE FROM public.sale_payment_attempts WHERE created_at < now() - interval '180 days'$$);
