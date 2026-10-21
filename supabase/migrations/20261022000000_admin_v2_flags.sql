-- Admin v2 redesign rollout switches. All off: the current admin keeps
-- rendering until the owner turns the new one on in Settings.
-- admin_v2 covers every new page; Products, Orders and the Till are the
-- high-risk areas and each wait for their own switch as well.
alter table public.store_settings
    add column if not exists admin_v2 boolean not null default false,
    add column if not exists admin_v2_products boolean not null default false,
    add column if not exists admin_v2_orders boolean not null default false,
    add column if not exists admin_v2_till boolean not null default false;
