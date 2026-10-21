import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { ROUTES } from "../../../src/lib/ai/missTokyoAi/routes";

// The sidebar, the server and the database each decide who may open an area,
// and nothing makes them agree (see role-gates-drift). These fail when an
// owner + admin area loses its server gate, or when the 2026-10-22 RLS fixes
// are edited back open.

const ROOT = path.resolve(__dirname, "../../..");
const DASH = path.join(ROOT, "src", "app", "(dashboard)");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");
const read = (p: string) => fs.readFileSync(p, "utf8");

/** True when the page itself, or a layout above it inside the dashboard, checks for owner/admin. */
function serverGated(routePath: string): boolean {
    const parts = routePath.split("/").filter(Boolean);
    const page = read(path.join(DASH, ...parts, "page.tsx"));
    if (/requireStaff\(\s*\[\s*"admin"\s*\]|requireAiAdmin\(|requireStaff\(\[\.\.\.OWNER_ADMIN\]\)/.test(page)) return true;
    for (let i = parts.length; i >= 1; i--) {
        const layout = path.join(DASH, ...parts.slice(0, i), "layout.tsx");
        if (fs.existsSync(layout) && /<OwnerAdminGate\b/.test(read(layout))) return true;
    }
    return false;
}

test("every page the sidebar hides from sales staff is gated on the server", () => {
    const restricted = Object.entries(ROUTES).filter(([, r]) => !r.roles.includes("sales_staff"));
    expect(restricted.length).toBeGreaterThan(0);
    for (const [key, r] of restricted) expect(serverGated(r.path), `${key} (${r.path})`).toBe(true);
    // Content is a dashboard page the AI registry does not list.
    expect(serverGated("/cms"), "/cms").toBe(true);
});

test("the gate allows owners and admins only", () => {
    const gate = read(path.join(ROOT, "src", "components", "admin", "OwnerAdminGate.tsx"));
    expect(gate).toContain('export const OWNER_ADMIN = ["admin", "owner"] as const;');
    expect(gate).toContain("requireStaff([...OWNER_ADMIN])");
});

test("invoice pay links and staff push subscriptions check the role", () => {
    const payLink = read(path.join(ROOT, "src", "app", "api", "invoice", "paystack-link", "route.ts"));
    expect(payLink).toContain('!["admin", "owner"].includes(caller.role)');
    expect(payLink).not.toContain('"sales_staff"');

    const push = read(path.join(ROOT, "src", "app", "api", "admin", "push", "subscribe", "route.ts"));
    expect(push.match(/if \(!\(await isStaff\(user\.id\)\)\)/g)?.length, "POST and DELETE").toBe(2);
});

test("staff-only tables are no longer open to every signed-in user", () => {
    const sql = read(path.join(MIGRATIONS, "20261022120000_staff_tables_rls_scope.sql"));
    expect(sql).not.toMatch(/drop\s+policy/i);
    for (const policy of [
        "staff_select_discount_holds", "staff_select_online_reservations", "staff_select_pos_reservations",
        "staff_select_pos_sessions", "staff_select_stock_movements",
        '"Restrict read to authenticated staff"', '"Authenticated users can read communication templates"',
        '"Public can view active coupons"',
    ]) {
        expect(sql, policy).toMatch(new RegExp(`alter policy ${policy} on public\\.\\w+\\s+using \\(\\(select public\\.is_admin\\(\\)\\)\\);`));
    }
    expect(sql).toContain(`alter policy "Enable read access for authenticated users" on public.profiles
    using ((select public.is_admin()) or id = (select auth.uid()));`);
    // Writes: no `true` left on any policy this migration touches.
    expect(sql.replace(/--.*$/gm, "")).not.toMatch(/(using|with check)\s*\(\s*true\s*\)/i);
});

test("settings, content and finance writes need owner or admin", () => {
    const sql = read(path.join(MIGRATIONS, "20261022120100_owner_admin_settings_writes.sql"));
    expect(sql).not.toMatch(/drop\s+(policy|function)/i);
    expect(sql).toContain("and role in ('admin', 'owner')");
    expect(sql).toContain("security definer");
    expect(sql).toContain("revoke execute on function public.fn_is_owner_or_admin() from public;");
    // anon must keep EXECUTE: public-role policies run for storefront reads too,
    // and without it anon reads of site_metadata fail with 42501.
    expect(sql).toContain("grant execute on function public.fn_is_owner_or_admin() to anon, authenticated, service_role;");
    for (const table of [
        "business_settings", "store_settings", "site_settings", "site_metadata", "push_notification_settings",
        "communication_templates", "hero_slides", "homepage_reviews", "featured_categories", "site_assets",
        "site_copy", "documents", "pay_links",
    ]) {
        expect(sql, table).toMatch(new RegExp(`on public\\.${table}\\s+using \\(\\(select public\\.fn_is_owner_or_admin\\(\\)\\)\\)`));
    }
    // The catalogue stays open to sales staff: their menu shows it.
    expect(sql).not.toMatch(/on public\.(categories|products|product_variants|riders|coupons)\b/);
});

test("the old /admin screens outside the dashboard send non-staff to sign in", () => {
    const ADMIN = path.join(ROOT, "src", "app", "admin");
    const gate = read(path.join(ROOT, "src", "components", "admin", "LegacyStaffGate.tsx"));
    expect(gate).toContain("await requireStaff()");
    expect(gate).toContain('redirect("/admin/login")');
    const top = fs.readdirSync(ADMIN, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
    expect(top).toContain("customers");
    for (const dir of top) {
        if (dir === "login") continue;
        const layout = path.join(ADMIN, dir, "layout.tsx");
        expect(fs.existsSync(layout), `/admin/${dir} has a layout`).toBe(true);
        const src = read(layout);
        expect(/<LegacyStaffGate\b/.test(src) || /requireStaff\(\[\.\.\.OWNER_ADMIN\]\)/.test(src), `/admin/${dir} is gated`).toBe(true);
    }
});

test("invoice pay links read the invoice total from documents", () => {
    const route = read(path.join(ROOT, "src", "app", "api", "invoice", "paystack-link", "route.ts"));
    expect(route).not.toMatch(/from\("invoices"\)/);
    expect(route).toContain('.from("documents")');
    expect(route).toContain("const baseAmount = Number(invoiceData.amount);");
});
