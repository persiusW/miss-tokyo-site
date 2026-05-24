alter table public.profiles
  add column if not exists notif_email     boolean default true,
  add column if not exists notif_sms       boolean default true,
  add column if not exists notif_whatsapp  boolean default false;
