"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { toast } from "@/lib/toast";
import { TagInput } from "@/components/ui/TagInput";
import { EmailsTab } from "./EmailsTab";
import { NotificationsTab } from "./NotificationsTab";
import { RidersTab } from "./RidersTab";
import { SizeGuideTab } from "./SizeGuideTab";
import { BusinessSettingsTab } from "./BusinessSettingsTab";
import { ShippingTab } from "./ShippingTab";
import { ProductPageTab } from "./ProductPageTab";
import { HeroSlidesTab } from "./HeroSlidesTab";
import { TrustBarTab } from "./TrustBarTab";
import { HomepageSectionsTab } from "./HomepageSectionsTab";
import { NavigationTab } from "./NavigationTab";
import { ReviewsTab } from "./ReviewsTab";
import { AssetsTab } from "./AssetsTab";
import { AboutPageTab } from "./AboutPageTab";
import { GiftCardsTab } from "./GiftCardsTab";

type BusinessSettings = {
    business_name: string;
    email: string;
    contact: string;
    address: string;
    logo_url: string | null;
    tax_rate: number;
};

type StoreSettings = {
    global_sizes: string[];
    global_colors: string[];
    global_stitching: string[];
    enable_store_pickup: boolean;
    maintenance_mode: boolean;
    home_grid_cols: 2 | 3 | 4 | 5;
    shop_grid_cols: 2 | 3 | 4 | 5;
    shop_mobile_cols: 1 | 2;
    home_product_limit: 4 | 6 | 8 | 12;
    shop_product_limit: 8 | 12 | 16 | 24 | 32;
    shop_show_title: boolean;
    shop_image_stretch: boolean;
    platform_fee_percentage: number;
    platform_fee_label: string;
    show_fee_at_checkout: boolean;
    enable_gift_cards: boolean;
    enable_gallery: boolean;
    enable_craft: boolean;
    enable_whitelabel: boolean;
    enable_custom_requests: boolean;
    homepage_route: "home" | "shop" | "gallery";
    // Wholesale
    wholesale_enabled: boolean;
    wholesale_tier_1_min: number;
    wholesale_tier_1_max: number;
    wholesale_tier_2_min: number;
    wholesale_tier_2_max: number;
    wholesale_tier_3_min: number;
    wholesale_tier_3_max: number;
};

const DEFAULT_BUSINESS: BusinessSettings = {
    business_name: "Miss Tokyo",
    email: "",
    contact: "",
    address: "",
    logo_url: null,
    tax_rate: 0,
};

const DEFAULT_STORE: StoreSettings = {
    global_sizes: ["39", "40", "41", "42", "43", "44", "45"],
    global_colors: ["Noir", "Cognac", "Sand"],
    global_stitching: ["Tonal", "Contrast White"],
    enable_store_pickup: false,
    maintenance_mode: false,
    home_grid_cols: 4,
    shop_grid_cols: 4,
    shop_mobile_cols: 2,
    home_product_limit: 4,
    shop_product_limit: 12,
    shop_show_title: true,
    shop_image_stretch: false,
    platform_fee_percentage: 0,
    platform_fee_label: "Service Charge",
    show_fee_at_checkout: false,
    enable_gift_cards: true,
    enable_gallery: true,
    enable_craft: true,
    enable_whitelabel: true,
    enable_custom_requests: true,
    homepage_route: "home",
    wholesale_enabled: false,
    wholesale_tier_1_min: 3,
    wholesale_tier_1_max: 5,
    wholesale_tier_2_min: 8,
    wholesale_tier_2_max: 10,
    wholesale_tier_3_min: 12,
    wholesale_tier_3_max: 24,
};

type SiteMetadata = {
    id?: string;
    page_path: string;
    title: string;
    description: string;
    og_image_url: string;
    keywords: string;
};

type TabKey = "business" | "store" | "shipping" | "cms" | "seo" | "emails" | "notifications" | "riders" | "size-guide" | "product-page";
type CmsTabKey = "hero-slides" | "trust-bar" | "homepage" | "navigation" | "reviews" | "about" | "gift-cards" | "assets";

function CMSTab() {
    const [activeCmsTab, setActiveCmsTab] = useState<CmsTabKey>("hero-slides");

    const cmsTabs: { key: CmsTabKey; label: string }[] = [
        { key: "hero-slides", label: "Hero Slides" },
        { key: "trust-bar",   label: "Trust Bar" },
        { key: "homepage",    label: "Sections" },
        { key: "navigation",  label: "Navigation" },
        { key: "reviews",     label: "Reviews" },
        { key: "about",       label: "About Page" },
        { key: "gift-cards",  label: "Gift Cards" },
        { key: "assets",      label: "Site Assets" },
    ];

    return (
        <>
            <div className="ac-tabs" style={{ marginBottom: 24, borderBottom: "1px solid var(--ac-line-2)" }}>
                {cmsTabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveCmsTab(tab.key)}
                        className={`ac-tab ${activeCmsTab === tab.key ? "active" : ""}`}>
                        {tab.label}
                    </button>
                ))}
            </div>
            {activeCmsTab === "hero-slides" && <HeroSlidesTab />}
            {activeCmsTab === "trust-bar"   && <TrustBarTab />}
            {activeCmsTab === "homepage"    && <HomepageSectionsTab />}
            {activeCmsTab === "navigation"  && <NavigationTab />}
            {activeCmsTab === "reviews"     && <ReviewsTab />}
            {activeCmsTab === "about"       && <AboutPageTab />}
            {activeCmsTab === "gift-cards"  && <GiftCardsTab />}
            {activeCmsTab === "assets"      && <AssetsTab />}
        </>
    );
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("business");

    const tabs: { key: TabKey; label: string }[] = [
        { key: "business",      label: "Business" },
        { key: "store",         label: "Store" },
        { key: "shipping",      label: "Shipping" },
        { key: "cms",           label: "CMS" },
        { key: "seo",           label: "SEO" },
        { key: "emails",        label: "Emails" },
        { key: "notifications", label: "Notifications" },
        { key: "riders",        label: "Riders" },
        { key: "size-guide",    label: "Size Guide" },
        { key: "product-page",  label: "Product Page" },
    ];

    return (
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Settings</h1>
                    <p className="ac-page-sub">Business details, store configuration, and operations.</p>
                </div>
            </div>

            <div className="ac-tabs" style={{ marginBottom: 28, overflowX: "auto" }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`ac-tab${activeTab === tab.key ? " active" : ""}`}
                        style={{ whiteSpace: "nowrap" }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div>
                {activeTab === "business"      && <><BusinessTab /><div style={{ marginTop: 24 }}><BusinessSettingsTab /></div></>}
                {activeTab === "store"         && <StoreTab />}
                {activeTab === "shipping"      && <ShippingTab />}
                {activeTab === "cms"           && <CMSTab />}
                {activeTab === "seo"           && <SEOTab />}
                {activeTab === "emails"        && <EmailsTab />}
                {activeTab === "notifications" && <NotificationsTab />}
                {activeTab === "riders"        && <RidersTab />}
                {activeTab === "size-guide"    && <SizeGuideTab />}
                {activeTab === "product-page"  && <ProductPageTab />}
            </div>
        </>
    );
}

function BusinessTab() {
    const [form, setForm] = useState<BusinessSettings>(DEFAULT_BUSINESS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        supabase.from("business_settings").select("*").eq("id", "default").single()
            .then(({ data: bData }: { data: any }) => {
                setForm({
                    business_name: bData?.business_name || "",
                    email: bData?.email || "",
                    contact: bData?.contact || "",
                    address: bData?.address || "",
                    logo_url: bData?.logo_url || null,
                    tax_rate: Number(bData?.tax_rate) || 0,
                });
                setLoading(false);
            });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await supabase.from("business_settings").upsert(
            { id: "default", ...form, tax_rate: Number(form.tax_rate), updated_at: new Date().toISOString() },
            { onConflict: "id" }
        );
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (loading) {
        return <div className="ac-empty"><p className="ac-empty-title">Loading...</p></div>;
    }

    return (
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, alignItems: "start" }}>
                {/* Left: Brand / Logo */}
                <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)", paddingBottom: 10, borderBottom: "1px solid var(--ac-line)" }}>Brand</p>
                    <ImageUploader
                        bucket="site-assets"
                        folder="logos"
                        currentUrl={form.logo_url}
                        onUpload={(url) => setForm(p => ({ ...p, logo_url: url }))}
                        aspectRatio="square"
                        label="Business Logo"
                    />
                    <div>
                        <label className="ac-label">Tax Rate (%)</label>
                        <input type="number" name="tax_rate" min="0" max="100" step="0.1"
                            value={form.tax_rate} onChange={handleChange}
                            className="ac-input" style={{ marginTop: 6 }} placeholder="0" />
                        <p style={{ fontSize: 10, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".05em", marginTop: 4 }}>Applied to taxable order totals.</p>
                    </div>
                </div>

                {/* Right: Business Details */}
                <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)", paddingBottom: 10, borderBottom: "1px solid var(--ac-line)" }}>Business Details</p>

                    <div>
                        <label className="ac-label">Business Name</label>
                        <input type="text" name="business_name" required value={form.business_name} onChange={handleChange}
                            className="ac-input" style={{ marginTop: 6 }} placeholder="Miss Tokyo" />
                    </div>
                    <div>
                        <label className="ac-label">Business Email</label>
                        <input type="email" name="email" value={form.email} onChange={handleChange}
                            className="ac-input" style={{ marginTop: 6 }} placeholder="hello@misstokyo.shop" />
                    </div>
                    <div>
                        <label className="ac-label">Contact / Phone</label>
                        <input type="text" name="contact" value={form.contact} onChange={handleChange}
                            className="ac-input" style={{ marginTop: 6 }} placeholder="+233 ..." />
                    </div>
                    <div>
                        <label className="ac-label">Business Address</label>
                        <textarea name="address" rows={2} value={form.address} onChange={handleChange}
                            className="ac-textarea" style={{ marginTop: 6 }} placeholder="123 Main Street, Accra, Ghana" />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, paddingTop: 4 }}>
                        {saved && <span style={{ fontSize: 11, color: "var(--ac-accent)", textTransform: "uppercase", letterSpacing: ".06em" }}>Saved</span>}
                        <button type="submit" disabled={saving} className="ac-btn ac-btn-primary">
                            {saving ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}

function StoreTab() {
    const [form, setForm] = useState<StoreSettings>(DEFAULT_STORE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [allCategories, setAllCategories] = useState<{ id: string; name: string; is_wholesale: boolean }[]>([]);
    const [wholesaleCatIds, setWholesaleCatIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        supabase.from("store_settings").select("*").eq("id", "default").single()
            .then(({ data: sData }: { data: any }) => {
                if (sData) {
                    setForm({
                        global_sizes: sData.global_sizes || DEFAULT_STORE.global_sizes,
                        global_colors: sData.global_colors || DEFAULT_STORE.global_colors,
                        global_stitching: sData.global_stitching || DEFAULT_STORE.global_stitching,
                        enable_store_pickup: sData.enable_store_pickup || false,
                        maintenance_mode: sData.maintenance_mode || false,
                        home_grid_cols: (sData.home_grid_cols as 2 | 3 | 4 | 5) || 4,
                        shop_grid_cols: (sData.shop_grid_cols as 2 | 3 | 4 | 5) || 4,
                        shop_mobile_cols: (sData.shop_mobile_cols as 1 | 2) || 2,
                        home_product_limit: (sData.home_product_limit as 4 | 6 | 8 | 12) || 4,
                        shop_product_limit: (sData.shop_product_limit as 8 | 12 | 16 | 24 | 32) || 12,
                        shop_show_title: sData.shop_show_title ?? true,
                        shop_image_stretch: sData.shop_image_stretch ?? false,
                        platform_fee_percentage: Number(sData.platform_fee_percentage) ?? 0,
                        platform_fee_label: sData.platform_fee_label || "Service Charge",
                        show_fee_at_checkout: sData.show_fee_at_checkout ?? false,
                        enable_gift_cards: sData.enable_gift_cards ?? true,
                        enable_gallery: sData.enable_gallery ?? true,
                        enable_craft: sData.enable_craft ?? true,
                        enable_whitelabel: sData.enable_whitelabel ?? true,
                        enable_custom_requests: sData.enable_custom_requests ?? true,
                        homepage_route: (sData.homepage_route ?? "home") as "home" | "shop" | "gallery",
                        wholesale_enabled: sData.wholesale_enabled ?? false,
                        wholesale_tier_1_min: sData.wholesale_tier_1_min ?? 3,
                        wholesale_tier_1_max: sData.wholesale_tier_1_max ?? 5,
                        wholesale_tier_2_min: sData.wholesale_tier_2_min ?? 8,
                        wholesale_tier_2_max: sData.wholesale_tier_2_max ?? 10,
                        wholesale_tier_3_min: sData.wholesale_tier_3_min ?? 12,
                        wholesale_tier_3_max: sData.wholesale_tier_3_max ?? 24,
                    });
                }
                setLoading(false);
            });

        // Fetch all active categories to allow selection
        supabase.from("categories").select("id, name, is_wholesale").eq("is_active", true).order("name")
            .then(({ data: catData }: { data: any[] | null }) => {
                if (catData) {
                    setAllCategories(catData);
                    setWholesaleCatIds(new Set(catData.filter((c: any) => c.is_wholesale).map((c: any) => c.id)));
                }
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await supabase.from("store_settings").upsert(
            { id: "default", ...form },
            { onConflict: "id" }
        );

        // Update categories wholesale status
        for (const cat of allCategories) {
            const isWholesale = wholesaleCatIds.has(cat.id);
            if (isWholesale !== cat.is_wholesale) {
                await supabase.from("categories").update({ is_wholesale: isWholesale }).eq("id", cat.id);
            }
        }

        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (loading) {
        return <div className="ac-empty"><p className="ac-empty-title">Loading...</p></div>;
    }

    const secTitle = (label: string) => (
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".08em", color: "var(--ac-ink-3)", paddingBottom: 10, borderBottom: "1px solid var(--ac-line)" }}>{label}</p>
    );
    const subLabel = (text: string) => (
        <p style={{ fontSize: 10, color: "var(--ac-ink-4)", textTransform: "uppercase" as const, letterSpacing: ".05em", marginTop: 3 }}>{text}</p>
    );

    return (
        <>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20, alignItems: "start" }}>
                    {/* Left column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Store Configuration */}
                        <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                            {secTitle("Store Configuration")}

                            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                                <input type="checkbox" className="ac-checkbox" checked={form.enable_store_pickup}
                                    onChange={(e) => setForm(p => ({ ...p, enable_store_pickup: e.target.checked }))} />
                                <div>
                                    <span className="ac-label">Enable Store Pickup</span>
                                    {subLabel("Allow customers to pick up orders directly from the atelier.")}
                                </div>
                            </label>

                            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", paddingTop: 12, borderTop: "1px solid var(--ac-line)" }}>
                                <input type="checkbox" className="ac-checkbox" checked={form.maintenance_mode}
                                    onChange={(e) => setForm(p => ({ ...p, maintenance_mode: e.target.checked }))} />
                                <div>
                                    <span className="ac-label">Enable Coming Soon / Maintenance Mode</span>
                                    {subLabel("Restrict access to the shop and show a coming soon placeholder.")}
                                </div>
                            </label>

                            <div style={{ paddingTop: 12, borderTop: "1px solid var(--ac-line)" }}>
                                <label className="ac-label">Default Landing Page</label>
                                {subLabel("Choose which page customers land on when they visit the site root (/).")}
                                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                    {([
                                        { value: "home", label: "Home" },
                                        { value: "shop", label: "Shop" },
                                        { value: "gallery", label: "Gallery" },
                                    ] as const).map(opt => (
                                        <button key={opt.value} type="button"
                                            onClick={() => setForm(p => ({ ...p, homepage_route: opt.value }))}
                                            style={{ flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 600, border: `1px solid ${form.homepage_route === opt.value ? "var(--ac-accent)" : "var(--ac-line)"}`, background: form.homepage_route === opt.value ? "var(--ac-accent)" : "transparent", color: form.homepage_route === opt.value ? "#fff" : "var(--ac-ink-3)", cursor: "pointer", borderRadius: "var(--r-sm)" }}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ paddingTop: 12, borderTop: "1px solid var(--ac-line)", display: "flex", flexDirection: "column", gap: 14 }}>
                                <div>
                                    <label className="ac-label">Global Shoe Sizes</label>
                                    <div style={{ marginTop: 6 }}>
                                        <TagInput value={form.global_sizes} onChange={(tags) => setForm(p => ({ ...p, global_sizes: tags }))} placeholder="Type a size and press Enter…" />
                                    </div>
                                    {subLabel("Press Enter or , to add each size.")}
                                </div>
                                <div>
                                    <label className="ac-label">Global Colors</label>
                                    <div style={{ marginTop: 6 }}>
                                        <TagInput value={form.global_colors} onChange={(tags) => setForm(p => ({ ...p, global_colors: tags }))} placeholder="Type a color and press Enter…" />
                                    </div>
                                    {subLabel("Press Enter or , to add each color.")}
                                </div>
                            </div>
                        </div>
                    </div>{/* end left column */}

                    {/* Right column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Visual Merchandising */}
                        <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                            {secTitle("Visual Merchandising")}
                            {subLabel("Control the product columns on desktop and how many items appear in the homepage featured grid.")}

                            {([
                                { label: "Homepage Grid Columns", field: "home_grid_cols" as const, opts: [2,3,4,5] as const, note: "Columns on the homepage collection grid." },
                                { label: "Shop Page Grid Columns", field: "shop_grid_cols" as const, opts: [2,3,4,5] as const, note: "Columns on the full shop listing grid." },
                                { label: "Shop Mobile Columns",    field: "shop_mobile_cols" as const, opts: [1,2] as const, note: "Grid columns on mobile devices." },
                                { label: "Featured Products on Homepage", field: "home_product_limit" as const, opts: [4,6,8,12] as const, note: "Number shown in the homepage collection grid." },
                                { label: "Shop — Products Per Page", field: "shop_product_limit" as const, opts: [8,12,16,24,32] as const, note: "Total products loaded per page on shop listing." },
                            ] as const).map(({ label, field, opts, note }) => (
                                <div key={field} style={{ paddingTop: 12, borderTop: "1px solid var(--ac-line)" }}>
                                    <label className="ac-label">{label}</label>
                                    <div style={{ display: "flex", gap: 6, marginTop: 8, maxWidth: 320 }}>
                                        {(opts as readonly number[]).map(n => (
                                            <button key={n} type="button" onClick={() => setForm(p => ({ ...p, [field]: n }))}
                                                style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 600, border: `1px solid ${(form[field] as number) === n ? "var(--ac-accent)" : "var(--ac-line)"}`, background: (form[field] as number) === n ? "var(--ac-accent)" : "transparent", color: (form[field] as number) === n ? "#fff" : "var(--ac-ink-3)", cursor: "pointer", borderRadius: "var(--r-sm)" }}>
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                    {subLabel(note)}
                                </div>
                            ))}

                            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", paddingTop: 12, borderTop: "1px solid var(--ac-line)" }}>
                                <input type="checkbox" className="ac-checkbox" checked={form.shop_show_title}
                                    onChange={(e) => setForm(p => ({ ...p, shop_show_title: e.target.checked }))} />
                                <div>
                                    <span className="ac-label">Show Shop Page Title &amp; Subtitle</span>
                                    {subLabel("Display the hero text header above the product grid on the shop page.")}
                                </div>
                            </label>

                            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", paddingTop: 12, borderTop: "1px solid var(--ac-line)" }}>
                                <input type="checkbox" className="ac-checkbox" checked={form.shop_image_stretch}
                                    onChange={(e) => setForm(p => ({ ...p, shop_image_stretch: e.target.checked }))} />
                                <div>
                                    <span className="ac-label">Stretch Product Images to Fill Frame</span>
                                    {subLabel("When on, images fill the card exactly (may distort). When off, images are cropped to fit.")}
                                </div>
                            </label>
                        </div>

                    </div>{/* end right column */}
                </div>{/* end grid */}

                {/* Platform Fees */}
                <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    {secTitle("Platform Fees")}
                    {subLabel("A percentage-based fee applied to all orders, invoices, and payment links to offset processing charges.")}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                        <div>
                            <label className="ac-label">Fee Percentage (%)</label>
                            <input type="number" min="0" max="100" step="0.1"
                                value={form.platform_fee_percentage}
                                onChange={(e) => setForm(p => ({ ...p, platform_fee_percentage: parseFloat(e.target.value) || 0 }))}
                                className="ac-input" style={{ marginTop: 6 }} placeholder="2.5" />
                            {subLabel("e.g. 2.5 adds 2.5% to every order total.")}
                        </div>
                        <div>
                            <label className="ac-label">Fee Label</label>
                            <input type="text"
                                value={form.platform_fee_label}
                                onChange={(e) => setForm(p => ({ ...p, platform_fee_label: e.target.value }))}
                                className="ac-input" style={{ marginTop: 6 }} placeholder="Service Charge" />
                            {subLabel("Label shown to customers on receipts.")}
                        </div>
                    </div>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", paddingTop: 12, borderTop: "1px solid var(--ac-line)" }}>
                        <input type="checkbox" className="ac-checkbox" checked={form.show_fee_at_checkout}
                            onChange={(e) => setForm(p => ({ ...p, show_fee_at_checkout: e.target.checked }))} />
                        <div>
                            <span className="ac-label">Show Fee as Itemised Line at Checkout</span>
                            {subLabel("When off, the fee is silently rolled into \"Shipping & Handling\".")}
                        </div>
                    </label>
                </div>

                {/* Feature Toggles */}
                <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {secTitle("Feature Toggles")}
                    {subLabel("Enable or disable storefront sections. Hidden sections are removed from the navigation.")}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                        {([
                            { key: "enable_gift_cards" as const, label: "Gift Cards", desc: "Show the gift card purchase page in the navbar." },
                            { key: "enable_gallery" as const, label: "Gallery", desc: "Show the gallery page and nav link." },
                            { key: "enable_craft" as const, label: "The Craft", desc: "Show the craft / process page in the navbar." },
                            { key: "enable_whitelabel" as const, label: "White Labelling", desc: "Show the white labelling / custom order page." },
                            { key: "enable_custom_requests" as const, label: "Custom Requests", desc: "Enable the custom order request form and admin submissions inbox." },
                        ] as const).map(({ key, label, desc }) => (
                            <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--ac-line)", cursor: "pointer" }}>
                                <input type="checkbox" className="ac-checkbox" checked={form[key]}
                                    onChange={(e) => setForm(p => ({ ...p, [key]: e.target.checked }))} />
                                <div>
                                    <span className="ac-label">{label}</span>
                                    {subLabel(desc)}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Wholesale Configuration */}
                <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    {secTitle("Wholesale / B2B Configuration")}
                    {subLabel("Enable B2B wholesale pricing with quantity-based tiers. Wholesale users see custom pricing instead of retail prices.")}
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                        <input type="checkbox" className="ac-checkbox" checked={form.wholesale_enabled}
                            onChange={(e) => setForm(p => ({ ...p, wholesale_enabled: e.target.checked }))} />
                        <div>
                            <span className="ac-label">Enable Global Tier-Based Pricing</span>
                            {subLabel("When on, users with the Wholesale role see tier-based pricing on product pages.")}
                        </div>
                    </label>
                    <div style={{ paddingTop: 14, borderTop: "1px solid var(--ac-line)", display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ac-ink)" }}>Wholesale Exclusive Categories</p>
                            <span className="ac-badge ac-badge-ok" style={{ fontSize: 9 }}>Access Protection</span>
                        </div>
                        {subLabel("Toggle categories restricted to wholesale users only. Products ONLY in these are hidden from retail customers.")}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6 }}>
                            {allCategories.map(cat => (
                                <button key={cat.id} type="button"
                                    onClick={() => {
                                        const next = new Set(wholesaleCatIds);
                                        if (next.has(cat.id)) next.delete(cat.id);
                                        else next.add(cat.id);
                                        setWholesaleCatIds(next);
                                    }}
                                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `1px solid ${wholesaleCatIds.has(cat.id) ? "var(--ac-accent)" : "var(--ac-line)"}`, background: wholesaleCatIds.has(cat.id) ? "var(--ac-accent)" : "transparent", color: wholesaleCatIds.has(cat.id) ? "#fff" : "var(--ac-ink-3)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", cursor: "pointer", borderRadius: "var(--r-sm)" }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: wholesaleCatIds.has(cat.id) ? "rgba(255,255,255,0.8)" : "var(--ac-line)", flexShrink: 0 }} />
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    {form.wholesale_enabled && (
                        <div style={{ paddingTop: 14, borderTop: "1px solid var(--ac-line)", display: "flex", flexDirection: "column", gap: 12 }}>
                            {subLabel("Define the quantity range for each pricing tier. These ranges apply globally.")}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                                {([1, 2, 3] as const).map(tier => (
                                    <div key={tier} style={{ padding: "14px 16px", border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", background: "var(--ac-panel-2)", display: "flex", flexDirection: "column", gap: 10 }}>
                                        <p className="ac-label">Tier {tier}</p>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                            <div>
                                                <label className="ac-label" style={{ fontSize: 9 }}>Min Qty</label>
                                                <input type="number" min="1"
                                                    value={form[`wholesale_tier_${tier}_min` as keyof StoreSettings] as number}
                                                    onChange={e => setForm(p => ({ ...p, [`wholesale_tier_${tier}_min`]: parseInt(e.target.value) || 1 }))}
                                                    className="ac-input" style={{ marginTop: 4, textAlign: "center" }} />
                                            </div>
                                            <div>
                                                <label className="ac-label" style={{ fontSize: 9 }}>Max Qty</label>
                                                <input type="number" min="1"
                                                    value={form[`wholesale_tier_${tier}_max` as keyof StoreSettings] as number}
                                                    onChange={e => setForm(p => ({ ...p, [`wholesale_tier_${tier}_max`]: parseInt(e.target.value) || 1 }))}
                                                    className="ac-input" style={{ marginTop: 4, textAlign: "center" }} />
                                            </div>
                                        </div>
                                        {subLabel(`${form[`wholesale_tier_${tier}_min` as keyof StoreSettings]} – ${form[`wholesale_tier_${tier}_max` as keyof StoreSettings]} units`)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }}>
                    {saved && <span style={{ fontSize: 11, color: "var(--ac-accent)", textTransform: "uppercase", letterSpacing: ".06em" }}>Saved</span>}
                    <button type="submit" disabled={saving} className="ac-btn ac-btn-primary">
                        {saving ? "Saving..." : "Save Store Settings"}
                    </button>
                </div>
            </form>
            <CarouselConfigSection />
        </>
    );
}

interface CarouselTabConfig {
    label: string;
    mode: "newest" | "sort_order";
    category_name: string;
}

const DEFAULT_CAROUSEL_TABS: CarouselTabConfig[] = [
    { label: "New In", mode: "newest", category_name: "" },
    { label: "Bestsellers", mode: "sort_order", category_name: "" },
];

function CarouselConfigSection() {
    const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
    const [tabs, setTabs] = useState<CarouselTabConfig[]>(DEFAULT_CAROUSEL_TABS);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            supabase.from("categories").select("name, slug").eq("is_active", true).order("name"),
            supabase.from("site_copy").select("value").eq("copy_key", "carousel_config").maybeSingle(),
        ]).then(([{ data: cats }, { data: config }]) => {
            if (cats) setCategories(cats);
            if (config?.value) {
                try {
                    const parsed = JSON.parse(config.value);
                    if (Array.isArray(parsed.tabs) && parsed.tabs.length > 0) setTabs(parsed.tabs);
                } catch { /* keep defaults */ }
            }
            setLoading(false);
        });
    }, []);

    const updateTab = (i: number, field: keyof CarouselTabConfig, value: string) => {
        setTabs(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
    };

    const handleSave = async () => {
        setSaving(true);
        await supabase.from("site_copy").upsert(
            { copy_key: "carousel_config", value: JSON.stringify({ tabs }) },
            { onConflict: "copy_key" }
        );
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (loading) return null;

    return (
        <div className="ac-card" style={{ marginTop: 20, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)", paddingBottom: 10, borderBottom: "1px solid var(--ac-line)" }}>Homepage Carousel Tabs</p>
            <p style={{ fontSize: 10, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                Configure the tabs on the "A Moment For New" carousel. Filter by category or show all products.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {tabs.map((tab, i) => (
                    <div key={i} style={{ border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
                        <p className="ac-label">Tab {i + 1}</p>
                        <div>
                            <label className="ac-label">Label</label>
                            <input type="text" value={tab.label} onChange={e => updateTab(i, "label", e.target.value)}
                                className="ac-input" style={{ marginTop: 4 }} placeholder="e.g. New In" />
                        </div>
                        <div>
                            <label className="ac-label">Sort Order</label>
                            <select value={tab.mode} onChange={e => updateTab(i, "mode", e.target.value)} className="ac-select" style={{ marginTop: 4 }}>
                                <option value="newest">Newest First</option>
                                <option value="sort_order">Admin Sort Order (Bestsellers)</option>
                            </select>
                        </div>
                        <div>
                            <label className="ac-label">Category Filter</label>
                            <select value={tab.category_name} onChange={e => updateTab(i, "category_name", e.target.value)} className="ac-select" style={{ marginTop: 4 }}>
                                <option value="">All Products</option>
                                {categories.map(c => <option key={c.slug} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14 }}>
                {saved && <span style={{ fontSize: 11, color: "var(--ac-accent)", textTransform: "uppercase", letterSpacing: ".06em" }}>Saved</span>}
                <button type="button" onClick={handleSave} disabled={saving} className="ac-btn ac-btn-primary">
                    {saving ? "Saving..." : "Save Carousel Config"}
                </button>
            </div>
        </div>
    );
}

function SEOTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [metadataList, setMetadataList] = useState<SiteMetadata[]>([]);
    const [selectedPath, setSelectedPath] = useState<string>("/");
    const [formData, setFormData] = useState<SiteMetadata>({
        page_path: "/",
        title: "",
        description: "",
        og_image_url: "",
        keywords: ""
    });

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        const existing = metadataList.find(m => m.page_path === selectedPath);
        if (existing) {
            setFormData({
                ...existing,
                keywords: existing.keywords ?? "",
                og_image_url: existing.og_image_url ?? "",
                title: existing.title ?? "",
                description: existing.description ?? "",
            });
        } else {
            setFormData({
                page_path: selectedPath,
                title: "",
                description: "",
                og_image_url: "",
                keywords: ""
            });
        }
    }, [selectedPath, metadataList]);

    const fetchMetadata = async () => {
        setLoading(true);
        const { data } = await supabase.from("site_metadata").select("*");
        if (data) setMetadataList(data);
        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { page_path, title, description, og_image_url, keywords } = formData;
            await supabase.from("site_metadata").upsert(
                { page_path, title, description, og_image_url, keywords, updated_at: new Date().toISOString() },
                { onConflict: "page_path" }
            );
            await fetchMetadata();
            toast.success("SEO metadata saved.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save SEO metadata.");
        } finally {
            setSaving(false);
        }
    };

    const titleLength = formData.title.length;
    const descriptionLength = formData.description.length;
    const titleColor = titleLength > 60 ? "var(--ac-danger)" : "var(--ac-ink-4)";
    const descColor  = descriptionLength > 160 ? "var(--ac-danger)" : "var(--ac-ink-4)";

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
            {/* Editor Form */}
            <div className="ac-card" style={{ padding: "20px 24px" }}>
                <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                        <label className="ac-label" htmlFor="page_path">Target Route</label>
                        <select id="page_path" value={selectedPath} onChange={(e) => setSelectedPath(e.target.value)}
                            className="ac-select" style={{ marginTop: 6 }}>
                            <option value="/">Home (/)</option>
                            <option value="/shop">Shop (/shop)</option>
                            <option value="/craft">Craft (/craft)</option>
                            <option value="/custom">Custom (/custom)</option>
                        </select>
                    </div>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
                            <label className="ac-label" htmlFor="title">Meta Title</label>
                            <span style={{ fontSize: 10, color: titleColor, letterSpacing: ".06em" }}>{titleLength} / 60</span>
                        </div>
                        <input type="text" id="title" name="title" value={formData.title} onChange={handleChange}
                            className="ac-input" placeholder="Miss Tokyo | Handcrafted in Ghana" />
                    </div>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
                            <label className="ac-label" htmlFor="description">Meta Description</label>
                            <span style={{ fontSize: 10, color: descColor, letterSpacing: ".06em" }}>{descriptionLength} / 160</span>
                        </div>
                        <textarea id="description" name="description" rows={4} value={formData.description} onChange={handleChange}
                            className="ac-textarea" placeholder="Discover our latest collection..." />
                    </div>
                    <div>
                        <label className="ac-label" htmlFor="keywords">Keywords (Comma Separated)</label>
                        <input type="text" id="keywords" name="keywords" value={formData.keywords} onChange={handleChange}
                            className="ac-input" style={{ marginTop: 6 }} placeholder="leather, bespoke, artisanal, ghana" />
                    </div>
                    <div>
                        <ImageUploader
                            bucket="site-assets"
                            folder="og-images"
                            currentUrl={formData.og_image_url || null}
                            onUpload={(url) => setFormData(prev => ({ ...prev, og_image_url: url }))}
                            aspectRatio="og"
                            label="Social Share Image"
                        />
                    </div>
                    <button type="submit" disabled={loading || saving} className="ac-btn ac-btn-primary" style={{ width: "100%", marginTop: 8 }}>
                        {saving ? "Saving..." : "Save Route Metadata"}
                    </button>
                </form>
            </div>

            {/* Live Preview Console */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)", paddingBottom: 10, borderBottom: "1px solid var(--ac-line)" }}>Google Search Preview</p>
                <div style={{ background: "var(--ac-panel)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-md)", padding: "16px 18px", fontFamily: "Arial, sans-serif", maxWidth: 480 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--ac-panel-2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                            <span style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 10 }}>B</span>
                        </div>
                        <div>
                            <p style={{ fontWeight: 500, color: "var(--ac-ink)", fontSize: 12 }}>Miss Tokyo</p>
                            <p style={{ color: "var(--ac-ink-4)", fontSize: 10 }}>https://misstokyo.shop{selectedPath}</p>
                        </div>
                    </div>
                    <h3 style={{ color: "#1a0dab", fontSize: 18, fontWeight: 400, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formData.title || "Page Title Will Appear Here"}
                    </h3>
                    <p style={{ fontSize: 13, color: "#4d5156", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {formData.description || "The meta description will appear here. Keep it under 160 characters to prevent truncation."}
                    </p>
                </div>

                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-3)", paddingBottom: 10, borderBottom: "1px solid var(--ac-line)", marginTop: 8 }}>Social Card Preview</p>
                <div style={{ border: "1px solid var(--ac-line)", borderRadius: "var(--r-md)", overflow: "hidden", maxWidth: 480 }}>
                    <div style={{ width: "100%", height: 192, background: "var(--ac-panel-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ac-ink-4)", fontSize: 12 }}>
                        {formData.og_image_url ? (
                            <img src={formData.og_image_url} alt="Social Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            "No Image Provided"
                        )}
                    </div>
                    <div style={{ padding: "12px 16px", background: "var(--ac-panel)", borderTop: "1px solid var(--ac-line)" }}>
                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", marginBottom: 4 }}>misstokyo.shop</p>
                        <h3 style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formData.title || "Page Title"}</h3>
                        <p style={{ fontSize: 11, color: "var(--ac-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formData.description || "Page description..."}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Communications Tab ───────────────────────────────────────────────────────

type CommTemplate = {
    id?: string;
    channel: "email" | "sms";
    event_type: string;
    subject?: string | null;
    greeting?: string | null;
    body_text: string;
};

const COMM_EVENTS = [
    { key: "order_confirmed", label: "Order Confirmed" },
    { key: "order_shipped", label: "Order Shipped" },
    { key: "order_cancelled", label: "Order Cancelled" },
    { key: "order_fulfilled", label: "Order Fulfilled" },
];

function CommunicationsTab() {
    const [channel, setChannel] = useState<"email" | "sms">("email");
    const [templates, setTemplates] = useState<CommTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);

    useEffect(() => {
        supabase
            .from("communication_templates")
            .select("*")
            .then(({ data }: { data: any }) => {
                setTemplates(data ?? []);
                setLoading(false);
            });
    }, []);

    const getTemplate = (event_type: string): CommTemplate => {
        return templates.find(t => t.channel === channel && t.event_type === event_type) ?? {
            channel,
            event_type,
            subject: "",
            greeting: "",
            body_text: "",
        };
    };

    const handleUpdate = (event_type: string, field: keyof CommTemplate, value: string) => {
        setTemplates(prev => {
            const exists = prev.find(t => t.channel === channel && t.event_type === event_type);
            if (exists) {
                return prev.map(t =>
                    t.channel === channel && t.event_type === event_type
                        ? { ...t, [field]: value }
                        : t
                );
            }
            return [...prev, { channel, event_type, subject: null, greeting: "", body_text: "", [field]: value }];
        });
    };

    const handleSave = async (event_type: string) => {
        const tpl = getTemplate(event_type);
        const key = `${channel}-${event_type}`;
        setSaving(key);
        const { error } = await supabase
            .from("communication_templates")
            .upsert({ ...tpl, updated_at: new Date().toISOString() }, { onConflict: "channel,event_type" });
        setSaving(null);
        if (error) {
            toast.error("Failed to save template.");
        } else {
            setSaved(key);
            setTimeout(() => setSaved(null), 3000);
        }
    };

    if (loading) return <p className="text-neutral-400 italic font-serif">Loading...</p>;

    return (
        <div className="space-y-8 max-w-3xl">
            <div className="bg-white border border-neutral-200 p-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4 mb-6">Communication Templates</h2>
                <p className="text-[10px] text-neutral-400 tracking-wider uppercase mb-6">
                    Customise the messages sent to customers for each event. Dynamic values (order ID, rider info) are injected automatically.
                </p>

                <div className="flex gap-0 border-b border-neutral-200 mb-8">
                    {(["email", "sms"] as const).map(ch => (
                        <button
                            key={ch}
                            onClick={() => setChannel(ch)}
                            className={`px-6 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors ${channel === ch ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"
                                }`}
                        >
                            {ch === "email" ? "Email" : "SMS"}
                        </button>
                    ))}
                </div>

                <div className="space-y-8">
                    {COMM_EVENTS.map(({ key, label }) => {
                        const tpl = getTemplate(key);
                        const saveKey = `${channel}-${key}`;
                        return (
                            <div key={key} className="border border-neutral-100 p-6 space-y-4">
                                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-neutral-600">{label}</h3>

                                {channel === "email" && (
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2 text-neutral-500">Subject Line</label>
                                        <input
                                            type="text"
                                            value={tpl.subject ?? ""}
                                            onChange={e => handleUpdate(key, "subject", e.target.value)}
                                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                                            placeholder="Email subject..."
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2 text-neutral-500">Greeting</label>
                                    <input
                                        type="text"
                                        value={tpl.greeting ?? ""}
                                        onChange={e => handleUpdate(key, "greeting", e.target.value)}
                                        className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                                        placeholder={channel === "email" ? "Hello," : "Miss Tokyo:"}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest font-semibold mb-2 text-neutral-500">
                                        {channel === "email" ? "Body Text" : "Message"}
                                    </label>
                                    <textarea
                                        rows={channel === "email" ? 4 : 2}
                                        value={tpl.body_text}
                                        onChange={e => handleUpdate(key, "body_text", e.target.value)}
                                        className="w-full border border-neutral-200 bg-transparent p-3 outline-none focus:border-black text-sm transition-colors resize-none"
                                        placeholder="Message body..."
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleSave(key)}
                                        disabled={saving === saveKey}
                                        className="px-6 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                    >
                                        {saving === saveKey ? "Saving..." : "Save"}
                                    </button>
                                    {saved === saveKey && (
                                        <span className="text-[10px] text-green-600 uppercase tracking-wider">Saved</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
