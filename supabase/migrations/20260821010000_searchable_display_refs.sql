-- ============================================================
-- Make the ref people actually see searchable
--
-- Orders and POS sessions are shown everywhere as an 8-character ref
-- (#59ED63AA) derived in the UI as id.substring(0, 8).toUpperCase().
-- That ref lived only in JavaScript, so searching for it matched nothing:
-- PostgREST cannot ilike a uuid column, which is why the orders search
-- covers name / email / phone / paystack_reference and not the id.
--
-- This stores the same derivation as a generated column and indexes it,
-- turning "search by the ref on the receipt" into an indexed lookup.
--
-- Additive: adds a column computed from data already present, plus an
-- index. No existing column or row is modified — a STORED generated
-- column cannot be written to, so nothing can disagree with the id.
--
-- Safe to run more than once. Reverse with:
--   DROP INDEX IF EXISTS public.idx_orders_ref;
--   ALTER TABLE public.orders DROP COLUMN IF EXISTS ref;
-- ============================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS ref text
    GENERATED ALWAYS AS (upper(left(id::text, 8))) STORED;

CREATE INDEX IF NOT EXISTS idx_orders_ref ON public.orders (ref);

ALTER TABLE public.pos_sessions
    ADD COLUMN IF NOT EXISTS ref text
    GENERATED ALWAYS AS (upper(left(id::text, 8))) STORED;

CREATE INDEX IF NOT EXISTS idx_pos_sessions_ref ON public.pos_sessions (ref);

-- Sanity check after running:
--   SELECT ref, id FROM public.orders WHERE ref = '59ED63AA';
