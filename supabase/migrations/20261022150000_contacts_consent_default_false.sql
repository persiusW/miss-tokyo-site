-- A contact added by hand or imported has not agreed to marketing email
-- unless someone says so. The column defaulted to true, so the old "Add
-- Contact" form marked every new contact as subscribed without asking.
-- Only the default changes; existing rows (none today) keep their value.
alter table public.contacts alter column subscribed_status set default false;
