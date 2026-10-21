import { test, expect } from "@playwright/test";
import { decodeValues, encodeSection, type AiValidators } from "../../../src/components/admin/v2/settings/codec";
import {
    ANCHOR_SECTION, LEGACY_TAB_SECTION, SECTIONS, SECTION_LEGACY_HREF, findKey, sameKeyVal, searchSettings, sectionByKey, valueKeys, visibleSections, type Ctx,
} from "../../../src/components/admin/v2/settings/schema";
import { MESSAGE_EVENTS, withSamples } from "../../../src/components/admin/v2/settings/messages";
import { monthRangeUtc, monthUse } from "../../../src/components/admin/v2/settings/aiUse";
import { STATUS_TEMPLATE_EVENTS } from "../../../src/lib/ai/templateSettings";
import { SETTINGS_TABS } from "../../../src/lib/ai/missTokyoAi/routes";
import { ANCHORS } from "../../../src/lib/ai/missTokyoAi/anchors";

// Admin v2 Settings: what the page shows, what the save action accepts, and
// how it maps onto the real columns. Pure: no database.

const STORE = {
    enable_store_pickup: true, maintenance_mode: false, platform_fee_percentage: 2.5, platform_fee_label: "Fee", show_fee_at_checkout: true,
    pos_hold_minutes: 15, delivery_fees_enabled: true, delivery_fee_accra: 35, delivery_fee_outside: 20, homepage_route: "shop",
    shop_grid_cols: 5, shop_mobile_cols: 2, shop_product_limit: 24, home_grid_cols: 4, home_product_limit: 6, shop_image_stretch: false,
    wholesale_tier_1_min: 3, wholesale_tier_1_max: 5, wholesale_tier_2_min: 6, wholesale_tier_2_max: 10, wholesale_tier_3_min: 11, wholesale_tier_3_max: 30,
    global_sizes: ["S", "M"], global_colors: ["Black"], global_brands: [],
};
const AI = [
    "whatsapp_enabled", "dashboard_agent_enabled", "shop_assistant_enabled", "shop_assistant_daily_messages_per_visitor", "shop_assistant_cap_share_pct",
    "daily_spend_cap_ghs", "admin_cost_markup_pct", "shop_whatsapp_number", "whatsapp_handoff_number", "whatsapp_handoff_template_id",
    "whatsapp_wallet_alert_number", "whatsapp_wallet_alert_ghs", "whatsapp_choices_enabled", "whatsapp_returns_enabled", "whatsapp_status_notifications",
    "whatsapp_unpaid_nudge_enabled", "whatsapp_restock_alerts_enabled", "whatsapp_restock_template_id",
    "mtai_send_to_admin_enabled", "mtai_bell_enabled", "mtai_walkthroughs_enabled", "mtai_voice_enabled", "mtai_error_help_enabled", "mtai_error_log_enabled",
].map(key => ({ key, value: key.endsWith("_enabled") || key === "whatsapp_status_notifications" ? true : key.endsWith("_pct") || key.endsWith("_ghs") || key.endsWith("visitor") ? 40 : "" }));

const saved = decodeValues({ store: STORE, biz: { business_name: "Miss Tokyo", tax_rate: 0 }, site: { pickup_enabled: true }, push: {}, meta: {}, ai: AI, wholesaleCats: [] });

// The real validators' rules, restated so this test needs no database client.
const int = (min: number, max: number) => (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
const VALID: AiValidators = {
    ...Object.fromEntries(AI.map(a => [a.key, (v: unknown) => typeof v === "boolean"])),
    daily_spend_cap_ghs: v => typeof v === "number" && v >= 0 && v <= 10_000,
    admin_cost_markup_pct: v => typeof v === "number" && v >= 0 && v <= 500,
    shop_assistant_daily_messages_per_visitor: int(1, 200),
    shop_assistant_cap_share_pct: int(0, 100),
    whatsapp_wallet_alert_ghs: v => typeof v === "number" && v >= 0,
    shop_whatsapp_number: v => v === "" || /^233\d{9}$/.test(String(v)),
    whatsapp_handoff_number: v => v === "" || /^233\d{9}$/.test(String(v)),
    whatsapp_wallet_alert_number: v => v === "" || /^233\d{9}$/.test(String(v)),
    whatsapp_handoff_template_id: v => v === "" || /^\d{1,16}$/.test(String(v)),
    whatsapp_restock_template_id: v => v === "" || /^\d{1,16}$/.test(String(v)),
};
const OWNER_VALID = Object.fromEntries(Object.entries(VALID).filter(([k]) => k !== "admin_cost_markup_pct"));

test("every saved row in every section has a value the page can show", () => {
    for (const sec of SECTIONS) for (const k of valueKeys(sec, "admin")) {
        expect(saved, `${sec.k} › ${k}`).toHaveProperty([k]);
    }
});

test("pickup is one switch that writes both pickup columns", () => {
    const r = encodeSection("location", { "store.enable_store_pickup": false }, saved, "owner", OWNER_VALID);
    expect(r.ok && r.payload).toEqual({ store: { enable_store_pickup: false }, site: { pickup_enabled: false } });
});

test("choices are mapped back to their columns", () => {
    const r = encodeSection("status", { "store.maintenance_mode": "closed" }, saved, "owner", OWNER_VALID);
    expect(r.ok && r.payload.store).toEqual({ maintenance_mode: true });
    const l = encodeSection("layout", { "store.shop_image_stretch": "stretch", "store.shop_grid_cols": "3" }, saved, "owner", OWNER_VALID);
    expect(l.ok && l.payload.store).toEqual({ shop_image_stretch: true, shop_grid_cols: 3 });
});

test("values outside what the shop allows are refused with a plain sentence", () => {
    const hold = encodeSection("payments", { "store.pos_hold_minutes": "60" }, saved, "owner", OWNER_VALID);
    expect(hold.ok).toBe(false);
    // The processing fee is not a Settings row any more (Admin tools › Fees): never saved from here.
    for (const role of ["owner", "admin"] as const) {
        for (const k of ["store.platform_fee_percentage", "store.platform_fee_label", "store.show_fee_at_checkout"]) {
            expect(encodeSection("checkout", { [k]: k.endsWith("percentage") ? "2" : k.endsWith("label") ? "x" : true }, saved, role, role === "admin" ? VALID : OWNER_VALID).ok, `${role} ${k}`).toBe(false);
        }
    }
    const tier = encodeSection("wholesale", { "store.wholesale_tier_2_min": "12" }, saved, "owner", OWNER_VALID);
    expect(!tier.ok && tier.error).toBe("Tier 2: the first number can't be more than the second.");
    const name = encodeSection("profile", { "biz.business_name": "  " }, saved, "owner", OWNER_VALID);
    expect(name.ok).toBe(false);
});

test("a key from another section, or an unknown one, is never saved", () => {
    expect(encodeSection("checkout", { "store.maintenance_mode": "closed" }, saved, "owner", OWNER_VALID).ok).toBe(false);
    expect(encodeSection("checkout", { "store.id": "x" }, saved, "owner", OWNER_VALID).ok).toBe(false);
    expect(encodeSection("account", { "biz.business_name": "x" }, saved, "owner", OWNER_VALID).ok).toBe(false);
    expect(encodeSection("nope", { "biz.business_name": "x" }, saved, "owner", OWNER_VALID).ok).toBe(false);
});

test("the cost markup moved to Admin tools: Settings never saves or shows it, for anyone", () => {
    expect(encodeSection("assistants", { "ai.admin_cost_markup_pct": "20" }, saved, "owner", OWNER_VALID).ok).toBe(false);
    expect(encodeSection("assistants", { "ai.admin_cost_markup_pct": "20" }, saved, "admin", VALID).ok).toBe(false);
    const ctx = { role: "owner" } as Ctx;
    expect(searchSettings("markup", ctx).length).toBe(0);
    expect(searchSettings("markup", { ...ctx, role: "admin" }).length).toBe(0);
});

test("AI settings are typed and numbers normalised before the validators see them", () => {
    const r = encodeSection("assistants", { "ai.daily_spend_cap_ghs": "60", "ai.shop_whatsapp_number": "024 123 4567", "ai.whatsapp_enabled": false }, saved, "owner", OWNER_VALID);
    expect(r.ok && r.payload.ai).toEqual([
        { key: "daily_spend_cap_ghs", value: 60 }, { key: "shop_whatsapp_number", value: "233241234567" }, { key: "whatsapp_enabled", value: false },
    ]);
    expect(encodeSection("assistants", { "ai.shop_whatsapp_number": "12" }, saved, "owner", OWNER_VALID).ok).toBe(false);
    expect(encodeSection("assistants", { "ai.shop_assistant_daily_messages_per_visitor": "0" }, saved, "owner", OWNER_VALID).ok).toBe(false);
});

test("home-page SEO is written as one site_metadata row for /", () => {
    const r = encodeSection("seo", { "meta.title": "Miss Tokyo" }, { ...saved, "meta.description": "Dresses", "meta.keywords": "a,b" }, "owner", OWNER_VALID);
    expect(r.ok && r.payload.metadata).toEqual([{ page_path: "/", title: "Miss Tokyo", description: "Dresses", keywords: "a,b" }]);
});

test("wholesale-only categories compare as sets and save as ids", () => {
    const id = "6f1c2b8e-0a6d-4c1e-9f3a-2b7d1e0c9a11";
    expect(sameKeyVal("cats.wholesale", [id, "x"], ["x", id])).toBe(true);
    const r = encodeSection("wholesale", { "cats.wholesale": [id] }, saved, "owner", OWNER_VALID);
    expect(r.ok && r.payload.wholesale_categories).toEqual([id]);
    expect(encodeSection("wholesale", { "cats.wholesale": ["not-an-id"] }, saved, "owner", OWNER_VALID).ok).toBe(false);
});

test("every old Settings tab, anchor and section has somewhere to go", () => {
    for (const t of SETTINGS_TABS) expect(sectionByKey(LEGACY_TAB_SECTION[t]), `?tab=${t}`).toBeTruthy();
    for (const [anchor, sec] of Object.entries(ANCHOR_SECTION)) {
        expect(Object.keys(ANCHORS)).toContain(anchor);
        expect(sectionByKey(sec)).toBeTruthy();
    }
    for (const href of Object.values(SECTION_LEGACY_HREF)) expect(href.startsWith("/settings")).toBe(true);
    expect(SECTION_LEGACY_HREF.assistants).toBe("/settings/ai");
});

test("search finds rows by plain words and says where they live", () => {
    const ctx = { role: "owner", contentOn: false } as Ctx;
    const hits = searchSettings("delivery", ctx);
    expect(hits.some(h => h.row.k === "store.delivery_fee_accra" && h.sec.g === "Selling" && h.sec.t === "Shipping and delivery")).toBe(true);
    expect(searchSettings("x", ctx)).toEqual([]);
    expect(findKey("store.wholesale_tier_1_max")?.sec.k).toBe("wholesale");
});

test("sales staff only reach their own account", () => {
    const secs = visibleSections({ role: "sales_staff", contentOn: false } as Ctx).map(s => s.k);
    expect(secs).toEqual(["account"]);
});

test("messages cover every WhatsApp status template and fill sample values", () => {
    for (const e of STATUS_TEMPLATE_EVENTS) expect(MESSAGE_EVENTS.some(m => m.wa === e), e).toBe(true);
    expect(withSamples("Hi {customer_name}, order {order_id}")).toBe("Hi Test Customer, order TEST1234");
});

test("AI use this month (gap 19): the calendar month in UTC, markup only when asked", () => {
    const r = monthRangeUtc(new Date("2026-10-21T15:00:00Z"));
    expect(r).toMatchObject({ from: "2026-10-01T00:00:00.000Z", to: "2026-11-01T00:00:00.000Z", label: "October 2026" });
    expect(monthRangeUtc(new Date("2026-12-31T23:59:00Z")).to).toBe("2027-01-01T00:00:00.000Z");
    expect(monthUse(1, 10, null)).toEqual({ turns: 10, ghs: 15.5, withMarkupGhs: null });
    expect(monthUse(1, 10, 50)).toEqual({ turns: 10, ghs: 15.5, withMarkupGhs: 23.25 });
});
