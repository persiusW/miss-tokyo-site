-- ============================================================
-- Stock movements ledger.
--
-- Until now inventory_count was a bare mutable counter with six writers and no
-- record of who moved it, for which order, or whether the move had already
-- happened. Every symptom we chased traces back to that one absence:
--
--   * a sale whose line could not resolve to a variant row decremented the
--     product roll-up only, and nothing recorded that it had gone wrong;
--   * the verify route and the webhook could both settle the same payment, and
--     the second decrement was indistinguishable from a second sale;
--   * a cancelled or refunded order could not be restocked, because nothing
--     knew what the sale had taken — 555 cancelled orders, some paid before
--     cancellation and some abandoned before payment, with no way to tell them
--     apart after the fact.
--
-- Every write to inventory_count now goes through fn_apply_stock_movement,
-- which appends a row here first. The unique idempotency_key makes a repeated
-- write a no-op, and the recorded history makes a reversal exact.
--
-- Additive only. One new table, four new functions, and two existing functions
-- re-pointed at the new core via CREATE OR REPLACE — their signatures are
-- unchanged, so every existing caller keeps working untouched.
-- ============================================================

-- 1. The ledger itself.
--
--    Deliberately carries NO foreign keys. An audit trail has to outlive the
--    rows it describes: a variant deleted during a product re-save, or a
--    product removed from the catalogue, must not take the record of what it
--    sold with it. That history is exactly what we were missing.
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id       UUID NOT NULL,
    variant_id       UUID,

    -- What the caller asked for.
    delta            INTEGER NOT NULL,
    -- What actually landed. These differ when the GREATEST(0, ...) floor clamps
    -- a decrement that would have gone negative. Reversals must undo what was
    -- applied, never what was requested, or a refund on an oversold unit would
    -- invent stock that never existed.
    applied_delta    INTEGER NOT NULL DEFAULT 0,

    reason           TEXT NOT NULL,
    order_id         UUID,
    pos_session_id   UUID,
    actor            UUID,

    -- NULL means "not deduplicated" — used by corrective writes whose value is
    -- recomputed each time and which are idempotent by construction.
    idempotency_key  TEXT,
    note             TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT stock_movements_reason_check CHECK (reason IN (
        'sale',                    -- settlement took stock down
        'sale_unresolved_variant', -- settlement could only reach the roll-up
        'reversal',                -- cancel / refund gave stock back
        'position_sync',           -- corrective delta from an order status change
        'admin_adjust',            -- staff edit in the product form
        'pos_sale',                -- till settlement
        'legacy_decrement',        -- decrement with no order context
        'sync',                    -- roll-up rebuilt from the variant rows
        'correction'               -- manual repair
    ))
);

-- Deliberately NOT a partial index. ON CONFLICT cannot infer a partial index
-- without restating its predicate at every call site, and a plain unique index
-- already treats NULLs as distinct — so the unkeyed corrective movements below
-- coexist freely while keyed ones deduplicate.
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_idempotency
    ON public.stock_movements (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_stock_movements_order   ON public.stock_movements (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements (product_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements (created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Staff read the ledger from the dashboard drift report. Writes only ever come
-- from the SECURITY DEFINER functions below, never from a client.
DROP POLICY IF EXISTS "staff_select_stock_movements" ON public.stock_movements;
CREATE POLICY "staff_select_stock_movements"
    ON public.stock_movements FOR SELECT
    TO authenticated
    USING (true);


-- 2. THE core write. Nothing else may touch inventory_count.
--
--    Returns TRUE when the movement was applied, FALSE when it was suppressed
--    as a duplicate. The insert happens before the counters move, so a second
--    caller racing on the same idempotency_key loses at the unique index and
--    leaves the counters alone.
CREATE OR REPLACE FUNCTION public.fn_apply_stock_movement(
    p_product_id      UUID,
    p_variant_id      UUID    DEFAULT NULL,
    p_delta           INTEGER DEFAULT 0,
    p_reason          TEXT    DEFAULT 'correction',
    p_order_id        UUID    DEFAULT NULL,
    p_pos_session_id  UUID    DEFAULT NULL,
    p_actor           UUID    DEFAULT NULL,
    p_idempotency_key TEXT    DEFAULT NULL,
    p_note            TEXT    DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_movement_id     UUID;
    v_variant_rows    INTEGER := 0;
    v_before          INTEGER;
    v_after           INTEGER;
    v_applied         INTEGER;
    v_reason          TEXT := p_reason;
    v_note            TEXT := p_note;
BEGIN
    IF p_delta = 0 THEN
        RETURN FALSE;
    END IF;

    -- Claim the movement first. A duplicate key means another caller already
    -- did this exact piece of work; returning here is what makes the verify
    -- route and the webhook safe to both run against one payment.
    INSERT INTO public.stock_movements
        (product_id, variant_id, delta, applied_delta, reason,
         order_id, pos_session_id, actor, idempotency_key, note)
    VALUES
        (p_product_id, p_variant_id, p_delta, 0, v_reason,
         p_order_id, p_pos_session_id, p_actor, p_idempotency_key, v_note)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id INTO v_movement_id;

    IF v_movement_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Lock the row we are about to move so concurrent movements queue rather
    -- than racing on a read-modify-write.
    IF p_variant_id IS NOT NULL THEN
        UPDATE public.product_variants
        SET inventory_count = GREATEST(0, COALESCE(inventory_count, 0) + p_delta)
        WHERE id = p_variant_id
        RETURNING COALESCE(inventory_count, 0) INTO v_after;

        GET DIAGNOSTICS v_variant_rows = ROW_COUNT;

        -- A variant_id that matches no row used to fail silently: the UPDATE
        -- touched nothing, the roll-up moved anyway, and the two drifted apart
        -- by exactly the quantity sold. Record it instead of losing it.
        IF v_variant_rows = 0 THEN
            v_note := COALESCE(v_note || ' | ', '')
                   || 'variant ' || COALESCE(p_variant_id::TEXT, 'null') || ' not found — roll-up moved alone';
            IF v_reason = 'sale' THEN
                v_reason := 'sale_unresolved_variant';
            END IF;
        END IF;
    END IF;

    SELECT COALESCE(inventory_count, 0) INTO v_before
    FROM public.products WHERE id = p_product_id FOR UPDATE;

    UPDATE public.products
    SET inventory_count = GREATEST(0, COALESCE(inventory_count, 0) + p_delta)
    WHERE id = p_product_id
    RETURNING COALESCE(inventory_count, 0) INTO v_after;

    IF NOT FOUND THEN
        v_applied := 0;
        v_note := COALESCE(v_note || ' | ', '') || 'product not found';
    ELSE
        -- The floor can absorb part of a decrement. Reversals read this, so a
        -- refund on a unit that was never physically there gives back nothing.
        v_applied := v_after - v_before;
    END IF;

    UPDATE public.stock_movements
    SET applied_delta = v_applied, reason = v_reason, note = v_note
    WHERE id = v_movement_id;

    RETURN TRUE;
END;
$$;


-- 3. Record a settlement. Called by every paid-order path.
--
--    Aggregates duplicate (product, variant) lines before writing so the
--    idempotency key is stable no matter how the caller split the cart — the
--    reservation path aggregates, the order-items fallback does not, and both
--    must produce the same keys or the second one would be suppressed as a
--    duplicate and the stock never taken.
--
--    p_items: [{"product_id":"uuid","variant_id":"uuid|null","quantity":1}, ...]
CREATE OR REPLACE FUNCTION public.fn_record_sale(
    p_order_id UUID,
    p_items    JSONB,
    p_reason   TEXT DEFAULT 'sale'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    item     RECORD;
    v_count  INTEGER := 0;
BEGIN
    FOR item IN
        SELECT
            (value ->> 'product_id')::UUID AS product_id,
            CASE WHEN (value -> 'variant_id') IS NULL OR (value -> 'variant_id') = 'null'::jsonb
                 THEN NULL ELSE (value ->> 'variant_id')::UUID END AS variant_id,
            -- SUM() widens to bigint; the movement helper takes INTEGER and
            -- named-argument resolution will not narrow it implicitly.
            SUM(COALESCE((value ->> 'quantity')::INTEGER, 1))::INTEGER AS quantity
        FROM jsonb_array_elements(p_items)
        GROUP BY 1, 2
        ORDER BY 1, 2
    LOOP
        IF item.quantity IS NULL OR item.quantity <= 0 THEN
            CONTINUE;
        END IF;

        IF public.fn_apply_stock_movement(
            p_product_id      => item.product_id,
            p_variant_id      => item.variant_id,
            p_delta           => -item.quantity,
            p_reason          => p_reason,
            p_order_id        => p_order_id,
            p_idempotency_key => 'sale:' || p_order_id::TEXT || ':'
                                 || item.product_id::TEXT || ':'
                                 || COALESCE(item.variant_id::TEXT, 'null')
        ) THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;


-- 4. Bring an order's stock position in line with what its status says it
--    should be holding.
--
--    This is the whole cancel / refund / un-cancel story in one function, and
--    it is idempotent by construction rather than by key: it compares what the
--    ledger says this order currently holds against what it ought to hold and
--    writes only the difference. Run it twice and the second run writes zero.
--
--    p_should_hold FALSE  → cancelled or refunded; give everything back.
--    p_should_hold TRUE   → paid and live; make sure the stock is taken.
--
--    p_items is supplied by the application, already resolved to variant IDs,
--    because variant matching lives in one place in TypeScript (variantKey) and
--    duplicating that normalisation in SQL is how the two sides drifted apart
--    in the first place.
CREATE OR REPLACE FUNCTION public.fn_sync_order_stock_position(
    p_order_id    UUID,
    p_items       JSONB,
    p_should_hold BOOLEAN,
    p_note        TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    row_     RECORD;
    v_count  INTEGER := 0;
    v_needed INTEGER;
    v_known  BOOLEAN;
BEGIN
    -- The ledger is authoritative only from the moment it exists. An order that
    -- settled before it has no movements, and treating that silence as "holds
    -- nothing" would re-decrement stock this order already took years-deep in
    -- history — double-counting every one of them.
    --
    -- So an order the ledger has never seen is left strictly alone. Post-ledger
    -- orders always carry a 'sale' movement, so they qualify; pre-ledger ones
    -- belong to the reconciliation report, where a human decides.
    SELECT EXISTS (
        SELECT 1 FROM public.stock_movements
        WHERE order_id = p_order_id
          AND reason IN ('sale', 'sale_unresolved_variant', 'reversal', 'position_sync', 'pos_sale')
    ) INTO v_known;

    IF NOT v_known THEN
        RETURN 0;
    END IF;

    FOR row_ IN
        WITH target AS (
            SELECT
                (value ->> 'product_id')::UUID AS product_id,
                CASE WHEN (value -> 'variant_id') IS NULL OR (value -> 'variant_id') = 'null'::jsonb
                     THEN NULL ELSE (value ->> 'variant_id')::UUID END AS variant_id,
                CASE WHEN p_should_hold
                     THEN SUM(COALESCE((value ->> 'quantity')::INTEGER, 1))::INTEGER
                     ELSE 0 END AS quantity
            FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
            GROUP BY 1, 2
        ),
        held AS (
            SELECT product_id, variant_id, SUM(applied_delta) AS net
            FROM public.stock_movements
            WHERE order_id = p_order_id
              AND reason IN ('sale', 'sale_unresolved_variant', 'reversal', 'position_sync', 'pos_sale')
            GROUP BY 1, 2
        )
        SELECT
            COALESCE(t.product_id, c.product_id) AS product_id,
            COALESCE(t.variant_id, c.variant_id) AS variant_id,
            -- Where the ledger should end up: negative while the order holds
            -- stock, zero once it has given it back.
            COALESCE(-t.quantity, 0) AS want,
            COALESCE(c.net, 0)       AS have
        FROM target t
        -- A FULL JOIN needs a hash-joinable condition, which IS NOT DISTINCT
        -- FROM is not. Folding NULL to a sentinel keeps variant-less lines
        -- matching each other without tripping that restriction.
        FULL OUTER JOIN held c
          ON  c.product_id = t.product_id
          AND COALESCE(c.variant_id, '00000000-0000-0000-0000-000000000000'::UUID)
            = COALESCE(t.variant_id, '00000000-0000-0000-0000-000000000000'::UUID)
    LOOP
        v_needed := row_.want - row_.have;
        IF v_needed = 0 THEN
            CONTINUE;
        END IF;

        IF public.fn_apply_stock_movement(
            p_product_id => row_.product_id,
            p_variant_id => row_.variant_id,
            p_delta      => v_needed,
            p_reason     => CASE WHEN p_should_hold THEN 'position_sync' ELSE 'reversal' END,
            p_order_id   => p_order_id,
            p_note       => p_note
        ) THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;


-- 5. Existing writers re-pointed at the ledger. Signatures unchanged.

-- Direct decrement with no order context — the POS settlement path and the
-- legacy single-product charge. Not deduplicated: without an order id there is
-- no stable key, and these callers are already guarded upstream.
CREATE OR REPLACE FUNCTION public.fn_decrement_stock(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_quantity   INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.fn_apply_stock_movement(
        p_product_id => p_product_id,
        p_variant_id => p_variant_id,
        p_delta      => -p_quantity,
        p_reason     => 'legacy_decrement'
    );
END;
$$;

-- Staff edit from the product form.
CREATE OR REPLACE FUNCTION public.fn_adjust_stock(
    p_product_id UUID,
    p_variant_id UUID DEFAULT NULL,
    p_delta      INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.fn_apply_stock_movement(
        p_product_id => p_product_id,
        p_variant_id => p_variant_id,
        p_delta      => p_delta,
        p_reason     => 'admin_adjust'
    );
END;
$$;

-- The roll-up rebuild writes an absolute value rather than a delta, so it
-- records the correction it made instead of routing through the movement
-- helper. Without this the ledger would show the roll-up moving with no
-- explanation.
CREATE OR REPLACE FUNCTION public.fn_sync_product_stock_from_variants(
    p_product_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sum    INTEGER;
    v_before INTEGER;
BEGIN
    SELECT COALESCE(inventory_count, 0) INTO v_before
    FROM public.products WHERE id = p_product_id FOR UPDATE;

    SELECT COALESCE(SUM(GREATEST(0, COALESCE(inventory_count, 0))), 0)
    INTO v_sum
    FROM public.product_variants
    WHERE product_id = p_product_id;

    UPDATE public.products
    SET inventory_count = v_sum
    WHERE id = p_product_id;

    IF v_sum <> COALESCE(v_before, 0) THEN
        INSERT INTO public.stock_movements
            (product_id, variant_id, delta, applied_delta, reason, note)
        VALUES
            (p_product_id, NULL, v_sum - v_before, v_sum - v_before, 'sync',
             'roll-up rebuilt from variant rows: ' || v_before || ' -> ' || v_sum);
    END IF;

    RETURN v_sum;
END;
$$;
