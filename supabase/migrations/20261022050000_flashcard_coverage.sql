-- Admin v2 Inbox › Teach the assistant: how many active products have a photo
-- flashcard (an answered card whose lesson is still in use) and how many don't
-- yet. Read by the service role only.
create or replace function public.fn_flashcard_coverage()
returns table (with_card integer, without_card integer)
language sql stable
set search_path = public
as $$
    with active as (
        select id from products where is_active and is_published
    ), carded as (
        select distinct c.answer_product_id as id
        from assistant_photo_cards c
        join assistant_lessons l on l.id = c.lesson_id and l.active
        where c.answer_product_id is not null
    )
    select
        (select count(*) from active a where exists (select 1 from carded k where k.id = a.id))::integer,
        (select count(*) from active a where not exists (select 1 from carded k where k.id = a.id))::integer
$$;

revoke execute on function public.fn_flashcard_coverage() from public, anon, authenticated;
grant execute on function public.fn_flashcard_coverage() to service_role;
