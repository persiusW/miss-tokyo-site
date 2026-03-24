-- Add nav toggle columns for Gallery, Sale, and Dresses.
-- These were hardcoded as always-visible in the Navbar (navKey: null).
-- Now they are controllable from the CMS Navigation tab like all other nav items.

ALTER TABLE public.site_settings
    ADD COLUMN IF NOT EXISTS nav_show_gallery BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS nav_show_sale    BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS nav_show_dresses BOOLEAN DEFAULT true;
