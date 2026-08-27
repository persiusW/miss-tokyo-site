-- activity_logs_action_type_check only ever allowed CREATE / UPDATE / DELETE, so
-- every order, team and discount action the app writes failed its insert with a
-- 23514. logActivity discards the error PostgREST returns, so the audit trail for
-- those resources has been silently empty for the life of the table: 0 rows for
-- resource='order' since March, and none for INVITE, SIGN_IN or any discount
-- action either. Only the three generic labels ever landed.
--
-- This widens the allowed set. Every value already stored still passes, and no
-- row is touched — a CHECK constraint simply cannot be extended in place, so it
-- has to be replaced.
alter table public.activity_logs
    drop constraint if exists activity_logs_action_type_check;

alter table public.activity_logs
    add constraint activity_logs_action_type_check
    check (action_type = any (array[
        -- generic resource lifecycle
        'CREATE', 'UPDATE', 'DELETE',
        -- orders
        'UPDATE_STATUS', 'PACKED_ORDER', 'DISPATCHED_ORDER', 'DELIVERED_ORDER', 'ASSIGNED_RIDER',
        -- discounts
        'CREATE_DISCOUNT', 'TOGGLE_DISCOUNT', 'DELETE_DISCOUNT',
        'CREATE_AUTO_DISCOUNT', 'UPDATE_AUTO_DISCOUNT', 'TOGGLE_AUTO_DISCOUNT', 'DELETE_AUTO_DISCOUNT',
        -- team and session
        'INVITE', 'REMOVE_MEMBER', 'RESET_PASSWORD', 'SIGN_IN'
    ]));
