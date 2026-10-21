// activity_logs rows in plain language, for Home's "Team activity" (and any
// other place that lists what the team did). Pure: no database.
//
// API
//   activityText(row) → { what, href? }
//     what: what the person did, starting lower-case so it reads after their
//           name: "packed order #4A8FF381". Never the raw action_type.
//     href: where the row should open (the order), when there is one.
//   QUIET_ACTIONS: action types a short feed leaves out (sign-ins).
//
// Every action_type the app logs today is handled (lib/utils/logActivity
// callers); anything new falls back to "updated <name>" rather than showing a
// code. NOTE for the merge: the Staff area builds its own readable log in a
// parallel branch; the two should become one module.
import { sectionByKey } from "@/components/admin/v2/settings/schema";

export type ActivityRow = {
    action_type: string;
    resource: string | null;
    resource_id?: string | null;
    details?: Record<string, unknown> | null;
};

export type ActivityText = { what: string; href?: string };

export const QUIET_ACTIONS = ["SIGN_IN"] as const;

const ROLE_WORD: Record<string, string> = { owner: "an owner", admin: "an admin", sales_staff: "sales staff" };

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const money = (v: unknown): string => {
    const n = Number(v);
    return Number.isFinite(n) && v !== null && v !== "" ? `GH₵ ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
};

/** "#4A8FF381" from whatever the log kept: the ref, the 8-character number or the id. */
export function orderRef(row: ActivityRow): string {
    const d = row.details ?? {};
    const raw = s(d.order_number) || s(d.orderRef) || s(d.order_ref) || s(row.resource_id).slice(0, 8);
    return raw ? `#${raw.replace(/^#/, "").toUpperCase()}` : "";
}

function named(row: ActivityRow): string {
    const d = row.details ?? {};
    return s(d.resource_name) || s(d.name) || s(d.title) || s(d.code);
}

function orderWhat(row: ActivityRow): string {
    const d = row.details ?? {};
    const ref = orderRef(row);
    const o = ref ? `order ${ref}` : "an order";
    const st = (s(d.new_status) || s(d.new_fulfillment_status)).toLowerCase();
    const rider = s(d.rider_name);
    switch (row.action_type) {
        case "CREATE": return `created ${o}${money(d.total) ? ` for ${money(d.total)}` : ""}${d.via === "miss_tokyo_ai" ? " with Miss Tokyo AI" : ""}`;
        case "PACKED_ORDER": return st === "ready_for_pickup" ? `marked ${o} ready for collection` : `packed ${o}`;
        case "DISPATCHED_ORDER": return `sent ${o} out for delivery${rider ? ` with ${rider}` : ""}`;
        case "DELIVERED_ORDER": return `marked ${o} as delivered`;
        case "ASSIGNED_RIDER": return rider ? `gave ${o} to ${rider}` : `changed the rider on ${o}`;
        // Admin v2 Orders.
        case "REFUND_ORDER": return `refunded ${money(d.amount) || "money"} on ${o}`;
        case "CANCEL_ORDER": return `cancelled ${o}${money(d.amount) ? ` and refunded ${money(d.amount)}` : ""}`;
        case "PARTIAL_FULFILMENT": return `packed part of ${o}${typeof d.units === "number" ? ` (${d.units} ${d.units === 1 ? "item" : "items"})` : ""}`;
        case "NOTE_TO_CUSTOMER": return `sent the customer a note about ${o}${d.channel === "whatsapp" ? " on WhatsApp" : d.channel === "email" ? " by email" : ""}`;
        case "STAFF_NOTE": return `changed the staff notes on ${o}`;
    }
    // A parcel packed from part of the order (admin v2) syncs status 'paid'.
    if (s(d.new_fulfillment_status) === "partial") return `packed part of ${o}`;
    switch (st) {
        case "paid": return d.verified_against_paystack ? `checked ${o} with Paystack and marked it paid` : `marked ${o} as paid`;
        case "inbox":
        case "processing": return `moved ${o} back to waiting to pack`;
        case "packed": return `packed ${o}`;
        case "shipped": return `sent ${o} out for delivery`;
        case "ready_for_pickup": return `marked ${o} ready for collection`;
        case "delivered":
        case "fulfilled": return `marked ${o} as delivered`;
        case "cancelled": return `cancelled ${o}`;
        case "refunded": return `marked ${o} as refunded`;
        case "pending": return `marked ${o} as waiting for payment`;
    }
    return `updated ${o}`;
}

const VERB: Record<string, string> = { CREATE: "added", UPDATE: "updated", DELETE: "deleted" };

/** One activity row as a readable phrase, plus where it opens. */
export function activityText(row: ActivityRow): ActivityText {
    const d = row.details ?? {};
    const res = (row.resource ?? "").toLowerCase();
    const name = named(row);
    const verb = VERB[row.action_type];

    if (row.action_type === "SIGN_IN") return { what: "signed in" };

    if (res === "order") {
        return { what: orderWhat(row), href: row.resource_id ? `/orders/${row.resource_id}` : undefined };
    }
    if (res === "cash_sale") {
        const ref = orderRef(row);
        const href = row.resource_id && row.resource_id !== s(d.sessionId) ? `/orders/${row.resource_id}` : undefined;
        return { what: `took a cash sale${money(d.total) ? ` of ${money(d.total)}` : ""} at the till${ref ? ` (order ${ref})` : ""}`, href };
    }

    switch (row.action_type) {
        case "CREATE_DISCOUNT": return { what: `created the discount code ${s(d.code) || "—"}` };
        case "UPDATE_DISCOUNT": return { what: `changed the discount code ${s(d.code) || "—"}` };
        case "TOGGLE_DISCOUNT": return { what: `turned the discount code ${s(d.code) || "—"} ${d.is_active ? "on" : "off"}` };
        case "DELETE_DISCOUNT": return { what: `deleted the discount code ${s(d.code) || "—"}` };
        case "CREATE_AUTO_DISCOUNT": return { what: `created the automatic discount ${s(d.title) || "—"}` };
        case "UPDATE_AUTO_DISCOUNT": return { what: `changed the automatic discount ${s(d.title) || "—"}` };
        case "TOGGLE_AUTO_DISCOUNT": return { what: `turned the automatic discount ${s(d.title) || "—"} ${d.is_active ? "on" : "off"}` };
        case "DELETE_AUTO_DISCOUNT": return { what: `deleted the automatic discount ${s(d.title) || "—"}` };
        case "INVITE": return { what: `invited ${s(d.email) || "someone"}${ROLE_WORD[s(d.role)] ? ` as ${ROLE_WORD[s(d.role)]}` : ""}` };
        case "REMOVE_MEMBER": return { what: "removed someone from the team" };
        case "RESET_PASSWORD": return { what: `sent a password reset to ${s(d.target_email) || "a team member"}` };
    }

    if (res === "settings") {
        if (s(d.message)) return { what: "changed a message to customers" };
        const t = sectionByKey(s(d.section) || s(row.resource_id))?.t;
        return { what: t ? `changed Settings › ${t}` : "changed the settings" };
    }
    if (res === "gift_card" && row.action_type === "CREATE") {
        // The code can be spent, so it never appears in a feed.
        return { what: `issued a ${money(d.value) || "new"} gift card` };
    }
    if (res === "rider") {
        if (row.action_type === "UPDATE" && typeof d.is_active === "boolean") return { what: `turned the rider ${name || "—"} ${d.is_active ? "on" : "off"}` };
        return { what: `${verb ?? "updated"} the rider ${name || "—"}` };
    }
    if (res === "category") return { what: `${verb ?? "updated"} the category ${name || "—"}` };
    if (res === "product") {
        const href = row.resource_id && row.action_type !== "DELETE" ? `/catalogue/${row.resource_id}` : undefined;
        return { what: `${verb === "added" ? "added the product" : verb ?? "updated"} ${name || "a product"}`, href };
    }
    if (res === "customer") {
        const href = row.resource_id && row.action_type !== "DELETE" && row.resource_id.includes("@") ? `/customers/${encodeURIComponent(row.resource_id)}` : undefined;
        if (typeof d.wholesale === "boolean") return { what: d.wholesale ? `gave ${name || "a customer"} wholesale access` : `took wholesale access away from ${name || "a customer"}`, href };
        if (row.action_type === "CREATE" && typeof d.imported === "number") return { what: `imported ${d.imported} customer${d.imported === 1 ? "" : "s"}` };
        return { what: `${verb ?? "updated"} the customer ${name || "—"}`, href };
    }
    if (res === "team") return { what: "changed the team" };
    return { what: `${verb ?? "updated"} ${name || "something"}` };
}
