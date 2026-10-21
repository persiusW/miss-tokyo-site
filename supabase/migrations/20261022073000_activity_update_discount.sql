-- Lets the activity log record a discount code being edited (UPDATE_DISCOUNT).
--
-- The old Discounts page could only create, switch and delete codes; the new
-- one can edit them, and every discount action is logged. The action_type
-- CHECK once silently rejected discount actions for months, so this extends
-- whatever the constraint allows right now (other migrations widen it too)
-- rather than restating a list that may be out of date. It keeps the
-- ARRAY['…'::text, …] form so the next migration can read it the same way.
-- Re-runnable: does nothing when UPDATE_DISCOUNT is already allowed.
do $$
declare vals text[];
begin
  select array_agg(m[1] order by ord) into vals
  from pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') with ordinality as r(m, ord)
  where c.conname = 'activity_logs_action_type_check' and c.conrelid = 'public.activity_logs'::regclass;
  if vals is null or 'UPDATE_DISCOUNT' = any(vals) then return; end if;
  vals := vals || 'UPDATE_DISCOUNT'::text;
  alter table public.activity_logs drop constraint activity_logs_action_type_check;
  execute 'alter table public.activity_logs add constraint activity_logs_action_type_check check (action_type = any (array['
    || (select string_agg(quote_literal(v) || '::text', ', ') from unnest(vals) v) || ']))';
end $$;
