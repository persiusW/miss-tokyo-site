-- Fix: sync_category_product_count trigger function also needs SECURITY DEFINER.
-- This pre-existing FOR EACH ROW trigger fires on every product UPDATE/INSERT/DELETE
-- and updates the relevant category's product_count. Without SECURITY DEFINER it runs
-- as the calling authenticated user, who cannot UPDATE categories via RLS.

CREATE OR REPLACE FUNCTION sync_category_product_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  affected_category_type TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_category_type := OLD.category_type;
  ELSIF TG_OP = 'INSERT' THEN
    affected_category_type := NEW.category_type;
  ELSE
    IF OLD.category_type IS DISTINCT FROM NEW.category_type THEN
      UPDATE public.categories
         SET product_count = (
               SELECT COUNT(*) FROM public.products p
               WHERE LOWER(p.category_type) = LOWER(categories.name)
                 AND p.is_active = true
             )
       WHERE LOWER(name) = LOWER(OLD.category_type);
    END IF;
    affected_category_type := NEW.category_type;
  END IF;

  UPDATE public.categories
     SET product_count = (
           SELECT COUNT(*) FROM public.products p
           WHERE LOWER(p.category_type) = LOWER(categories.name)
             AND p.is_active = true
         )
   WHERE LOWER(name) = LOWER(affected_category_type);

  RETURN COALESCE(NEW, OLD);
END;
$$;
