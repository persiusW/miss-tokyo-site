import "./stubSupabaseEnv";
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { buildSystemPrompt } from "../../../src/lib/ai/missTokyoAi/prompt";
import { toolDefsFor } from "../../../src/lib/ai/missTokyoAi/tools";
import { CANNOT_DO, GUIDE, guideFor, salesStaffMissing } from "../../../src/lib/ai/missTokyoAi/guide";
import { V2_GUIDE } from "../../../src/lib/ai/missTokyoAi/guideV2";
import {
    ROUTES, V2_REPORTS, V2_ROUTES, V2_SETTINGS_SECTIONS, findRoute, routeTable, routesFor, type StaffRole,
} from "../../../src/lib/ai/missTokyoAi/routes";
import { ANCHORS, V2_ANCHORS, anchorFor, showMeAnchors } from "../../../src/lib/ai/missTokyoAi/anchors";
import { WALKTHROUGHS, walkthroughsFor } from "../../../src/lib/ai/missTokyoAi/walkthroughs";
import { navigateEffect, showMeEffect, walkthroughEffect } from "../../../src/lib/ai/missTokyoAi/effects";
import { OLD_VIEW, V2_AREAS, parseView, viewFromFlags, type AdminView } from "../../../src/lib/ai/missTokyoAi/view";
import { FLAGS_ALL, FLAGS_OFF, type V2Flags } from "../../../src/lib/admin/v2/routeMap";
import { NAV_GENERAL, NAV_MAIN } from "../../../src/components/admin/shell/nav";
import { SECTIONS } from "../../../src/components/admin/v2/settings/schema";
import { REPORTS } from "../../../src/lib/admin/v2/analytics";

// Miss Tokyo AI follows the admin each person sees: with the new admin on it
// must never name an old page or button, and with it off it must say what it
// always said. Also: every new route is a real page, and the roles match the
// new side menu and the pages' own guards.

const ROOT = path.resolve(__dirname, "../../..");
const DASH = path.join(ROOT, "src", "app", "(dashboard)");
const ROLES: StaffRole[] = ["admin", "owner", "sales_staff"];
const FEATURES = { sendToAdmin: true, bell: true, walkthroughs: true, voice: true, errorHelp: true };

const ALL_ON = viewFromFlags(FLAGS_ALL, { refundsLive: true });
/** Every view the switches can make: off, or the base new admin plus any of Products, Orders and the Till. */
const VIEWS: AdminView[] = [OLD_VIEW];
for (const products of [false, true]) for (const orders of [false, true]) for (const till of [false, true]) {
    const flags: V2Flags = { admin_v2: true, admin_v2_products: products, admin_v2_orders: orders, admin_v2_till: till };
    VIEWS.push(viewFromFlags(flags, { refundsLive: true }), viewFromFlags(flags, { refundsLive: false, preview: true }));
}

/** Everything the model reads: the system prompt and every tool definition. */
const modelText = (role: StaffRole, view: AdminView) =>
    `${buildSystemPrompt(role, FEATURES, view)}\n${JSON.stringify(toolDefsFor(role, FEATURES, view))}`;

// Old-admin wording. The named list, plus every quoted label in the old guide
// and every old route title and control label that the new admin doesn't also use.
const NAMED_OLD = [
    "Site Settings", "Point of Sale", "POS History", "Overview", "Mark Packed", "Mark Fulfilled", "Verify with Paystack",
    "Assign Rider & Ship", "Cash Received", "Send Link", "Manage Wholesalers", "old admin", "Catalog", "AI Settings",
    "Contact List", "Pay Links", "Abandoned Carts", "New Product", "Low Stock", "Confirm Dispatch", "Cancel Session",
    "/sales/", "/catalog/", "/pos", "/finance", "/cms", "/team", "/overview", "/customers/whatsapp",
];
const v2Words = V2_GUIDE.map(e => (typeof e.body === "function" ? e.body(ALL_ON) : e.body)).join("\n")
    + Object.values(V2_ROUTES).map(r => r.title).join("\n") + Object.values(V2_ANCHORS).map(a => a.label).join("\n");
const quoted = GUIDE.flatMap(e => [...(typeof e.body === "function" ? e.body(OLD_VIEW) : e.body).matchAll(/"([^"]{3,60})"/g)].map(m => m[1]));
const OLD_LABELS = [...new Set([
    ...NAMED_OLD,
    ...quoted,
    ...Object.values(ROUTES).filter(r => r.area).map(r => r.title),
    ...Object.values(ANCHORS).map(a => a.label),
])].filter(l => NAMED_OLD.includes(l) || !v2Words.includes(l))
    // Plain words both admins use, too short to tell apart, and "Within Accra",
    // the delivery zone the shop's checkout and create_order both call it.
    .filter(l => !["Dashboard", "Team", "Riders", "Refund", "Cancel", "Settings tabs", "Tick an order", "Within Accra"].includes(l));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hits = (text: string, label: string) =>
    /^[A-Za-z]/.test(label) ? new RegExp(`\\b${escape(label)}\\b`).test(text) : text.includes(label);

test("with the new admin on everywhere, nothing the model reads uses old-admin wording", () => {
    expect(OLD_LABELS.length).toBeGreaterThan(60);
    for (const role of ROLES) {
        const text = modelText(role, ALL_ON);
        const found = OLD_LABELS.filter(l => hits(text, l));
        expect(found, `${role}: old wording in the prompt or tools`).toEqual([]);
        expect(text).toContain("This person uses the new admin.");
    }
});

test("with the new admin off, the old prompt is unchanged in substance", () => {
    for (const role of ROLES) {
        const text = buildSystemPrompt(role, FEATURES, OLD_VIEW);
        for (const e of guideFor(role, OLD_VIEW)) expect(text, e.id).toContain(`## ${e.title}\n${e.body}`);
        expect(guideFor(role, OLD_VIEW).map(e => e.id)).toEqual(GUIDE.filter(e => !e.roles || e.roles.includes(role)).map(e => e.id));
        for (const c of CANNOT_DO) expect(text).toContain(`- ${c}`);
        for (const e of V2_GUIDE) {
            const body = typeof e.body === "function" ? e.body(OLD_VIEW) : e.body;
            expect(text.includes(body), `new entry ${e.id} leaked into the old prompt`).toBe(false);
        }
        expect(text).not.toMatch(/new admin/i);
        // The same core instructions as always.
        expect(text).toContain("You are Miss Tokyo AI, the assistant inside the Miss Tokyo staff dashboard.");
        expect(text).toContain("When you tell someone where something is, also call navigate_to");
    }
    expect(buildSystemPrompt("sales_staff", FEATURES, OLD_VIEW)).toContain(
        "This person is sales staff: Site Settings, Team, Wholesalers, Invoices, Pay Links and AI Settings are not in their menu.");
    expect(salesStaffMissing(OLD_VIEW)).toBe("Site Settings, Team, Wholesalers, Invoices, Pay Links and AI Settings");
    // The old admin's tool enums are its own routes and controls.
    const nav = toolDefsFor("admin", FEATURES, OLD_VIEW).find(t => t.name === "navigate_to")!;
    expect((nav.input_schema.properties as any).page.enum).toEqual(Object.keys(ROUTES));
});

test("each area shows exactly one guide, the prompt is stable per view, and preview devices hear about the way back", () => {
    for (const view of VIEWS) {
        for (const role of ROLES) {
            const ids = guideFor(role, view).map(e => e.id);
            expect(new Set(ids).size, `${role} ${JSON.stringify(view.areas)}: one entry per id`).toBe(ids.length);
            for (const e of guideFor(role, view)) if (e.route) expect(findRoute(e.route, view), `${e.id} → ${e.route}`).toBeTruthy();
            expect(buildSystemPrompt(role, FEATURES, view)).toBe(buildSystemPrompt(role, FEATURES, { ...view, areas: [...view.areas] }));
            const nav = toolDefsFor(role, FEATURES, view).find(t => t.name === "navigate_to")!;
            expect((nav.input_schema.properties as any).page.enum).toEqual(Object.keys(routeTable(view)));
        }
    }
    const preview = viewFromFlags(FLAGS_ALL, { preview: true });
    expect(buildSystemPrompt("owner", FEATURES, preview)).toContain("Back to the old admin");
    expect(buildSystemPrompt("owner", FEATURES, ALL_ON)).not.toContain("Back to the old admin");
    expect(viewFromFlags(FLAGS_OFF, { preview: true }).preview).toBe(false);
    // The browser's copy of the view can't invent areas.
    expect(parseView({ areas: ["orders", "nope"], shell: true }).areas).toEqual(["orders"]);
    expect(parseView(null)).toEqual(OLD_VIEW);
});

test("refunds are described as the store has them switched", () => {
    const orderPanel = (v: AdminView) => guideFor("owner", v).find(e => e.id === "order-detail")!.body;
    expect(orderPanel(ALL_ON)).toContain("go back to the customer through Paystack");
    expect(orderPanel(ALL_ON)).not.toContain("switched off");
    expect(orderPanel({ ...ALL_ON, refundsLive: false })).toContain("Refunds through Paystack are switched off");
});

test("mixed views name each neighbour as it really is", () => {
    // New admin on, Products still old: the old product form points at the new Settings.
    const productsOld = VIEWS.find(v => v.areas.includes("settings") && !v.areas.includes("products"))!;
    const form = guideFor("owner", productsOld).find(e => e.id === "product-form")!.body;
    expect(form).toContain("Settings › Product options");
    expect(form).not.toContain("Site Settings");
    // Everything off: the old names.
    expect(guideFor("owner", OLD_VIEW).find(e => e.id === "product-form")!.body).toContain("Site Settings → Store");
});

/** The page file a path renders, allowing one dynamic segment ([id], [section], [key]) per level. */
function pageFile(base: string, parts: string[]): string | null {
    if (parts.length === 0) return fs.existsSync(path.join(base, "page.tsx")) ? path.join(base, "page.tsx") : null;
    const [head, ...rest] = parts;
    if (fs.existsSync(path.join(base, head))) {
        const hit = pageFile(path.join(base, head), rest);
        if (hit) return hit;
    }
    if (!fs.existsSync(base)) return null;
    const dyn = fs.readdirSync(base).find(d => /^\[[a-z]+\]$/.test(d));
    return dyn ? pageFile(path.join(base, dyn), rest) : null;
}

test("every new route is a real page under (v2), or a shared page", () => {
    for (const [key, r] of Object.entries(V2_ROUTES)) {
        const parts = r.path.split("?")[0].split("/").filter(Boolean);
        const file = pageFile(path.join(DASH, "(v2)"), parts) ?? pageFile(DASH, parts);
        expect(file, `${key} → ${r.path}`).toBeTruthy();
        // Never an old-admin page outside (v2), apart from the shared ones that switch.
        if (!file!.includes(`${path.sep}(v2)${path.sep}`)) expect(fs.readFileSync(file!, "utf8"), `${key}: shared page switches`).toContain("v2AreaOn(");
        for (const t of r.tabStyle === "segment" ? r.tabs ?? [] : []) {
            expect(pageFile(path.join(DASH, "(v2)"), [...parts, t]), `${key}/${t}`).toBeTruthy();
        }
    }
});

test("new Settings sections and Analytics reports match the pages", () => {
    // "content" (Site content) only shows while Content is off; "account" is everyone's own.
    expect([...V2_SETTINGS_SECTIONS].sort()).toEqual(SECTIONS.map(s => s.k).filter(k => k !== "content" && k !== "account").sort());
    expect([...V2_REPORTS].sort()).toEqual(REPORTS.map(r => r.k).sort());
});

test("new route roles mirror the new side menu", () => {
    const nav = [...NAV_MAIN, ...NAV_GENERAL];
    for (const n of nav) {
        const route = Object.values(V2_ROUTES).find(r => r.path === n.href)!;
        expect(route, `nav ${n.k}`).toBeTruthy();
        expect(route.area, `nav ${n.k}`).toBe(n.k);
        if (n.full) expect(route.roles, `nav ${n.k}`).not.toContain("sales_staff");
        else expect(route.roles, `nav ${n.k}`).toContain("sales_staff");
    }
    // Every area in the menu, once.
    expect(nav.map(n => n.k).sort()).toEqual([...V2_AREAS].sort());
});

/** The page file and the v2 Route component it renders: where requireV2Page is called. */
function guardSource(routePath: string): string {
    const parts = routePath.split("?")[0].split("/").filter(Boolean);
    const v2 = path.join(DASH, "(v2)", ...parts, "page.tsx");
    const file = fs.existsSync(v2) ? v2 : path.join(DASH, ...parts, "page.tsx");
    let src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/from "@\/components\/admin\/v2\/([a-z]+)\/([A-Za-z]+)"/g)) {
        const f = path.join(ROOT, "src", "components", "admin", "v2", m[1], `${m[2]}.tsx`);
        if (fs.existsSync(f) && /Route|SettingsPage/.test(m[2])) src += "\n" + fs.readFileSync(f, "utf8");
    }
    return src;
}

test("pages the assistant keeps from sales staff are gated on the server", () => {
    const ownerAdmin = /requireV2Page\([^;]*\[\s*"(admin|owner)"\s*,\s*"(admin|owner)"\s*\]/;
    for (const [key, r] of Object.entries(V2_ROUTES)) {
        if (r.roles.includes("sales_staff")) continue;
        const src = guardSource(r.path);
        if (key === "inbox_questions") {
            // A chip on the shared Inbox page: only the admin is offered it.
            const lib = fs.readFileSync(path.join(ROOT, "src", "lib", "admin", "v2", "inbox.ts"), "utf8");
            expect(lib).toContain(`(f !== "ai" || role === "admin")`);
            continue;
        }
        if (key === "settings") {
            expect(src).toContain(`sec?.mine ? (["admin", "owner", "sales_staff"] as const) : (["admin", "owner"] as const)`);
            continue;
        }
        if (r.roles.length === 1 && r.roles[0] === "admin") {
            // Admin-only pages (Admin tools): the admin role and nobody else.
            expect(src, `${key} (${r.path})`).toMatch(/requireV2Page\([^;]*\[\s*"admin"\s*\]\s*\)/);
            continue;
        }
        expect(src, `${key} (${r.path})`).toMatch(ownerAdmin);
    }
    // Sales staff routes don't hide behind an owner/admin guard.
    for (const [key, r] of Object.entries(V2_ROUTES)) {
        if (!r.roles.includes("sales_staff") || key === "account") continue;
        const src = guardSource(r.path);
        const call = src.match(/requireV2Page\(([^;]*?)\)\s*;/)?.[1] ?? "";
        expect(call.includes(`["admin", "owner"]`) || call.includes(`["owner", "admin"]`), `${key}: ${call}`).toBe(false);
    }
});

test("Show me and Take me there open the new pages and sections", () => {
    expect(navigateEffect("settings", "owner", "delivery", ALL_ON)?.href).toBe("/settings/delivery");
    expect(navigateEffect("settings", "owner", "store", ALL_ON)).toBeNull();
    expect(navigateEffect("settings", "sales_staff", "delivery", ALL_ON)).toBeNull();
    expect(navigateEffect("account", "sales_staff", null, ALL_ON)?.href).toBe("/settings/account");
    expect(navigateEffect("analytics", "sales_staff", "payments", ALL_ON)?.href).toBe("/analytics?report=payments");
    expect(navigateEffect("pos", "admin", null, ALL_ON)).toBeNull();
    expect(navigateEffect("till_today", "sales_staff", null, ALL_ON)).toEqual({ kind: "navigate", route: "till_today", href: "/till/today", label: "Open Today's sales" });
    expect(navigateEffect("low_stock", "owner", null, ALL_ON)?.href).toBe("/catalogue/inventory?view=low");
    expect(navigateEffect("invoices", "sales_staff", null, ALL_ON)).toBeNull();
    expect(showMeEffect("settings.delivery-fees", "admin", ALL_ON)?.href).toBe("/settings/delivery");
    expect(showMeEffect("settings.pos-hold", "owner", ALL_ON)?.href).toBe("/settings/payments");
    expect(showMeEffect("pos.cash", "sales_staff", ALL_ON)?.href).toBe("/till");
    expect(showMeEffect("poshistory.cancel", "sales_staff", ALL_ON)?.href).toBe("/till/today");
    // The order's "…" menu lives in the order panel, which has no fixed address.
    expect(showMeEffect("orders.row-menu", "admin", ALL_ON)).toBeNull();
    expect(showMeAnchors(ALL_ON)).not.toContain("orders.row-menu");
    expect(walkthroughEffect("pos-sale", "sales_staff", ALL_ON)?.href).toBe("/till");
    expect(walkthroughEffect("delivery-fees", "owner", ALL_ON)?.href).toBe("/settings");
    // Old admin unchanged.
    expect(showMeEffect("settings.delivery-fees", "admin", OLD_VIEW)?.href).toBe("/settings?tab=store");
    expect(navigateEffect("pos", "admin", null, OLD_VIEW)?.href).toBe("/pos");
});

test("in every view, controls and tour steps live on pages of that view, worded for it", () => {
    for (const view of VIEWS) {
        const table = routeTable(view);
        for (const id of Object.keys(ANCHORS)) {
            const a = anchorFor(id, view)!;
            expect(a, `${id}`).toBeTruthy();
            const r = table[a.route];
            expect(r, `${id} → ${a.route}`).toBeTruthy();
            // The control's page is in the admin its area shows.
            const fromV2 = a === (V2_ANCHORS as Record<string, unknown>)[id];
            expect(r === (fromV2 ? (V2_ROUTES as any)[a.route] : (ROUTES as any)[a.route]), `${id} in ${JSON.stringify(view.areas)}`).toBe(true);
            if (a.tab) expect(r.tabs, id).toContain(a.tab);
        }
        for (const role of ROLES) {
            for (const w of walkthroughsFor(role, view)) {
                for (const [i, s] of w.steps.entries()) {
                    const r = findRoute(s.route, view);
                    expect(r, `${w.id}#${i} ${s.route}`).toBeTruthy();
                    expect(routesFor(role, view), `${w.id}#${i} for ${role}`).toContain(s.route);
                    if (s.anchor && !s.anchor.startsWith("topbar.")) expect(anchorFor(s.anchor, view)!.route, `${w.id}#${i}`).toBe(s.route);
                    if (s.anchor) expect(!!anchorFor(s.anchor, view)!.orderPage, `${w.id}#${i} order page`).toBe(!!s.orderPage);
                    // A step on a new page uses new words only.
                    if (r === (V2_ROUTES as any)[s.route]) {
                        const found = OLD_LABELS.filter(l => hits(s.text, l));
                        expect(found, `${w.id}#${i}`).toEqual([]);
                    }
                }
            }
        }
    }
    // Every tour has new-admin steps.
    for (const w of WALKTHROUGHS) expect(w.v2.length, w.id).toBeGreaterThan(0);
});

test("a route key both tables use means the same area in both", () => {
    for (const k of Object.keys(V2_ROUTES)) {
        if (k in ROUTES) expect((ROUTES as any)[k].area, k).toBe((V2_ROUTES as any)[k].area);
    }
    for (const view of VIEWS) {
        for (const [k, r] of Object.entries(routeTable(view))) {
            if (r.area) expect(view.areas.includes(r.area), `${k}`).toBe(r === (V2_ROUTES as any)[k]);
        }
    }
});

test("every control the new admin's Show me rings is on a new-admin element", () => {
    const files: string[] = [];
    const walk = (d: string) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, e.name);
            if (e.isDirectory()) walk(p);
            else if (/\.tsx?$/.test(e.name)) files.push(p);
        }
    };
    for (const d of [path.join(ROOT, "src", "components", "admin", "v2"), path.join(ROOT, "src", "components", "admin", "shell"), path.join(DASH, "(v2)")]) walk(d);
    const src = files.map(f => fs.readFileSync(f, "utf8")).join("\n");
    // Literal attributes, the kit's `assist` prop (RadioCards) and Settings rows' `assist:` field.
    for (const id of Object.keys(V2_ANCHORS)) {
        expect(src.includes(`data-assist="${id}"`) || src.includes(`assist: "${id}"`), id).toBe(true);
    }
});
