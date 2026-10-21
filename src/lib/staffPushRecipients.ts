// Who may receive the staff pushes ("New order received", WhatsApp handoffs).
// They carry customer names, contacts and totals, so a subscription only counts
// while its owner's profile role is a staff role right now. A removed or
// deactivated staff member keeps their subscription row (nothing deletes it on
// removal), so filtering here at send time is what actually stops the pushes.
// Pure so it can be unit tested; the caller does the two reads.

export const STAFF_PUSH_ROLES = ["admin", "owner", "sales_staff"] as const;

export type StaffPushSub = { user_id: string | null; endpoint: string; p256dh: string; auth: string };

export function staffPushRecipients<T extends StaffPushSub>(
    subs: T[],
    profiles: { id: string; role: string | null }[],
): T[] {
    const staff = new Set(
        profiles.filter(p => (STAFF_PUSH_ROLES as readonly string[]).includes(p.role ?? "")).map(p => p.id),
    );
    return subs.filter(s => s.user_id !== null && staff.has(s.user_id));
}
