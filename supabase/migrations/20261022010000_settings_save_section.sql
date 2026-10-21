-- Admin v2 Settings: save one section in one transaction.
--
-- Today's Store tab saves with 4-5 separate writes from the browser, so one
-- failing write leaves the others applied ("Other settings were saved").
-- The new Settings page sends each section's changes to one server action,
-- which checks the role and calls this function with the service role. Either
-- every change in the section lands or none does.
--
-- p_payload (every part optional):
--   store    {column: value}  -> store_settings      where id = 'default'
--   business {column: value}  -> business_settings   where id = 'default'
--   site     {column: value}  -> site_settings       where id = 'singleton'
--   push     {column: value}  -> push_notification_settings where id = 'default'
--   ai       [{key, value}]   -> ai_settings (existing keys only)
--   metadata [{page_path, title, description, keywords}] -> site_metadata
--   templates [{channel, event_type, subject, greeting, body_text}] -> communication_templates
--   wholesale_categories [uuid] -> categories.is_wholesale for active categories
-- Column names are checked against the table; values are cast through the
-- table's own row type, so a wrong type fails the whole save.
-- Additive only: no table or column changes.

create or replace function public.fn_settings_save(p_payload jsonb, p_actor uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
set statement_timeout = '15s'
as $$
declare
    t record;
    k text;
    v jsonb;
    r jsonb;
    n int;
    ids uuid[];
begin
    if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
        raise exception 'settings payload must be an object' using errcode = '22023';
    end if;

    for t in
        select * from (values
            ('store', 'store_settings', 'default'),
            ('business', 'business_settings', 'default'),
            ('site', 'site_settings', 'singleton'),
            ('push', 'push_notification_settings', 'default')
        ) as x(part, tbl, row_id)
    loop
        continue when not (p_payload ? t.part);
        if jsonb_typeof(p_payload -> t.part) <> 'object' then
            raise exception '% must be an object', t.part using errcode = '22023';
        end if;
        for k, v in select * from jsonb_each(p_payload -> t.part) loop
            if k in ('id', 'updated_at', 'created_at') or not exists (
                select 1 from information_schema.columns c
                where c.table_schema = 'public' and c.table_name = t.tbl and c.column_name = k
            ) then
                raise exception 'unknown setting %.%', t.tbl, k using errcode = '22023';
            end if;
            execute format(
                'update public.%1$I set %2$I = (jsonb_populate_record(null::public.%1$I, $1)).%2$I where id = $2',
                t.tbl, k
            ) using jsonb_build_object(k, v), t.row_id;
            get diagnostics n = row_count;
            if n <> 1 then
                raise exception 'settings row %.% is missing', t.tbl, t.row_id using errcode = 'P0002';
            end if;
        end loop;
        if t.tbl <> 'store_settings' then
            execute format('update public.%I set updated_at = now() where id = $1', t.tbl) using t.row_id;
        end if;
    end loop;

    if p_payload ? 'ai' then
        for r in select * from jsonb_array_elements(p_payload -> 'ai') loop
            update public.ai_settings
               set value = r -> 'value', updated_at = now(), updated_by = p_actor
             where key = r ->> 'key';
            get diagnostics n = row_count;
            if n <> 1 then
                raise exception 'unknown AI setting %', r ->> 'key' using errcode = '22023';
            end if;
        end loop;
    end if;

    if p_payload ? 'metadata' then
        for r in select * from jsonb_array_elements(p_payload -> 'metadata') loop
            insert into public.site_metadata (page_path, title, description, keywords, updated_at)
            values (r ->> 'page_path', coalesce(r ->> 'title', ''), r ->> 'description', r ->> 'keywords', now())
            on conflict (page_path) do update
               set title = excluded.title, description = excluded.description,
                   keywords = excluded.keywords, updated_at = now();
        end loop;
    end if;

    if p_payload ? 'templates' then
        for r in select * from jsonb_array_elements(p_payload -> 'templates') loop
            insert into public.communication_templates (channel, event_type, subject, greeting, body_text, updated_at)
            values (r ->> 'channel', r ->> 'event_type', r ->> 'subject', r ->> 'greeting', coalesce(r ->> 'body_text', ''), now())
            on conflict (channel, event_type) do update
               set subject = excluded.subject, greeting = excluded.greeting,
                   body_text = excluded.body_text, updated_at = now();
        end loop;
    end if;

    if p_payload ? 'wholesale_categories' then
        select coalesce(array_agg(x::uuid), '{}') into ids
          from jsonb_array_elements_text(p_payload -> 'wholesale_categories') as x;
        update public.categories
           set is_wholesale = (id = any(ids))
         where is_active = true
           and is_wholesale is distinct from (id = any(ids));
    end if;

    return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.fn_settings_save(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.fn_settings_save(jsonb, uuid) to service_role;

comment on function public.fn_settings_save(jsonb, uuid) is
    'Admin v2 Settings: applies one section''s changes in one transaction. Service role only; the server action checks the role first.';
