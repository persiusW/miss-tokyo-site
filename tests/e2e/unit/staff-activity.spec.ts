import { test, expect } from "@playwright/test";
import { ACTION_FILTERS, PERMS, describeActivity, inviteExpiry, refusalOf, staffRefusal, LAST_OWNER_TEXT } from "../../../src/components/admin/v2/staff/staffCopy";
import { looksRaw } from "../../../src/lib/errors/looksRaw";

// The Staff › Activity tab shows activity_logs as sentences. Every label the
// activity_logs_action_type_check constraint allows must read as words, never
// as PACKED_ORDER, and the shapes the app actually writes must say what happened.

const ALLOWED = [
    "CREATE", "UPDATE", "DELETE",
    "UPDATE_STATUS", "PACKED_ORDER", "DISPATCHED_ORDER", "DELIVERED_ORDER", "ASSIGNED_RIDER",
    "CREATE_DISCOUNT", "TOGGLE_DISCOUNT", "DELETE_DISCOUNT",
    "CREATE_AUTO_DISCOUNT", "UPDATE_AUTO_DISCOUNT", "TOGGLE_AUTO_DISCOUNT", "DELETE_AUTO_DISCOUNT",
    "INVITE", "REMOVE_MEMBER", "RESET_PASSWORD", "SIGN_IN",
];
const RESOURCES = ["product", "category", "order", "cash_sale", "gift_card", "discount", "auto_discount", "team", "session", "staff", "invite", "something_new"];

const row = (action_type: string, resource: string, details: Record<string, unknown> = {}, resource_id: string | null = null) =>
    ({ action_type, resource, resource_id, details });

test("no action label ever shows raw", () => {
    for (const a of ALLOWED) {
        for (const r of RESOURCES) {
            const { sentence, area } = describeActivity(row(a, r));
            expect(sentence, `${a}/${r}`).not.toMatch(/[A-Z]{2,}_[A-Z]/);
            expect(sentence, `${a}/${r}`).not.toMatch(/_/);
            expect(looksRaw(sentence), `${a}/${r}`).toBe(false);
            expect(area.length).toBeGreaterThan(0);
        }
    }
    expect(describeActivity(row("SOME_FUTURE_THING", "order")).sentence).toBe("Some future thing");
});

test("the shapes the app writes read as sentences", () => {
    expect(describeActivity(row("PACKED_ORDER", "order", { order_number: "4a8ff381", new_status: "packed" })).sentence).toBe("Packed order #4A8FF381");
    expect(describeActivity(row("UPDATE_STATUS", "order", { order_number: "8677abf7", new_status: "delivered" })).sentence).toBe("Marked order #8677ABF7 as delivered");
    expect(describeActivity(row("UPDATE_STATUS", "order", { order_number: "8677abf7", new_status: "cancelled", bulk: true })).sentence).toBe("Marked order #8677ABF7 as cancelled (with other orders)");
    expect(describeActivity(row("ASSIGNED_RIDER", "order", { order_number: "aa11bb22", rider_name: "Kofi Adu" })).sentence).toBe("Gave order #AA11BB22 to rider Kofi Adu");
    expect(describeActivity(row("DISPATCHED_ORDER", "order", { order_number: "aa11bb22", rider_name: "Kofi Adu" })).sentence).toBe("Sent order #AA11BB22 out for delivery with Kofi Adu");
    expect(describeActivity(row("CREATE", "cash_sale", { total: 594.5, orderRef: "8677ABF7" })).sentence).toBe("Took a cash payment of GH₵ 594.50 for order #8677ABF7");
    expect(describeActivity(row("CREATE", "gift_card", { code: "BLCH-FUMX", value: 150 })).sentence).toBe("Issued gift card BLCH-FUMX worth GH₵ 150.00");
    expect(describeActivity(row("UPDATE", "product", { resource_name: "Amazon pants" })).sentence).toBe("Changed product Amazon pants");
    expect(describeActivity(row("CREATE", "category", { resource_name: "Dresses" })).sentence).toBe("Added category Dresses");
    expect(describeActivity(row("CREATE_DISCOUNT", "discount", { code: "MISST550" })).sentence).toBe("Created discount code MISST550");
    expect(describeActivity(row("TOGGLE_AUTO_DISCOUNT", "auto_discount", { title: "Harmattan", is_active: false })).sentence).toBe("Switched off automatic discount Harmattan");
    expect(describeActivity(row("INVITE", "team", { email: "ama@x.com", role: "sales_staff" })).sentence).toBe("Invited ama@x.com as sales staff");
    expect(describeActivity(row("RESET_PASSWORD", "team", { target_email: "ama@x.com" })).sentence).toBe("Sent a password reset link to ama@x.com");
    expect(describeActivity(row("SIGN_IN", "session")).sentence).toBe("Signed in");
});

test("staff changes name the person, from the log or the id", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    expect(describeActivity(row("UPDATE", "staff", { action: "role", from: "sales_staff", to: "admin", resource_name: "Abena Kyei" }, id)).sentence)
        .toBe("Changed Abena Kyei's role from sales staff to admin");
    expect(describeActivity(row("UPDATE", "staff", { action: "deactivate" }, id), { [id]: "Esi Ansah" }).sentence).toBe("Deactivated Esi Ansah");
    expect(describeActivity(row("UPDATE", "staff", { action: "reactivate", resource_name: "Esi Ansah" }, id)).sentence).toBe("Reactivated Esi Ansah");
    expect(describeActivity(row("UPDATE", "staff", { action: "sign_out", resource_name: "Kojo" }, id)).sentence).toBe("Signed Kojo out on every device");
    // The old Remove member wrote no details at all.
    expect(describeActivity(row("REMOVE_MEMBER", "team", {}, id), { [id]: "Kojo Mensah" }).sentence).toBe("Removed Kojo Mensah from staff");
    expect(describeActivity(row("REMOVE_MEMBER", "team", {}, id)).sentence).toBe("Removed a team member from staff");
    expect(describeActivity(row("UPDATE", "invite", { action: "resend", email: "yaw@x.com" })).sentence).toBe("Sent the invite to yaw@x.com again");
    expect(describeActivity(row("DELETE", "invite", { email: "yaw@x.com" })).sentence).toBe("Revoked the invite for yaw@x.com");
});

test("every action filter only names labels the database accepts", () => {
    const seen = new Set<string>();
    for (const f of ACTION_FILTERS) {
        expect(seen.has(f.v), f.v).toBe(false);
        seen.add(f.v);
        for (const a of f.action) expect(ALLOWED, f.v).toContain(a);
        expect(f.l).not.toMatch(/_/);
    }
});

test("refusals from the staff functions become calm sentences", () => {
    expect(refusalOf("last_owner")).toBe("last_owner");
    expect(staffRefusal("last_owner")).toBe(LAST_OWNER_TEXT);
    expect(refusalOf('permission denied for function fn_staff_set_role')).toBeNull();
    for (const r of ["last_owner", "self", "not_staff", "not_deactivated", "not_found", "bad_role", null]) {
        expect(looksRaw(staffRefusal(r))).toBe(false);
    }
});

test("invite expiry reads in days", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    expect(inviteExpiry("2026-10-26T13:00:00Z", now)).toEqual({ text: "Expires in 5 days", expired: false });
    expect(inviteExpiry("2026-10-22T13:00:00Z", now)).toEqual({ text: "Expires in 1 day", expired: false });
    expect(inviteExpiry("2026-10-21T18:00:00Z", now)).toEqual({ text: "Expires today", expired: false });
    expect(inviteExpiry("2026-10-20T12:00:00Z", now)).toEqual({ text: "Expired", expired: true });
});

test("the permissions matrix keeps the admin-only rows admin-only", () => {
    const row = (area: string) => PERMS.find(p => p.area === area)!;
    expect(row("AI cost markup and the admin inbox")).toMatchObject({ owner: "no", admin: "yes", sales: "no" });
    expect(row("Staff and billing")).toMatchObject({ owner: "yes", admin: "yes", sales: "no" });
    // Owner decision 2026-10-21: anyone on staff can mark an order paid, as the old status picker allows
    expect(row("Mark an order paid (after a Paystack check, or by hand)")).toMatchObject({ owner: "yes", admin: "yes", sales: "yes" });
    // Owner, admin and sales staff all change codes (catalog/discounts/actions.ts and the v2 actions)
    expect(row("Discount codes")).toMatchObject({ owner: "yes", admin: "yes", sales: "yes" });
});
