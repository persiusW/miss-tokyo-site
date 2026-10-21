import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
    DEFAULT_QUERY, PAID_LEGACY_STATUSES, buildActivity, canDelete, cleanTags, contactKey, customerHref, exportCsv, ilikeExact, isPaidOrder,
    keyFromPath, listSearch, mapImport, mapImportRow, normaliseTag, parseListQuery, sanitiseSearch, sinceText, tagDiff, wholesaleState,
    type CustomerRow,
} from "../../../src/lib/admin/v2/customers";
import { activityText } from "../../../src/lib/admin/activityText";
import { FLAGS_ALL, FLAGS_OFF, V2_READY_AREAS, v2Redirect } from "../../../src/lib/admin/v2/routeMap";

// Admin v2 Customers: URL state, the contact key, tags, import/export, the
// delete and wholesale rules and the activity feed. Pure: no database.

const ROOT = path.resolve(__dirname, "../../..");
const ID = "c90ace37-332e-4947-8601-a841661ad450";

const row = (o: Partial<CustomerRow> = {}): CustomerRow => ({
    contact_key: "ama@example.com", email: "Ama@Example.com", name: "Ama Mensah", phone: "0241234567", location: "Osu", came_from: "order",
    first_seen: "2026-03-02T10:00:00Z", last_seen: "2026-10-01T10:00:00Z", has_manual: false, any_orders: true, has_other_sources: true,
    marketing: false, orders: 3, spent: 1200.5, avg_order: 400.17, last_order_at: "2026-10-01T10:00:00Z", profile_id: ID,
    account_role: "customer", wholesale: false, tags: [], ...o,
});

test.describe("list URL state", () => {
    test("parses every filter and drops what isn't valid", () => {
        const q = parseListQuery(new URLSearchParams("segment=vip&source=newsletter&from=2026-01-01&to=bad&q=ama&tag=%20VIP%20&sort=spent&page=3"));
        expect(q).toEqual({ segment: "vip", source: "newsletter", from: "2026-01-01", to: "", q: "ama", tag: "VIP", sort: "spent", page: 3 });
        expect(parseListQuery({ segment: "nope", source: "x", sort: "y", page: "-2" })).toEqual(DEFAULT_QUERY);
    });
    test("the old wholesalers page's redirect lands on the Wholesale chip", () => {
        expect(parseListQuery(new URLSearchParams("segment=wholesale")).segment).toBe("wholesale");
    });
    test("query strings leave defaults out and a filter change goes back to page 1", () => {
        expect(listSearch(DEFAULT_QUERY)).toBe("");
        const q = { ...DEFAULT_QUERY, segment: "buyers" as const, page: 4 };
        expect(listSearch(q)).toBe("?segment=buyers");
        expect(listSearch(q, { page: 5 })).toBe("?segment=buyers&page=5");
        expect(listSearch(q, { sort: "last" })).toBe("?segment=buyers&sort=last");
    });
});

test.describe("contact key", () => {
    test("is the lower-case email, or null", () => {
        expect(contactKey("  Ama@Example.COM ")).toBe("ama@example.com");
        expect(contactKey("not an email")).toBeNull();
        expect(contactKey("a/b@c.d")).toBeNull();
        expect(contactKey("")).toBeNull();
    });
    test("the URL key round-trips, and the old Inbox paths are not customers", () => {
        const href = customerHref("ama+shop@example.com", "?segment=vip");
        expect(href).toBe("/customers/ama%2Bshop%40example.com?segment=vip");
        expect(keyFromPath("/customers/ama%2Bshop%40example.com")).toBe("ama+shop@example.com");
        expect(keyFromPath("/customers/Ama@Example.com/")).toBe("ama@example.com");
        expect(keyFromPath("/customers")).toBeNull();
        expect(keyFromPath("/customers/whatsapp")).toBeNull();
        expect(keyFromPath("/customers/whatsapp/teach")).toBeNull();
        expect(keyFromPath("/customers/%E0%A4%A")).toBeNull();
    });
    test("an email's own LIKE wildcards are matched as text", () => {
        expect(ilikeExact("first_last%x@ex.com")).toBe("first\\_last\\%x@ex.com");
    });
    test("search can't inject PostgREST or() syntax", () => {
        expect(sanitiseSearch(" ama,(email.eq.x)*% ")).toBe("amaemail.eq.x");
    });
});

test.describe("tags", () => {
    test("normalised, deduped without case, in the shop's casing, never with commas", () => {
        expect(normaliseTag("  vip   client ")).toBe("vip client");
        expect(normaliseTag(" , ")).toBeNull();
        expect(normaliseTag("x".repeat(40))).toHaveLength(30);
        expect(cleanTags(["vip", "VIP", "stylist", "", "a,b"], ["VIP"])).toEqual(["VIP", "stylist", "a b"]);
    });
    test("diff compares without case", () => {
        expect(tagDiff(["VIP", "Stylist"], ["vip", "Bride"])).toEqual({ add: ["Bride"], remove: ["Stylist"] });
    });
});

test.describe("rules", () => {
    test("only team-added contacts who never ordered can be deleted", () => {
        expect(canDelete({ has_manual: true, any_orders: false })).toBe(true);
        expect(canDelete({ has_manual: true, any_orders: true })).toBe(false);
        expect(canDelete({ has_manual: false, any_orders: false })).toBe(false);
    });
    test("wholesale needs a shop account and never touches a team member", () => {
        expect(wholesaleState(row())).toBe("off");
        expect(wholesaleState(row({ wholesale: true, account_role: "wholesale" }))).toBe("on");
        expect(wholesaleState(row({ profile_id: null }))).toBe("no_account");
        expect(wholesaleState(row({ account_role: "owner" }))).toBe("staff");
        expect(wholesaleState(row({ account_role: "sales_staff" }))).toBe("staff");
    });
    test("the paid rule is the one in customer_spend and fn_sales_summary", () => {
        const sql = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261022060000_customer_spend.sql"), "utf8");
        const summary = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261022042000_fn_sales_summary.sql"), "utf8");
        const list = `(${PAID_LEGACY_STATUSES.map(s => `'${s}'`).join(", ")})`;
        expect(sql).toContain(list);
        expect(summary).toContain(list);
        expect(isPaidOrder({ payment_status: "paid", status: "cancelled" })).toBe(true);
        expect(isPaidOrder({ payment_status: null, status: "shipped" })).toBe(true);
        expect(isPaidOrder({ payment_status: "pending", status: "paid" })).toBe(false);
        expect(isPaidOrder({ payment_status: null, status: "pending" })).toBe(false);
    });
    test("customer since reads as a month", () => {
        expect(sinceText("2026-03-02T10:00:00Z")).toBe("Customer since March 2026");
        expect(sinceText(null)).toBe("");
    });
});

test.describe("export", () => {
    test("keeps the old columns, quotes cells and defuses spreadsheet formulas", () => {
        const csv = exportCsv([row({ name: '=HYPERLINK("x")', tags: ["VIP", "Stylist"], wholesale: true, marketing: true })]);
        const [head, line] = csv.split("\n");
        expect(head.startsWith('"Name","Email","Phone","Primary Source","Added On"')).toBe(true);
        expect(line).toContain(`"'=HYPERLINK(""x"")"`);
        expect(line).toContain('"Order"');
        expect(line).toContain('"1200.50"');
        expect(line).toContain('"VIP; Stylist"');
    });
});

test.describe("import (the old /admin/customers parser)", () => {
    test("reads the old headers without case, with blanks as null", () => {
        expect(mapImportRow({ "E-mail": " Ama@Example.com ", "first name": "Ama", "Last Name": "Mensah", Mobile: "024 123 4567", Region: "Greater Accra", Street: "12 Oxford St", Country: "", Subscribed: "Yes" }))
            .toEqual({ email: "ama@example.com", name: "Ama Mensah", phone: "024 123 4567", address: "12 Oxford St, Greater Accra", marketing: true });
        expect(mapImportRow({ Name: "Kofi", Email: "kofi@example.com", "Email Subscription": "no" }))
            .toEqual({ email: "kofi@example.com", name: "Kofi", phone: null, address: null, marketing: false });
        expect(mapImportRow({ Name: "No email" })).toBeNull();
    });
    test("each email once, skipped rows counted", () => {
        const r = mapImport([{ Email: "a@x.com" }, { Email: "A@x.com" }, { Email: "" }, { Email: "b@x.com" }]);
        expect(r.rows.map(x => x.email)).toEqual(["a@x.com", "b@x.com"]);
        expect(r.skipped).toBe(2);
    });
});

test.describe("activity", () => {
    test("everything the customer did, newest first, with links into the new admin", () => {
        const items = buildActivity({
            orders: [{ id: ID, ref: "4a8ff381", total_amount: 250, created_at: "2026-10-01T10:00:00Z", paid: true, cancelled: false },
                { id: ID, ref: null, total_amount: 90, created_at: "2026-10-03T10:00:00Z", paid: false, cancelled: false }],
            forms: [{ id: ID, message: "Do you ship to Kumasi?", at: "2026-09-01T10:00:00Z", inbox: true }],
            requests: [{ id: ID, details: "A red kaba", created_at: "2026-08-01T10:00:00Z" }],
            invoices: [{ id: ID, type: "invoice", amount: 500, status: "sent", created_at: "2026-07-01T10:00:00Z" }],
            chats: [{ id: ID, created_at: "2026-06-01T10:00:00Z", last_message_at: "2026-10-02T10:00:00Z" }],
            accountAt: "2026-05-01T10:00:00Z", newsletterAt: null, addedAt: null,
        });
        expect(items.map(i => i.text)).toEqual([
            "Placed order #C90ACE37 · GH₵ 90.00 · waiting for payment",
            "Latest WhatsApp message",
            "Placed order #4A8FF381 · GH₵ 250.00",
            "Contact form: “Do you ship to Kumasi?”",
            "Custom request: “A red kaba”",
            "Invoice for GH₵ 500.00 · sent",
            "First messaged the shop on WhatsApp",
            "Signed up for an account on the shop",
        ]);
        expect(items[2].href).toBe(`/orders/${ID}`);
        expect(items[3].href).toBe(`/inbox?c=form:${ID}`);
        expect(items[4].href).toBe(`/inbox?c=request:${ID}`);
        expect(items[5].href).toBe(`/orders/invoices/${ID}`);
        expect(items[1].href).toBe(`/inbox?c=${ID}`);
    });
    test("team activity rows for customers read in plain words", () => {
        expect(activityText({ action_type: "UPDATE", resource: "customer", resource_id: "ama@example.com", details: { wholesale: true, name: "Ama" } }))
            .toEqual({ what: "gave Ama wholesale access", href: "/customers/ama%40example.com" });
        expect(activityText({ action_type: "CREATE", resource: "customer", details: { imported: 12 } }).what).toBe("imported 12 customers");
        expect(activityText({ action_type: "DELETE", resource: "customer", resource_id: "a@b.co", details: { name: "Kofi" } }))
            .toEqual({ what: "deleted the customer Kofi", href: undefined });
    });
});

test.describe("routes and wiring", () => {
    test("customers is ready, and the old pages forward to it only while it's on", () => {
        expect(V2_READY_AREAS).toContain("customers");
        expect(v2Redirect("/sales/wholesalers", "", FLAGS_ALL)).toBe("/customers?segment=wholesale");
        expect(v2Redirect("/admin/customers", "", FLAGS_ALL)).toBe("/customers");
        expect(v2Redirect("/customers", "", FLAGS_ALL)).toBeNull();
        expect(v2Redirect("/customers/ama%40example.com", "", FLAGS_ALL)).toBeNull();
        expect(v2Redirect("/sales/wholesalers", "", FLAGS_OFF)).toBeNull();
        expect(v2Redirect("/customers", "", FLAGS_OFF)).toBeNull();
    });
    test("every customers server action checks the caller first", () => {
        const src = fs.readFileSync(path.join(ROOT, "src/components/admin/v2/customers/actions.ts"), "utf8");
        const chunks = src.split("export async function ").slice(1);
        for (const c of chunks) {
            const name = c.slice(0, c.indexOf("("));
            const guard = c.indexOf("const me = await caller();\n    if (!me) return DENIED;");
            const firstUse = Math.min(...["db.", "load", "supabaseAdmin"].map(k => c.indexOf(k, c.indexOf("{")) ).filter(i => i > -1));
            expect(guard, name).toBeGreaterThan(-1);
            expect(guard, name).toBeLessThan(firstUse);
        }
        const all = chunks;
        expect(all.length).toBeGreaterThan(5);
    });
    test("the shared paths keep the old pages while the area is off", () => {
        for (const f of ["src/app/(dashboard)/customers/page.tsx", "src/app/(dashboard)/customers/[id]/page.tsx"]) {
            const src = fs.readFileSync(path.join(ROOT, f), "utf8");
            expect(src).toContain('v2AreaOn("customers")');
            expect(src).toMatch(/Legacy\w+/);
        }
    });
});
