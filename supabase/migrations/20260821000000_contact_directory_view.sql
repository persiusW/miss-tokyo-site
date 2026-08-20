-- ============================================================
-- Contact directory: one deduped row per customer email
--
-- The Customers page used to pull every row of four tables into the
-- browser and merge them there, so the page downloaded the entire
-- clientele on each visit and could not be paginated. This view does
-- the same union and merge in Postgres so the page can ask for one
-- 50-row page with an exact count.
--
-- Additive only: creates a view, touches no table and no data.
-- Drop with `DROP VIEW IF EXISTS public.contact_directory;` to revert.
--
-- security_invoker = true is ESSENTIAL. Without it the view would run
-- with the owner's rights and hand every authenticated user the whole
-- customer list through PostgREST, bypassing the RLS on the underlying
-- tables. With it, the caller's own policies still apply exactly as they
-- did when the page queried those tables directly.
-- ============================================================

CREATE OR REPLACE VIEW public.contact_directory
WITH (security_invoker = true) AS
WITH sources AS (
    SELECT
        'order-' || o.id::text AS id,
        o.customer_name        AS name,
        o.customer_email       AS email,
        o.customer_phone       AS phone,
        'order'::text          AS source,
        o.created_at           AS created_at,
        false                  AS is_manual
    FROM public.orders o
    WHERE COALESCE(o.customer_email, '') <> ''

    UNION ALL

    SELECT
        'req-' || r.id::text,
        r.customer_name,
        r.customer_email,
        NULL::text,
        'custom_request'::text,
        r.created_at,
        false
    FROM public.custom_requests r
    WHERE COALESCE(r.customer_email, '') <> ''

    UNION ALL

    SELECT
        'nl-' || n.id::text,
        NULL::text,
        n.email,
        NULL::text,
        'newsletter'::text,
        n.created_at,
        false
    FROM public.newsletter_subs n
    WHERE COALESCE(n.email, '') <> ''

    UNION ALL

    SELECT
        c.id::text,
        c.name,
        c.email,
        c.phone,
        'manual'::text,
        c.created_at,
        true
    FROM public.contacts c
    WHERE COALESCE(c.email, '') <> ''
)
SELECT
    -- Newest record wins for identity and badge, matching what the page
    -- displayed before; name and phone fall back to the most recent record
    -- that actually has one, which is the merge the browser used to do.
    (array_agg(id     ORDER BY created_at DESC))[1] AS id,
    COALESCE((array_agg(name  ORDER BY created_at DESC) FILTER (WHERE COALESCE(name, '')  <> ''))[1], '') AS name,
    (array_agg(email  ORDER BY created_at DESC))[1] AS email,
    COALESCE((array_agg(phone ORDER BY created_at DESC) FILTER (WHERE COALESCE(phone, '') <> ''))[1], '') AS phone,
    (array_agg(source ORDER BY created_at DESC))[1] AS source,
    max(created_at)                                 AS created_at,
    (array_agg(is_manual ORDER BY created_at DESC))[1] AS is_manual
FROM sources
GROUP BY lower(email);

-- Dashboard users read this through PostgREST as `authenticated`; their own
-- RLS on the underlying tables still decides what comes back. Never granted
-- to `anon`.
GRANT SELECT ON public.contact_directory TO authenticated;
