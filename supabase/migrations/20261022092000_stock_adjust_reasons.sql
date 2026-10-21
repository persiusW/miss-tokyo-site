-- Stock adjust reasons (BACKEND_GAPS 9). Products › Inventory › Adjust asks why
-- stock changed: "New stock arrived" (restock), "I counted it" (stock_count),
-- "Damaged or lost" (write_off) or "Fix a mistake" (correction). Analytics'
-- Stock written off report already reads write_off rows. Additive only.

-- 1. The reason list. The constraint is rebuilt from whatever it allows right
--    now plus the three new reasons, so a reason another change added in the
--    meantime is kept rather than dropped.
do $$
declare
  v_def text;
  v_list text;
begin
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'public.stock_movements'::regclass and conname = 'stock_movements_reason_check';

  -- Written back in the same ARRAY['x'::text, …] form it was read in.
  select string_agg(quote_literal(r) || '::text', ', ' order by r) into v_list
  from (
    select (regexp_matches(coalesce(v_def, ''), '''([a-z_]+)''::text', 'g'))[1] as r
    union select unnest(array['restock', 'stock_count', 'write_off'])
  ) x;

  alter table public.stock_movements drop constraint if exists stock_movements_reason_check;
  execute 'alter table public.stock_movements add constraint stock_movements_reason_check check (reason = any (array[' || v_list || ']))';
end $$;

-- 2. Where the stock is. One location today, so it stays null; a second shop
--    or store room can be added later without changing the ledger.
alter table public.stock_movements add column if not exists location_id uuid;
comment on column public.stock_movements.location_id is
  'Which location the stock moved at. Null = the shop (the only location today).';

-- 3. One adjustment, through the ledger. Delegates to fn_apply_stock_movement,
--    the only function that changes stock, under the caller's idempotency key,
--    so a double tap or a retry is recorded once.
--
--    restock      adds p_quantity
--    write_off    removes p_quantity, at most what is there
--    correction   adds p_quantity, which may be negative (at most what is there)
--    stock_count  p_quantity is what was counted; the change is worked out here
--                 from the number in the row, after locking it, so a sale that
--                 lands at the same moment can't be overwritten by the count
--
--    Rows are locked variant first, then product: the same order as
--    fn_apply_stock_movement, so an adjustment and a sale queue instead of
--    deadlocking. A variant-tracked product must name its variant (no moving
--    the roll-up alone, the old oversell path), and untracked products refuse.
create or replace function public.fn_stock_adjust(
  p_product_id uuid,
  p_variant_id uuid,
  p_reason text,
  p_quantity integer,
  p_actor uuid,
  p_idempotency_key text,
  p_note text default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_track boolean;
  v_by_variant boolean;
  v_before integer;
  v_after integer;
  v_delta integer;
  v_applied boolean;
begin
  if p_reason is null or p_reason not in ('restock', 'stock_count', 'write_off', 'correction') then
    raise exception 'stock_adjust: unknown reason' using errcode = '22023';
  end if;
  if p_quantity is null or (p_reason <> 'correction' and p_quantity < 0) or abs(p_quantity) > 100000 then
    raise exception 'stock_adjust: bad quantity' using errcode = '22023';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then
    raise exception 'stock_adjust: idempotency key required' using errcode = '22023';
  end if;

  -- Already done under this key: report where stock stands, change nothing.
  if exists (select 1 from public.stock_movements where idempotency_key = p_idempotency_key) then
    select coalesce(case when p_variant_id is null then p.inventory_count else v.inventory_count end, 0)
      into v_after
      from public.products p
      left join public.product_variants v on v.id = p_variant_id
     where p.id = p_product_id;
    return jsonb_build_object('applied', false, 'duplicate', true, 'after', v_after);
  end if;

  select track_inventory is not false, coalesce(track_variant_inventory, false)
    into v_track, v_by_variant
    from public.products where id = p_product_id;
  if not found then
    raise exception 'stock_adjust: product not found' using errcode = 'P0002';
  end if;
  if not v_track then
    raise exception 'stock_adjust: product does not track stock' using errcode = '22023';
  end if;

  if v_by_variant then
    if p_variant_id is null then
      raise exception 'stock_adjust: choose a size or colour' using errcode = '22023';
    end if;
    select coalesce(inventory_count, 0) into v_before
      from public.product_variants
     where id = p_variant_id and product_id = p_product_id
       for update;
    if not found then
      raise exception 'stock_adjust: variant not found' using errcode = 'P0002';
    end if;
    perform 1 from public.products where id = p_product_id for update;
  else
    if p_variant_id is not null then
      raise exception 'stock_adjust: product has no sizes to adjust' using errcode = '22023';
    end if;
    select coalesce(inventory_count, 0) into v_before
      from public.products where id = p_product_id for update;
  end if;

  if v_before = 9999 then
    raise exception 'stock_adjust: product does not track stock' using errcode = '22023';
  end if;

  -- Never take off more than is there. fn_apply_stock_movement floors the
  -- variant and the roll-up at zero separately, so removing 5 from a size that
  -- has 1 would take 1 off the size but 5 off the roll-up, and the two drift.
  v_delta := case p_reason
    when 'restock' then p_quantity
    when 'write_off' then -least(p_quantity, v_before)
    when 'stock_count' then p_quantity - v_before
    else greatest(p_quantity, -v_before)
  end;

  if v_delta = 0 then
    return jsonb_build_object('applied', false, 'unchanged', true, 'before', v_before, 'after', v_before, 'delta', 0);
  end if;

  v_applied := public.fn_apply_stock_movement(
    p_product_id      => p_product_id,
    p_variant_id      => p_variant_id,
    p_delta           => v_delta,
    p_reason          => p_reason,
    p_actor           => p_actor,
    p_idempotency_key => p_idempotency_key,
    p_note            => nullif(btrim(coalesce(p_note, '')), '')
  );

  if p_variant_id is not null then
    select coalesce(inventory_count, 0) into v_after from public.product_variants where id = p_variant_id;
  else
    select coalesce(inventory_count, 0) into v_after from public.products where id = p_product_id;
  end if;

  return jsonb_build_object('applied', coalesce(v_applied, false), 'before', v_before, 'after', v_after, 'delta', v_delta);
end;
$$;

revoke execute on function public.fn_stock_adjust(uuid, uuid, text, integer, uuid, text, text) from public, anon, authenticated;
grant execute on function public.fn_stock_adjust(uuid, uuid, text, integer, uuid, text, text) to service_role;
