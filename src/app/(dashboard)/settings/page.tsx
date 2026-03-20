"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { toast } from "@/lib/toast";
import { EmailsTab } from "./EmailsTab";
import { NotificationsTab } from "./NotificationsTab";
import { RidersTab } from "./RidersTab";
import { SizeGuideTab } from "./SizeGuideTab";
import { TeamTab } from "./TeamTab";
import { BusinessSettingsTab } from "./BusinessSettingsTab";
import { ShippingTab } from "./ShippingTab";
import { ProductPageTab } from "./ProductPageTab";

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

type TabKey = "business" | "store" | "shipping" | "seo" | "emails" | "notifications" | "riders" | "size-guide" | "team" | "product-page";

const SETTINGS_TAB_GROUPS: { group: string; tabs: { key: TabKey; label: string }[] }[] = [
    {
        group: "Store",
        tabs: [
            { key: "business",  label: "Business" },
            { key: "store",     label: "Store" },
            { key: "shipping",  label: "Shipping" },
            { key: "seo",          label: "SEO" },
            { key: "product-page", label: "Product Page" },
        ],
    },
    {
        group: "Commerce",
        tabs: [
            { key: "emails",        label: "Emails" },
            { key: "notifications", label: "Notifications" },
        ],
    },
    {
        group: "Team & Access",
        tabs: [
            { key: "riders",     label: "Riders" },
            { key: "size-guide", label: "Size Guide" },
            { key: "team",       label: "Team" },
        ],
    },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("business");

    return (
        <div className="max-w-6xl">
            <header className="mb-8">
                <h1 className="text-[20px] font-medium text-neutral-900 tracking-tight">Settings</h1>
                <p className="text-sm text-neutral-500 mt-1">Business details, store configuration, and operations.</p>
            </header>

            <div className="flex gap-8 items-start">
                {/* Vertical tab nav */}
                <aside className="w-44 shrink-0 sticky top-6">
                    <nav className="space-y-5">
                        {SETTINGS_TAB_GROUPS.map((group) => (
                            <div key={group.group}>
                                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-1 px-2">
                                    {group.group}
                                </p>
                                <ul className="space-y-0.5">
                                    {group.tabs.map((tab) => (
                                        <li key={tab.key}>
                                            <button
                                                onClick={() => setActiveTab(tab.key)}
                                                className={`w-full text-left px-2 py-[7px] text-sm transition-colors rounded ${
                                                    activeTab === tab.key
                                                        ? "bg-neutral-100 text-black font-semibold"
                                                        : "text-neutral-500 hover:bg-neutral-50 hover:text-black"
                                                }`}
                                                style={activeTab === tab.key ? { borderLeft: "2px solid black", borderRadius: "0 6px 6px 0", paddingLeft: "6px" } : {}}
                                            >
                                                {tab.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Tab content */}
                <div className="flex-1 min-w-0">
                    {activeTab === "business"       && <><BusinessTab /><div className="mt-8"><BusinessSettingsTab /></div></>}
                    {activeTab === "store"          && <StoreTab />}
                    {activeTab === "shipping"       && <ShippingTab />}
                    {activeTab === "seo"            && <SEOTab />}
                    {activeTab === "emails"         && <EmailsTab />}
                    {activeTab === "notifications"  && <NotificationsTab />}
                    {activeTab === "riders"         && <RidersTab />}
                    {activeTab === "size-guide"     && <SizeGuideTab />}
                    {activeTab === "team"           && <TeamTab />}
                    {activeTab === "product-page"  && <ProductPageTab />}
                </div>
            </div>
        </div>
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
        return <p className="text-neutral-400 italic font-serif">Loading...</p>;
    }

    return (
        <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left: Brand / Logo */}
                <div className="bg-white border border-neutral-200 p-8 space-y-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Brand</h2>
                    <ImageUploader
                        bucket="site-assets"
                        folder="logos"
                        currentUrl={form.logo_url}
                        onUpload={(url) => setForm(p => ({ ...p, logo_url: url }))}
                        aspectRatio="square"
                        label="Business Logo"
                    />
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Tax Rate (%)</label>
                        <input
                            type="number" name="tax_rate" min="0" max="100" step="0.1"
                            value={form.tax_rate}
                            onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="0"
                        />
                        <p className="text-[10px] text-neutral-400 mt-1 tracking-wider uppercase">Applied to taxable order totals.</p>
                    </div>
                </div>

                {/* Right: Business Details */}
                <div className="bg-white border border-neutral-200 p-8 space-y-6">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Business Details</h2>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Business Name</label>
                        <input
                            type="text" name="business_name" required
                            value={form.business_name}
                            onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="Miss Tokyo"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Business Email</label>
                        <input
                            type="email" name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="hello@misstokyo.shop"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Contact / Phone</label>
                        <input
                            type="text" name="contact"
                            value={form.contact}
                            onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="+233 ..."
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Business Address</label>
                        <textarea
                            name="address" rows={2}
                            value={form.address}
                            onChange={handleChange}
                            className="w-full border border-neutral-200 p-3 bg-transparent outline-none focus:border-black transition-colors resize-none text-sm"
                            placeholder="123 Main Street, Accra, Ghana"
                        />
                    </div>

                    <div className="flex justify-end items-center gap-6 pt-2">
                        {saved && <span className="text-xs text-green-600 tracking-wider uppercase">Saved</span>}
                        <button
                            type="submit" disabled={saving}
                            className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
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
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await supabase.from("store_settings").upsert(
            { id: "default", ...form },
            { onConflict: "id" }
        );
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    if (loading) {
        return <p className="text-neutral-400 italic font-serif">Loading...</p>;
    }

    return (
        <>
        <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left column */}
            <div className="space-y-8">
            {/* Store Configuration */}
            <div className="bg-white border border-neutral-200 p-8 space-y-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Store Configuration</h2>

                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.enable_store_pickup}
                            onChange={(e) => setForm(p => ({ ...p, enable_store_pickup: e.target.checked }))}
                            className="w-4 h-4 accent-black"
                        />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Enable Store Pickup</span>
                    </label>
                    <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7">Allow customers to pick up orders directly from the atelier.</p>
                </div>

                <div className="pt-4 border-t border-neutral-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.maintenance_mode}
                            onChange={(e) => setForm(p => ({ ...p, maintenance_mode: e.target.checked }))}
                            className="w-4 h-4 accent-black"
                        />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Enable Coming Soon / Maintenance Mode</span>
                    </label>
                    <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7">Restrict access to the shop and show a coming soon placeholder.</p>
                </div>

                <div className="pt-4 border-t border-neutral-100 mt-6 grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Global Shoe Sizes</label>
                        <input
                            type="text"
                            value={form.global_sizes.join(", ")}
                            onChange={(e) => setForm(p => ({ ...p, global_sizes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="39, 40, 41, 42, 43, 44, 45, 46"
                        />
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Comma-separated list of globally available sizes.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Global Colors</label>
                        <input
                            type="text"
                            value={form.global_colors.join(", ")}
                            onChange={(e) => setForm(p => ({ ...p, global_colors: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="Noir, Cognac, Sand"
                        />
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Comma-separated list of colors available globally.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Global Stitching Options</label>
                        <input
                            type="text"
                            value={form.global_stitching.join(", ")}
                            onChange={(e) => setForm(p => ({ ...p, global_stitching: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="Tonal, Contrast White"
                        />
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Comma-separated list of stitching styles.</p>
                    </div>
                </div>
            </div>
            </div>{/* end left column */}

            {/* Right column */}
            <div className="space-y-8">
            {/* Visual Merchandising */}
            <div className="bg-white border border-neutral-200 p-8 space-y-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Visual Merchandising</h2>
                <p className="text-[10px] text-neutral-400 tracking-wider uppercase">
                    Control the product columns on desktop and how many items appear in the homepage featured grid. Mobile stays 2-column, tablet stays 2-column.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4">Homepage Grid Columns</label>
                        <div className="flex gap-3">
                            {([2, 3, 4, 5] as const).map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, home_grid_cols: n }))}
                                    className={`flex-1 py-3 text-sm font-semibold border transition-colors ${form.home_grid_cols === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Columns on the homepage collection grid.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4">Shop Page Grid Columns</label>
                        <div className="flex gap-3">
                            {([2, 3, 4, 5] as const).map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, shop_grid_cols: n }))}
                                    className={`flex-1 py-3 text-sm font-semibold border transition-colors ${form.shop_grid_cols === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Columns on the full shop listing grid.</p>
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4">Shop Page Mobile Columns</label>
                        <div className="flex gap-3 max-w-[160px]">
                            {([1, 2] as const).map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, shop_mobile_cols: n }))}
                                    className={`flex-1 py-3 text-sm font-semibold border transition-colors ${form.shop_mobile_cols === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Grid columns on mobile devices.</p>
                    </div>
                </div>

                <div className="pt-6 border-t border-neutral-100">
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4">Featured Products on Homepage</label>
                    <div className="flex gap-3 max-w-xs">
                        {([4, 6, 8, 12] as const).map(n => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setForm(p => ({ ...p, home_product_limit: n }))}
                                className={`flex-1 py-3 text-sm font-semibold border transition-colors ${form.home_product_limit === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Number of products shown in the homepage collection grid.</p>
                </div>

                <div className="pt-6 border-t border-neutral-100">
                    <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-4">Shop Page — Products Per Page</label>
                    <div className="flex gap-3 max-w-sm">
                        {([8, 12, 16, 24, 32] as const).map(n => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setForm(p => ({ ...p, shop_product_limit: n }))}
                                className={`flex-1 py-3 text-sm font-semibold border transition-colors ${form.shop_product_limit === n ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200 hover:border-black hover:text-black"}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Total products loaded per page on the shop listing.</p>
                </div>

                <div className="pt-6 border-t border-neutral-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.shop_show_title}
                            onChange={(e) => setForm(p => ({ ...p, shop_show_title: e.target.checked }))}
                            className="w-4 h-4 accent-black"
                        />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Show Shop Page Title &amp; Subtitle</span>
                    </label>
                    <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7">Display the hero text header above the product grid on the shop page.</p>
                </div>

                <div className="pt-6 border-t border-neutral-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.shop_image_stretch}
                            onChange={(e) => setForm(p => ({ ...p, shop_image_stretch: e.target.checked }))}
                            className="w-4 h-4 accent-black"
                        />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Stretch Product Images to Fill Frame</span>
                    </label>
                    <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7">When on, images fill the card exactly (may distort). When off, images are cropped to fit.</p>
                </div>
            </div>

            </div>{/* end right column */}
            </div>{/* end grid */}

            {/* Platform Fees */}
            <div className="bg-white border border-neutral-200 p-8 space-y-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Platform Fees</h2>
                <p className="text-[10px] text-neutral-400 tracking-wider uppercase">
                    A percentage-based fee applied to all orders, invoices, and payment links to offset processing charges.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Fee Percentage (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={form.platform_fee_percentage}
                            onChange={(e) => setForm(p => ({ ...p, platform_fee_percentage: parseFloat(e.target.value) || 0 }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="2.5"
                        />
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">e.g. 2.5 adds 2.5% to every order total.</p>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Fee Label</label>
                        <input
                            type="text"
                            value={form.platform_fee_label}
                            onChange={(e) => setForm(p => ({ ...p, platform_fee_label: e.target.value }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                            placeholder="Service Charge"
                        />
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Label shown to customers on receipts.</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-neutral-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.show_fee_at_checkout}
                            onChange={(e) => setForm(p => ({ ...p, show_fee_at_checkout: e.target.checked }))}
                            className="w-4 h-4 accent-black"
                        />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Show Fee as Itemised Line at Checkout</span>
                    </label>
                    <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase ml-7">
                        When off, the fee is silently rolled into "Shipping &amp; Handling" so the total still adds up without a visible surcharge line.
                    </p>
                </div>
            </div>

            {/* Feature Toggles */}
            <div className="bg-white border border-neutral-200 p-8 space-y-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Feature Toggles</h2>
                <p className="text-[10px] text-neutral-400 tracking-wider uppercase">Enable or disable storefront sections. Hidden sections are removed from the navigation.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                {([
                    { key: "enable_gift_cards" as const, label: "Gift Cards", desc: "Show the gift card purchase page in the navbar." },
                    { key: "enable_gallery" as const,    label: "Gallery",    desc: "Show the gallery page and nav link." },
                    { key: "enable_craft" as const,      label: "The Craft",  desc: "Show the craft / process page in the navbar." },
                    { key: "enable_whitelabel" as const,       label: "White Labelling",  desc: "Show the white labelling / custom order page." },
                    { key: "enable_custom_requests" as const, label: "Custom Requests",   desc: "Enable the custom order request form and admin submissions inbox." },
                ] as const).map(({ key, label, desc }) => (
                    <div key={key} className="py-4 border-b border-neutral-100 last:border-b-0">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={form[key]}
                                onChange={(e) => setForm(p => ({ ...p, [key]: e.target.checked }))}
                                className="w-4 h-4 accent-black" />
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">{label}</span>
                        </label>
                        <p className="text-[10px] text-neutral-400 mt-1 tracking-wider uppercase ml-7">{desc}</p>
                    </div>
                ))}
                </div>
            </div>

            {/* Wholesale Configuration */}
            <div className="bg-white border border-neutral-200 p-8 space-y-6">
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Wholesale / B2B Configuration</h2>
                    <p className="text-[10px] text-neutral-400 tracking-wider uppercase mt-4">
                        Enable B2B wholesale pricing with quantity-based tiers. Wholesale users see custom pricing instead of retail prices on the storefront.
                    </p>
                </div>

                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.wholesale_enabled}
                            onChange={(e) => setForm(p => ({ ...p, wholesale_enabled: e.target.checked }))}
                            className="w-4 h-4 accent-black"
                        />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Enable Wholesale Pricing</span>
                    </label>
                    <p className="text-[10px] text-neutral-400 mt-1 tracking-wider uppercase ml-7">
                        When on, users with the Wholesale role see tier-based pricing on all product pages.
                    </p>
                </div>

                {form.wholesale_enabled && (
                    <div className="pt-6 border-t border-neutral-100 space-y-6">
                        <p className="text-[10px] text-neutral-400 tracking-wider uppercase">
                            Define the quantity range for each pricing tier. These ranges apply globally across all products.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {([1, 2, 3] as const).map(tier => (
                                <div key={tier} className="space-y-4 p-5 border border-neutral-100 bg-neutral-50">
                                    <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">Tier {tier}</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Min Qty</label>
                                            <input
                                                type="number" min="1"
                                                value={form[`wholesale_tier_${tier}_min` as keyof StoreSettings] as number}
                                                onChange={e => setForm(p => ({ ...p, [`wholesale_tier_${tier}_min`]: parseInt(e.target.value) || 1 }))}
                                                className="w-full border-b border-neutral-300 bg-transparent py-1.5 outline-none focus:border-black text-sm text-center transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] uppercase tracking-widest text-neutral-400 mb-1">Max Qty</label>
                                            <input
                                                type="number" min="1"
                                                value={form[`wholesale_tier_${tier}_max` as keyof StoreSettings] as number}
                                                onChange={e => setForm(p => ({ ...p, [`wholesale_tier_${tier}_max`]: parseInt(e.target.value) || 1 }))}
                                                className="w-full border-b border-neutral-300 bg-transparent py-1.5 outline-none focus:border-black text-sm text-center transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-neutral-400 tracking-widest uppercase">
                                        {form[`wholesale_tier_${tier}_min` as keyof StoreSettings]} – {form[`wholesale_tier_${tier}_max` as keyof StoreSettings]} units
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end items-center gap-6">
                {saved && <span className="text-xs text-green-600 tracking-wider uppercase">Saved successfully</span>}
                <button
                    type="submit" disabled={saving}
                    className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
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
    { label: "New In",      mode: "newest",     category_name: "" },
    { label: "Bestsellers", mode: "sort_order",  category_name: "" },
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
            supabase.from("site_copy").select("value").eq("copy_key", "carousel_config").single(),
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
        <div className="bg-white border border-neutral-200 p-8 space-y-6">
            <div className="border-b border-neutral-100 pb-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest">Homepage Carousel Tabs</h2>
                <p className="text-[10px] text-neutral-400 mt-1 tracking-wider uppercase">
                    Configure the tabs on the "A Moment For New" carousel. Filter by category or show all products.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {tabs.map((tab, i) => (
                    <div key={i} className="space-y-4 border border-neutral-100 p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Tab {i + 1}</p>

                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1">Label</label>
                            <input
                                type="text"
                                value={tab.label}
                                onChange={e => updateTab(i, "label", e.target.value)}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                                placeholder="e.g. New In"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1">Sort Order</label>
                            <select
                                value={tab.mode}
                                onChange={e => updateTab(i, "mode", e.target.value)}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                            >
                                <option value="newest">Newest First</option>
                                <option value="sort_order">Admin Sort Order (Bestsellers)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1">Category Filter</label>
                            <select
                                value={tab.category_name}
                                onChange={e => updateTab(i, "category_name", e.target.value)}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                            >
                                <option value="">All Products</option>
                                {categories.map(c => (
                                    <option key={c.slug} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end items-center gap-6 pt-2">
                {saved && <span className="text-xs text-green-600 tracking-wider uppercase">Saved</span>}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
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
                keywords:     existing.keywords     ?? "",
                og_image_url: existing.og_image_url ?? "",
                title:        existing.title        ?? "",
                description:  existing.description  ?? "",
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
    const titleColor = titleLength > 60 ? "text-red-500" : "text-neutral-500";
    const descColor = descriptionLength > 160 ? "text-red-500" : "text-neutral-500";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Editor Form */}
            <div className="bg-white p-8 border border-neutral-200">
                <form onSubmit={handleSave} className="space-y-8">
                    <div>
                        <label htmlFor="page_path" className="block text-xs uppercase tracking-widest font-semibold mb-3">Target Route</label>
                        <select
                            id="page_path"
                            value={selectedPath}
                            onChange={(e) => setSelectedPath(e.target.value)}
                            className="w-full border-b border-black bg-transparent py-2 outline-none focus:border-neutral-400 transition-colors uppercase text-sm font-medium tracking-wide appearance-none"
                        >
                            <option value="/">Home (/)</option>
                            <option value="/shop">Shop (/shop)</option>
                            <option value="/craft">Craft (/craft)</option>
                            <option value="/custom">Custom (/custom)</option>
                        </select>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label htmlFor="title" className="block text-xs uppercase tracking-widest font-semibold">Meta Title</label>
                            <span className={`text-[10px] tracking-widest ${titleColor}`}>{titleLength} / 60</span>
                        </div>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                            placeholder="Miss Tokyo | Handcrafted in Ghana"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label htmlFor="description" className="block text-xs uppercase tracking-widest font-semibold">Meta Description</label>
                            <span className={`text-[10px] tracking-widest ${descColor}`}>{descriptionLength} / 160</span>
                        </div>
                        <textarea
                            id="description"
                            name="description"
                            rows={4}
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full border border-neutral-200 p-4 bg-transparent outline-none focus:border-black transition-colors resize-y"
                            placeholder="Discover our latest collection..."
                        ></textarea>
                    </div>

                    <div>
                        <label htmlFor="keywords" className="block text-xs uppercase tracking-widest font-semibold mb-3">Keywords (Comma Separated)</label>
                        <input
                            type="text"
                            id="keywords"
                            name="keywords"
                            value={formData.keywords}
                            onChange={handleChange}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                            placeholder="leather, bespoke, artisanal, ghana"
                        />
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

                    <button
                        type="submit"
                        disabled={loading || saving}
                        className="w-full py-5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors mt-8 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Route Metadata"}
                    </button>
                </form>
            </div>

            {/* Live Preview Console */}
            <div className="space-y-8">
                <div className="sticky top-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4 mb-6">Google Search Preview</h2>
                    <div className="bg-white p-6 border border-neutral-200 shadow-sm font-sans max-w-md">
                        <div className="text-[12px] text-neutral-800 flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-neutral-200 overflow-hidden flex items-center justify-center">
                                <span className="font-serif italic text-[10px]">B</span>
                            </div>
                            <div>
                                <p className="font-medium">Miss Tokyo</p>
                                <p className="text-neutral-500 text-[10px]">https://misstokyo.shop{selectedPath}</p>
                            </div>
                        </div>
                        <h3 className="text-[#1a0dab] text-lg font-medium cursor-pointer hover:underline mb-1 w-full truncate">
                            {formData.title || "Page Title Will Appear Here"}
                        </h3>
                        <p className="text-[13px] text-[#4d5156] leading-snug line-clamp-2">
                            {formData.description || "The meta description will appear here. Keep it under 160 characters to prevent it from being truncated in search results."}
                        </p>
                    </div>

                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4 mb-6 mt-12">Social Card Preview</h2>
                    <div className="bg-white border text-center border-neutral-200 shadow-sm font-sans max-w-md overflow-hidden rounded-md">
                        <div className="w-full h-48 bg-neutral-100 flex items-center justify-center text-neutral-400 capitalize">
                            {formData.og_image_url ? (
                                <img src={formData.og_image_url} alt="Social Cover" className="w-full h-full object-cover" />
                            ) : (
                                "No Image Provided"
                            )}
                        </div>
                        <div className="p-4 bg-neutral-50 border-t border-neutral-200 text-left">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">misstokyo.shop</p>
                            <h3 className="font-medium text-neutral-900 mb-1 truncate">{formData.title || "Page Title"}</h3>
                            <p className="text-xs text-neutral-500 truncate">{formData.description || "Page description..."}</p>
                        </div>
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
    { key: "order_shipped",   label: "Order Shipped" },
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
                            className={`px-6 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors ${
                                channel === ch ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"
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
