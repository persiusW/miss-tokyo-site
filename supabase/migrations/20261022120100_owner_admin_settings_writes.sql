-- Settings, Content (CMS), Invoices and Pay Links are owner + admin areas: the
-- sidebar hides them from sales staff. The database did not agree. Their write
-- policies use is_admin(), which also admits sales_staff, and the Settings and
-- Content tabs write straight from the browser, so a sales staff session could
-- change the store settings, the homepage, message templates, invoices and pay
-- links through the public API.
--
-- fn_is_owner_or_admin() is the same check as is_admin() without sales_staff.
-- The staff policies on these tables now use it. Public storefront reads keep
-- their own SELECT policies and are not touched. Sales staff lose nothing in
-- the areas their menu shows: every browser read or write of these tables is in
-- an owner/admin page, and server code reads them on the service role.
--
-- ALTER only: no policy is dropped. Undo = ALTER the same policies back to
-- is_admin().

create function public.fn_is_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role in ('admin', 'owner')
    );
$$;

-- Policies granted to the public role are evaluated for anon storefront reads
-- as well, so anon needs EXECUTE or those reads fail with 42501 (proven in a
-- rolled-back dry run: anon `select from site_metadata` raised "permission
-- denied for function fn_is_owner_or_admin", which would break every page's
-- metadata). It matches how is_admin() is granted. The function only answers
-- "is the caller an owner or admin", which is false without a session.
revoke execute on function public.fn_is_owner_or_admin() from public;
grant execute on function public.fn_is_owner_or_admin() to anon, authenticated, service_role;

-- Settings
alter policy "Admins have full access to business_settings" on public.business_settings
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy admin_all_business_settings on public.business_settings
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy "Admins have full access to store_settings" on public.store_settings
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy admin_all_store_settings on public.store_settings
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy admin_all_site_settings on public.site_settings
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy "Admins have full access to site_metadata" on public.site_metadata
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy admin_all_push_notification_settings on public.push_notification_settings
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));

-- Message templates (Settings > Emails). Sales staff keep read through
-- "Authenticated users can read communication templates" (is_admin).
alter policy admin_all_comm_templates on public.communication_templates
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy "Authenticated users can insert communication templates" on public.communication_templates
    with check ((select public.fn_is_owner_or_admin()));
alter policy "Authenticated users can update communication templates" on public.communication_templates
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy "Authenticated users can delete communication templates" on public.communication_templates
    using ((select public.fn_is_owner_or_admin()));

-- Content (CMS)
alter policy admin_all_hero_slides on public.hero_slides
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy admin_all_homepage_reviews on public.homepage_reviews
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy admin_all_featured_categories on public.featured_categories
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy "Admins have full access to site_assets" on public.site_assets
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy "Admins have full access to site_copy" on public.site_copy
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy admin_all_site_copy on public.site_copy
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));

-- Invoices and Pay Links
alter policy admin_all_documents on public.documents
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy "Admins have full access to pay_links" on public.pay_links
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
alter policy admin_all_pay_links on public.pay_links
    using ((select public.fn_is_owner_or_admin())) with check ((select public.fn_is_owner_or_admin()));
