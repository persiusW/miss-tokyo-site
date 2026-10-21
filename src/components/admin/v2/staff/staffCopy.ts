// Staff area copy and the activity-log translator. Pure: shared by the server
// loaders, the client components and the unit test.
import { ghs } from "@/components/admin/ui/format";

export const STAFF_ROLES = ["owner", "admin", "sales_staff"] as const;
export type StaffRoleKey = (typeof STAFF_ROLES)[number];

export const ROLE_LABEL: Record<StaffRoleKey, string> = { owner: "Owner", admin: "Admin", sales_staff: "Sales staff" };

export const ROLE_DESC: Record<StaffRoleKey, string> = {
    owner: "Everything, including staff, billing and settings. Can refund and mark orders paid.",
    admin: "Everything an owner can do, plus AI settings and the admin inbox. For your developer.",
    sales_staff: "Orders, the till, products, customers, discounts, inbox and analytics. No settings, staff, billing or content.",
};

/** Roles an invite may grant (lib/teamInvites INVITABLE_ROLES: owner is never handed out by invite). */
export const INVITE_ROLES: StaffRoleKey[] = ["sales_staff", "admin"];

export function isStaffRole(r: unknown): r is StaffRoleKey {
    return typeof r === "string" && (STAFF_ROLES as readonly string[]).includes(r);
}

export function roleLabel(r: string | null | undefined): string {
    return isStaffRole(r) ? ROLE_LABEL[r] : "Staff";
}

export const LAST_OWNER_TEXT = "The store needs at least one owner. Make someone else an owner first.";

/** Calm text for the reasons the staff functions refuse a change. */
export function staffRefusal(reason: string | null | undefined): string {
    switch (reason) {
        case "last_owner": return LAST_OWNER_TEXT;
        case "self": return "You can't deactivate yourself. Ask another owner or admin to do it.";
        case "not_staff": return "That person isn't on the staff list any more. Refresh the page.";
        case "not_deactivated": return "That person is already active. Refresh the page.";
        case "not_found": return "That account no longer exists. Refresh the page.";
        case "bad_role": return "Choose Owner, Admin or Sales staff.";
        default: return "Something happened. Please try again shortly.";
    }
}

/** Which refusal a Postgres error from the staff functions carries, if any. */
export function refusalOf(message: string | null | undefined): string | null {
    const m = (message || "").trim();
    return ["last_owner", "self", "not_staff", "not_deactivated", "not_found", "bad_role"].includes(m) ? m : null;
}

/** "Expires in 5 days" / "Expires today" / "Expired". */
export function inviteExpiry(expiresAt: string | null | undefined, now = new Date()): { text: string; expired: boolean } {
    if (!expiresAt) return { text: "No expiry date", expired: false };
    const ms = new Date(expiresAt).getTime() - now.getTime();
    if (!Number.isFinite(ms)) return { text: "No expiry date", expired: false };
    if (ms <= 0) return { text: "Expired", expired: true };
    const days = Math.floor(ms / 86_400_000);
    if (days < 1) return { text: "Expires today", expired: false };
    return { text: `Expires in ${days} ${days === 1 ? "day" : "days"}`, expired: false };
}

// ── What each role can do ────────────────────────────────────────────────
// Each row was checked against the server gates (route role lists, server
// actions, requireV2Page, RLS) in October 2026, not against the menu.
// "menu" means sales staff don't see it in the menu, but the server doesn't
// refuse them yet: those rows are called out under the table.
export type PermCell = "yes" | "no" | "menu";
export type PermRow = { area: string; owner: PermCell; admin: PermCell; sales: PermCell };

export const PERMS: PermRow[] = [
    { area: "Home, orders, till and inbox", owner: "yes", admin: "yes", sales: "yes" },
    { area: "Change an order's status, including cancelled, refunded and paid", owner: "yes", admin: "yes", sales: "yes" },
    { area: "Mark an order paid after a Paystack check", owner: "yes", admin: "yes", sales: "no" },
    { area: "Change or cancel another person's till sale", owner: "yes", admin: "yes", sales: "no" },
    { area: "Products, inventory, categories, gift cards and customers", owner: "yes", admin: "yes", sales: "yes" },
    { area: "Discount codes", owner: "yes", admin: "yes", sales: "yes" },
    { area: "Automatic discounts", owner: "yes", admin: "yes", sales: "yes" },
    { area: "Analytics and reports", owner: "yes", admin: "yes", sales: "yes" },
    { area: "Give or remove wholesale prices", owner: "yes", admin: "yes", sales: "no" },
    { area: "Abandoned-cart reminders and back-in-stock alerts", owner: "yes", admin: "yes", sales: "no" },
    { area: "Teach and correct the WhatsApp assistant", owner: "yes", admin: "yes", sales: "no" },
    { area: "Invoices and pay links", owner: "yes", admin: "yes", sales: "menu" },
    { area: "Content", owner: "yes", admin: "yes", sales: "menu" },
    { area: "Settings", owner: "yes", admin: "yes", sales: "menu" },
    { area: "Staff and billing", owner: "yes", admin: "yes", sales: "no" },
    { area: "AI settings", owner: "yes", admin: "yes", sales: "no" },
    { area: "AI cost markup and the admin inbox", owner: "no", admin: "yes", sales: "no" },
];

// ── Activity log in sentences ────────────────────────────────────────────

export type ActivityRow = {
    id: string;
    user_id: string | null;
    user_role: string;
    action_type: string;
    resource: string;
    resource_id: string | null;
    details: Record<string, unknown> | null;
    created_at: string;
};

const STATUS_WORDS: Record<string, string> = {
    pending: "waiting for payment", paid: "paid", processing: "being prepared", inbox: "new",
    packed: "packed", shipped: "out for delivery", ready_for_pickup: "ready for collection",
    delivered: "delivered", fulfilled: "done", cancelled: "cancelled", refunded: "refunded",
    partially_refunded: "partly refunded", partial: "partly sent", failed: "payment failed",
};

const RESOURCE_WORDS: Record<string, string> = {
    product: "product", category: "category", gift_card: "gift card", discount: "discount code",
    auto_discount: "automatic discount", order: "order", rider: "rider", settings: "settings",
    store_settings: "store settings", business_settings: "business details", team: "staff", staff: "staff",
    invite: "invite", cash_sale: "cash sale", session: "session", customer: "customer", contact: "contact",
};

const AREA_WORDS: Record<string, string> = {
    product: "Products", category: "Categories", order: "Orders", customer: "Customers", contact: "Customers",
    discount: "Discounts", auto_discount: "Discounts", gift_card: "Gift cards", settings: "Settings",
    store_settings: "Settings", business_settings: "Settings", rider: "Riders", team: "Staff", staff: "Staff", invite: "Staff",
};

function str(v: unknown): string | null {
    if (v == null) return null;
    const s = String(v).trim();
    return s ? s : null;
}

function orderRef(d: Record<string, unknown>, resourceId: string | null): string {
    const n = str(d.order_number) ?? str(d.orderRef) ?? (resourceId ? resourceId.slice(0, 8) : null);
    return n ? `order #${n.toUpperCase()}` : "an order";
}

function statusWord(s: unknown): string {
    const k = str(s)?.toLowerCase() ?? "";
    return STATUS_WORDS[k] ?? (k ? k.replace(/_/g, " ") : "a new status");
}

/** "PACKED_ORDER" → "Packed order": the last resort, never the raw label. */
export function humanise(label: string): string {
    const t = label.toLowerCase().replace(/_/g, " ").trim();
    return t ? t[0].toUpperCase() + t.slice(1) : "Made a change";
}

/** Field names in a change list, in words: "price, stock and sizes". */
export function changedFields(changes: unknown): string | null {
    if (!changes || typeof changes !== "object") return null;
    const keys = Object.keys(changes as Record<string, unknown>).map(k => k.replace(/_/g, " "));
    if (!keys.length) return null;
    if (keys.length === 1) return keys[0];
    return `${keys.slice(0, -1).join(", ")} and ${keys[keys.length - 1]}`;
}

export type ActivityText = { sentence: string; area: string };

/**
 * One activity_logs row as a sentence a person would say, plus the area it
 * belongs to. `names` resolves staff ids (for "Changed Abena's role") when the
 * row only carries an id.
 */
export function describeActivity(row: Pick<ActivityRow, "action_type" | "resource" | "resource_id" | "details">, names: Record<string, string> = {}): ActivityText {
    const d = (row.details ?? {}) as Record<string, unknown>;
    const name = str(d.resource_name) ?? str(d.name) ?? str(d.title);
    const who = str(d.resource_name) ?? (row.resource_id ? names[row.resource_id] : null) ?? str(d.email) ?? "a team member";
    const res = row.resource;

    switch (row.action_type) {
        case "SIGN_IN": return { sentence: "Signed in", area: "Sign-in" };
        case "PACKED_ORDER": return { sentence: `Packed ${orderRef(d, row.resource_id)}${str(d.new_status) === "ready_for_pickup" ? " for collection" : ""}`, area: "Orders" };
        case "DISPATCHED_ORDER": return { sentence: `Sent ${orderRef(d, row.resource_id)} out for delivery${str(d.rider_name) ? ` with ${str(d.rider_name)}` : ""}`, area: "Orders" };
        case "DELIVERED_ORDER": return { sentence: `Marked ${orderRef(d, row.resource_id)} as delivered`, area: "Orders" };
        case "ASSIGNED_RIDER": return { sentence: `Gave ${orderRef(d, row.resource_id)} to ${str(d.rider_name) ? `rider ${str(d.rider_name)}` : "a rider"}`, area: "Orders" };
        case "UPDATE_STATUS": {
            const s = d.new_status ?? d.new_fulfillment_status;
            return { sentence: `Marked ${orderRef(d, row.resource_id)} as ${statusWord(s)}${d.bulk ? " (with other orders)" : ""}`, area: "Orders" };
        }
        case "CREATE_DISCOUNT": return { sentence: `Created discount code ${str(d.code) ?? ""}`.trim(), area: "Discounts" };
        case "TOGGLE_DISCOUNT": return { sentence: `${d.is_active ? "Switched on" : "Switched off"} discount code ${str(d.code) ?? ""}`.trim(), area: "Discounts" };
        case "DELETE_DISCOUNT": return { sentence: `Deleted discount code ${str(d.code) ?? ""}`.trim(), area: "Discounts" };
        case "CREATE_AUTO_DISCOUNT": return { sentence: `Created automatic discount ${str(d.title) ?? ""}`.trim(), area: "Discounts" };
        case "UPDATE_AUTO_DISCOUNT": return { sentence: `Changed automatic discount ${str(d.title) ?? ""}`.trim(), area: "Discounts" };
        case "TOGGLE_AUTO_DISCOUNT": return { sentence: `${d.is_active ? "Switched on" : "Switched off"} automatic discount ${str(d.title) ?? ""}`.trim(), area: "Discounts" };
        case "DELETE_AUTO_DISCOUNT": return { sentence: `Deleted automatic discount ${str(d.title) ?? ""}`.trim(), area: "Discounts" };
        case "INVITE": return { sentence: `Invited ${str(d.email) ?? "someone"} as ${roleLabel(str(d.role)).toLowerCase()}`, area: "Staff" };
        case "REMOVE_MEMBER": return { sentence: `Removed ${who} from staff`, area: "Staff" };
        case "RESET_PASSWORD": return { sentence: `Sent a password reset link to ${str(d.target_email) ?? who}`, area: "Staff" };
    }

    if (res === "staff") {
        switch (str(d.action)) {
            case "role": return { sentence: `Changed ${who}'s role from ${roleLabel(str(d.from)).toLowerCase()} to ${roleLabel(str(d.to)).toLowerCase()}`, area: "Staff" };
            case "deactivate": return { sentence: `Deactivated ${who}`, area: "Staff" };
            case "reactivate": return { sentence: `Reactivated ${who}`, area: "Staff" };
            case "sign_out": return { sentence: `Signed ${who} out on every device`, area: "Staff" };
        }
    }
    if (res === "invite") {
        const email = str(d.email) ?? "someone";
        if (row.action_type === "DELETE") return { sentence: `Revoked the invite for ${email}`, area: "Staff" };
        if (str(d.action) === "resend") return { sentence: `Sent the invite to ${email} again`, area: "Staff" };
    }
    if (res === "cash_sale" && row.action_type === "CREATE") {
        const total = d.total != null && Number.isFinite(Number(d.total)) ? ` of ${ghs(Number(d.total))}` : "";
        return { sentence: `Took a cash payment${total} for ${orderRef({ order_number: d.orderRef }, null)}`, area: "Till" };
    }
    if (res === "gift_card" && row.action_type === "CREATE") {
        const value = d.value != null && Number.isFinite(Number(d.value)) ? ` worth ${ghs(Number(d.value))}` : "";
        return { sentence: `Issued gift card ${str(d.code) ?? ""}${value}`.replace(/\s+/g, " ").trim(), area: "Gift cards" };
    }

    const thing = RESOURCE_WORDS[res] ?? res.replace(/_/g, " ");
    const area = AREA_WORDS[res] ?? humanise(thing);
    const label = name ? `${thing} ${name}` : thing;
    if (row.action_type === "CREATE") return { sentence: `Added ${label}`, area };
    if (row.action_type === "UPDATE") return { sentence: `Changed ${label}`, area };
    if (row.action_type === "DELETE") return { sentence: `Deleted ${label}`, area };
    return { sentence: humanise(row.action_type), area };
}

/** Rows per page on the Activity tab. */
export const ACTIVITY_PAGE = 50;

// ── Action filter (the select on the Activity tab) ───────────────────────
export type ActionFilter = { v: string; l: string; group: string; action: string[]; resource?: string[] };

export const ACTION_FILTERS: ActionFilter[] = [
    { v: "packed", l: "Packed", group: "Orders", action: ["PACKED_ORDER"] },
    { v: "dispatched", l: "Sent out for delivery", group: "Orders", action: ["DISPATCHED_ORDER"] },
    { v: "delivered", l: "Delivered", group: "Orders", action: ["DELIVERED_ORDER"] },
    { v: "rider", l: "Rider assigned", group: "Orders", action: ["ASSIGNED_RIDER"] },
    { v: "status", l: "Status changed", group: "Orders", action: ["UPDATE_STATUS"] },
    { v: "cash", l: "Cash payments at the till", group: "Orders", action: ["CREATE"], resource: ["cash_sale"] },
    { v: "code-created", l: "Discount code created", group: "Discounts", action: ["CREATE_DISCOUNT"] },
    { v: "code-toggled", l: "Discount code switched on or off", group: "Discounts", action: ["TOGGLE_DISCOUNT"] },
    { v: "code-deleted", l: "Discount code deleted", group: "Discounts", action: ["DELETE_DISCOUNT"] },
    { v: "auto-created", l: "Automatic discount created", group: "Discounts", action: ["CREATE_AUTO_DISCOUNT"] },
    { v: "auto-changed", l: "Automatic discount changed", group: "Discounts", action: ["UPDATE_AUTO_DISCOUNT"] },
    { v: "auto-toggled", l: "Automatic discount switched on or off", group: "Discounts", action: ["TOGGLE_AUTO_DISCOUNT"] },
    { v: "auto-deleted", l: "Automatic discount deleted", group: "Discounts", action: ["DELETE_AUTO_DISCOUNT"] },
    { v: "added", l: "Product or category added", group: "Catalogue", action: ["CREATE"], resource: ["product", "category"] },
    { v: "changed", l: "Product or category changed", group: "Catalogue", action: ["UPDATE"], resource: ["product", "category"] },
    { v: "deleted", l: "Product or category deleted", group: "Catalogue", action: ["DELETE"], resource: ["product", "category"] },
    { v: "gift", l: "Gift card issued", group: "Catalogue", action: ["CREATE"], resource: ["gift_card"] },
    { v: "invited", l: "Invited", group: "Staff", action: ["INVITE"] },
    { v: "invite-changes", l: "Invite sent again or revoked", group: "Staff", action: ["UPDATE", "DELETE"], resource: ["invite"] },
    { v: "staff-changes", l: "Role changed, deactivated, reactivated or signed out", group: "Staff", action: ["UPDATE"], resource: ["staff"] },
    { v: "removed", l: "Removed from staff", group: "Staff", action: ["REMOVE_MEMBER"] },
    { v: "reset", l: "Password reset sent", group: "Staff", action: ["RESET_PASSWORD"] },
    { v: "signin", l: "Signed in", group: "Staff", action: ["SIGN_IN"] },
];

export function actionFilter(v: string | null | undefined): ActionFilter | null {
    return ACTION_FILTERS.find(f => f.v === v) ?? null;
}
