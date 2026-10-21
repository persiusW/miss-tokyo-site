-- Lets the activity log record the new order actions: refunds (REFUND_ORDER),
-- cancellations made from the cancel panel (CANCEL_ORDER), parcels packed
-- from part of an order (PARTIAL_FULFILMENT), notes sent to the customer
-- (NOTE_TO_CUSTOMER) and staff notes saved on the order (STAFF_NOTE).
--
-- Extends whatever the constraint allows right now (other migrations widen it
-- too), keeping the ARRAY['…'::text, …] form. Re-runnable.
do $$
declare
  vals text[];
  extra text[] := array['REFUND_ORDER', 'CANCEL_ORDER', 'PARTIAL_FULFILMENT', 'NOTE_TO_CUSTOMER', 'STAFF_NOTE'];
  v text;
  changed boolean := false;
begin
  select array_agg(m[1] order by ord) into vals
  from pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') with ordinality as r(m, ord)
  where c.conname = 'activity_logs_action_type_check' and c.conrelid = 'public.activity_logs'::regclass;
  if vals is null then return; end if;
  foreach v in array extra loop
    if not (v = any(vals)) then vals := vals || v; changed := true; end if;
  end loop;
  if not changed then return; end if;
  alter table public.activity_logs drop constraint activity_logs_action_type_check;
  execute 'alter table public.activity_logs add constraint activity_logs_action_type_check check (action_type = any (array['
    || (select string_agg(quote_literal(x) || '::text', ', ') from unnest(vals) x) || ']))';
end $$;
