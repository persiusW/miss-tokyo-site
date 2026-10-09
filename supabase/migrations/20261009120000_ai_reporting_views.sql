-- Read-only reporting layer for Miss Tokyo AI's admin-only SQL tool.
--
-- The model never sees the real tables. It queries these views, which carry
-- the business rules (a sale = payment_status 'paid'; staff = recorded_by or
-- the till session's creator; one primary category per product) and no phone
-- numbers or emails. It runs as ai_reader, which can SELECT from reporting.*
-- and nothing else, inside a read-only transaction with a 5s timeout.
-- The reporting schema is not exposed through the REST API.

CREATE SCHEMA IF NOT EXISTS reporting;

CREATE OR REPLACE VIEW reporting.orders AS
SELECT
    o.id,
    coalesce(o.ref, upper(left(o.id::text, 8))) AS ref,
    o.created_at,
    (o.created_at AT TIME ZONE 'UTC')::date AS day,
    CASE WHEN o.source = 'pos' THEN 'pos' ELSE 'online' END AS channel,
    o.status,
    o.payment_status,
    o.fulfillment_status,
    o.payment_method,
    o.total_amount,
    o.delivery_fee,
    o.delivery_method,
    o.delivery_zone,
    o.discount_code,
    coalesce(o.discount_amount, 0) AS discount_amount,
    coalesce(o.auto_discount_amount, 0) AS auto_discount_amount,
    o.has_preorder,
    o.customer_name,
    CASE WHEN o.source = 'pos'
        THEN coalesce(nullif(btrim(p.full_name), ''), split_part(p.email, '@', 1), 'Unknown staff')
    END AS staff_name
FROM public.orders o
LEFT JOIN public.pos_sessions ps ON ps.order_id = o.id AND o.recorded_by IS NULL
LEFT JOIN public.profiles p ON p.id = coalesce(o.recorded_by, ps.created_by);

CREATE OR REPLACE VIEW reporting.paid_orders AS
SELECT * FROM reporting.orders WHERE payment_status = 'paid';

CREATE OR REPLACE VIEW reporting.products AS
SELECT
    pr.id,
    btrim(pr.name) AS name,
    pr.sku,
    pr.price_ghs AS price,
    pr.is_sale,
    pr.discount_value AS sale_discount_pct,
    pr.is_active AS active,
    pr.track_inventory,
    pr.track_variant_inventory,
    pr.inventory_count,
    pr.preorder_enabled,
    coalesce(c1.name, (SELECT c2.name FROM public.categories c2 WHERE c2.id = ANY (pr.category_ids) LIMIT 1), pr.category_type, 'Uncategorised') AS category,
    pr.created_at
FROM public.products pr
LEFT JOIN public.categories c1 ON c1.id = pr.category_id;

CREATE OR REPLACE VIEW reporting.sales_lines AS
SELECT
    o.id AS order_id,
    o.ref,
    o.created_at,
    o.day,
    o.channel,
    o.payment_method,
    o.staff_name,
    (it ->> 'productId')::uuid AS product_id,
    btrim(coalesce(it ->> 'name', rp.name)) AS product_name,
    rp.category,
    nullif(it ->> 'size', '') AS size,
    nullif(it ->> 'color', '') AS colour,
    nullif(it ->> 'brand', '') AS brand,
    coalesce((it ->> 'quantity')::int, 1) AS quantity,
    coalesce((it ->> 'price')::numeric, 0) AS unit_price,
    coalesce((it ->> 'price')::numeric, 0) * coalesce((it ->> 'quantity')::int, 1) AS line_total,
    coalesce((it ->> 'isPreOrder')::boolean, false) AS is_preorder
FROM reporting.paid_orders o
JOIN public.orders src ON src.id = o.id
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(src.items) = 'array' THEN src.items ELSE '[]'::jsonb END) it
LEFT JOIN reporting.products rp ON rp.id = (it ->> 'productId')::uuid
WHERE (it ->> 'productId') ~ '^[0-9a-f-]{36}$' OR (it ->> 'productId') IS NULL;

CREATE OR REPLACE VIEW reporting.stock AS
SELECT
    rp.id AS product_id, rp.name AS product_name, rp.sku, rp.category, rp.active,
    v.size, v.color AS colour, v.brand, coalesce(v.inventory_count, 0) AS on_hand
FROM reporting.products rp
JOIN public.product_variants v ON v.product_id = rp.id
WHERE rp.track_inventory AND rp.track_variant_inventory
UNION ALL
SELECT rp.id, rp.name, rp.sku, rp.category, rp.active, NULL, NULL, NULL, coalesce(rp.inventory_count, 0)
FROM reporting.products rp
WHERE rp.track_inventory AND NOT coalesce(rp.track_variant_inventory, false);

-- The only role the model's SQL ever runs as.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ai_reader') THEN
        CREATE ROLE ai_reader NOLOGIN NOINHERIT;
    END IF;
END $$;
GRANT USAGE ON SCHEMA reporting TO ai_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO ai_reader;
REVOKE ALL ON SCHEMA reporting FROM PUBLIC, anon, authenticated;
-- service_role (and postgres, for maintenance) may switch to ai_reader.
GRANT ai_reader TO service_role;
GRANT ai_reader TO postgres;

-- Every query the admin tool runs.
CREATE TABLE IF NOT EXISTS ai_query_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    sql text NOT NULL,
    ok boolean NOT NULL,
    row_count int,
    error text,
    duration_ms int,
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_query_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS ai_query_log_created_idx ON ai_query_log (created_at DESC);

-- Runs one SELECT against reporting.* as ai_reader: read-only, 5s, ≤200 rows.
-- statement_timeout must sit on the function header: PostgREST applies it
-- before the call, while a SET LOCAL inside the body never arms the timer.
-- PostgREST puts the caller's headers (service-role key included) into
-- request.* settings, which any role can read, so they are blanked first.
CREATE OR REPLACE FUNCTION public.fn_ai_reporting_query(p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path TO reporting
SET statement_timeout TO '5s'
AS $function$
DECLARE
    result jsonb;
    g text;
BEGIN
    IF p_sql IS NULL OR length(p_sql) > 4000 THEN
        RAISE EXCEPTION 'query must be between 1 and 4000 characters';
    END IF;
    IF position(';' IN p_sql) > 0 THEN
        RAISE EXCEPTION 'one statement only';
    END IF;
    IF p_sql !~* '^\s*(select|with)\s' THEN
        RAISE EXCEPTION 'SELECT queries only';
    END IF;
    -- Settings readers, and functions that run a query passed in as text.
    IF p_sql ~* '(current_setting|set_config|pg_settings|pg_show_all_settings|_to_xml|ts_stat|pg_sleep|dblink|lo_\w+\s*\()' THEN
        RAISE EXCEPTION 'that function is not allowed here';
    END IF;
    -- Listed by name: placeholder settings never appear in pg_settings.
    FOREACH g IN ARRAY ARRAY['request.headers', 'request.cookies', 'request.jwt.claims',
                             'request.jwt.claim.role', 'request.jwt.claim.sub', 'request.jwt.claim.email'] LOOP
        PERFORM set_config(g, '', true);
    END LOOP;
    SET LOCAL transaction_read_only = on;
    SET LOCAL ROLE ai_reader;
    EXECUTE format('SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM (%s) q LIMIT 200) t', p_sql)
        INTO result;
    RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_ai_reporting_query(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ai_reporting_query(text) TO service_role;
