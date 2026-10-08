-- cron/expire-reservations marks orders whose online hold has lapsed, but wrote
-- status 'expired', which orders_status_check never allowed (23514 on every run).
-- Adds 'reservation_expired' for it. Every value already stored still passes and
-- no row is touched; a CHECK constraint cannot be extended in place, so it is
-- replaced inside this migration's transaction.
--
-- payment_status is unchanged by the cron, so the webhook and sync-payment-status
-- (both keyed on payment_status) still settle or cancel these orders as before.
alter table public.orders
    drop constraint if exists orders_status_check;

alter table public.orders
    add constraint orders_status_check
    check (status = any (array[
        'pending', 'paid', 'processing', 'packed', 'shipped', 'ready_for_pickup',
        'fulfilled', 'delivered', 'refunded', 'cancelled', 'failed',
        'reservation_expired'
    ]));
