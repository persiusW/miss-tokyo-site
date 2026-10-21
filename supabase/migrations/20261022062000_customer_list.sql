-- One row per customer for the new Customers list, keyed by lower(email).
--
-- contact_directory (the old Contact List's view) is left as it is. This view
-- covers everyone the new page promises ("everyone who has bought from you,
-- messaged you or signed up"): orders, custom requests, both newsletter
-- tables, contacts added by hand or imported, contact-form messages and shop
-- accounts (staff accounts are left out). WhatsApp chats carry no email, so a
-- WhatsApp-only person is in the Inbox, not here.
--
-- Per customer: the latest name, email, phone and location seen; where they
-- first came from; first and last seen; paid orders, spend and average order
-- (customer_spend, the fn_sales_summary paid rule); wholesale access (their
-- account's role); whether they agreed to marketing email (newsletter sign-up,
-- the account's email setting, or the hand-added contact's
-- subscribed_status); and their tags.
--
-- Service role only: the admin reads it on the server and pages it there, so
-- the PostgREST 1000-row cap never applies to a whole-list read.
create or replace view public.customer_list
with (security_invoker = true) as
with sources as (
  select lower(o.customer_email) as k, o.customer_email as email, o.customer_name as name, o.customer_phone as phone,
         'order'::text as source, o.created_at,
         nullif(btrim(coalesce(nullif(btrim(split_part(o.shipping_address->>'text', ',', 1)), ''), o.shipping_address->>'region', '')), '') as location,
         false as mkt
    from public.orders o
   where o.customer_email like '%@%'
  union all
  select lower(r.customer_email), r.customer_email, r.customer_name, null, 'custom_request', r.created_at, null, false
    from public.custom_requests r
   where r.customer_email like '%@%'
  union all
  select lower(n.email), n.email, null, null, 'newsletter', coalesce(n.created_at, now()), null, true
    from public.newsletter_subs n
   where n.email like '%@%'
  union all
  select lower(n.email), n.email, null, null, 'newsletter', n.subscribed_at, null, true
    from public.newsletter_subscribers n
   where n.email like '%@%'
  union all
  select lower(c.email), c.email, c.name, c.phone,
         case when c.source = 'imported' then 'imported' else 'manual' end, c.created_at,
         nullif(btrim(c.address), ''), c.subscribed_status
    from public.contacts c
   where c.email like '%@%'
  union all
  select lower(i.email), i.email, i.name, i.phone, 'contact_form', i.created_at, null, false
    from public.contact_inquiries i
   where i.email like '%@%'
  union all
  select lower(p.email), p.email,
         coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '')),
         p.phone, 'account', coalesce(p.created_at, now()), nullif(btrim(p.address_region), ''), coalesce(p.email_subscribed, false)
    from public.profiles p
   where p.email like '%@%'
     and coalesce(p.role, 'customer') not in ('owner', 'admin', 'sales_staff')
),
grouped as (
  select
    k as contact_key,
    (array_agg(email order by created_at desc))[1] as email,
    coalesce((array_agg(name order by created_at desc) filter (where coalesce(btrim(name), '') <> ''))[1], '') as name,
    coalesce((array_agg(phone order by created_at desc) filter (where coalesce(btrim(phone), '') <> ''))[1], '') as phone,
    (array_agg(location order by created_at desc) filter (where location is not null))[1] as location,
    (array_agg(source order by created_at asc))[1] as came_from,
    min(created_at) as first_seen,
    max(created_at) as last_seen,
    bool_or(source in ('manual', 'imported')) as has_manual,
    bool_or(source = 'order') as any_orders,
    bool_or(source not in ('manual', 'imported')) as has_other_sources,
    bool_or(mkt) as marketing
  from sources
  group by k
),
accounts as (
  select distinct on (lower(p.email)) lower(p.email) as k, p.id, p.role
    from public.profiles p
   where p.email like '%@%'
   order by lower(p.email), p.created_at desc nulls last
)
select
  g.contact_key, g.email, g.name, g.phone, g.location, g.came_from, g.first_seen, g.last_seen,
  g.has_manual, g.any_orders, g.has_other_sources, g.marketing,
  coalesce(s.paid_orders, 0) as orders,
  coalesce(s.spent, 0)::numeric as spent,
  s.avg_order,
  s.last_paid_at as last_order_at,
  a.id as profile_id,
  a.role as account_role,
  coalesce(a.role in ('wholesale', 'wholesaler'), false) as wholesale,
  coalesce(t.tags, '{}'::text[]) as tags,
  coalesce(t.tag_keys, '{}'::text[]) as tag_keys
from grouped g
left join public.customer_spend s on s.contact_key = g.contact_key
left join accounts a on a.k = g.contact_key
left join lateral (
  select array_agg(ct.tag order by lower(ct.tag)) as tags, array_agg(lower(ct.tag) order by lower(ct.tag)) as tag_keys
    from public.contact_tags ct
   where ct.contact_key = g.contact_key
) t on true;

revoke all on public.customer_list from public, anon, authenticated;
grant select on public.customer_list to service_role;
