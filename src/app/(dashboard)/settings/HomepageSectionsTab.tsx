"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

// ---- Types ----------------------------------------------------------------

type Category = { id: string; name: string; slug: string };

type FeaturedSlot = {
    id: string | null;
    position: number;
    category_id: string | null;
    custom_label: string;
    item_count_override: number | null;
    enabled: boolean;
};

type SiteSettingsSnippet = {
    homepage_new_arrivals_category_id: string | null;
    homepage_new_arrivals_title: string;
    homepage_new_arrivals_limit: number;
    optin_section_enabled: boolean;
    optin_title: string;
    optin_subtitle: string;
    welcome_coupon_enabled: boolean;
    welcome_coupon_code: string;
    welcome_coupon_percentage: number;
};

type Subscriber = {
    id: string;
    email: string;
    subscribed_at: string;
    coupon_code: string | null;
    source: string | null;
};

// ---- Constants ------------------------------------------------------------

const INPUT_CLASS =
    "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors";
const LABEL_CLASS =
    "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2";

const EMPTY_SLOTS: FeaturedSlot[] = [0, 1, 2, 3].map((pos) => ({
    id: null,
    position: pos,
    category_id: null,
    custom_label: "",
    item_count_override: null,
    enabled: true,
}));

const DEFAULT_SITE: SiteSettingsSnippet = {
    homepage_new_arrivals_category_id: null,
    homepage_new_arrivals_title: "New Arrivals",
    homepage_new_arrivals_limit: 8,
    optin_section_enabled: true,
    optin_title: "Join the Atelier",
    optin_subtitle: "",
    welcome_coupon_enabled: false,
    welcome_coupon_code: "",
    welcome_coupon_percentage: 10,
};

const PAGE_SIZE = 20;

// ---- Toggle ---------------------------------------------------------------

function Toggle({
    on,
    onToggle,
}: {
    on: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                on ? "bg-black" : "bg-neutral-200"
            }`}
            aria-pressed={on}
        >
            <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    on ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
            />
        </button>
    );
}

// ---- Main component -------------------------------------------------------

export function HomepageSectionsTab() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [slots, setSlots] = useState<FeaturedSlot[]>(EMPTY_SLOTS);
    const [siteSettings, setSiteSettings] = useState<SiteSettingsSnippet>(DEFAULT_SITE);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [subscriberCount, setSubscriberCount] = useState(0);
    const [subscriberPage, setSubscriberPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [savingFeatured, setSavingFeatured] = useState(false);
    const [savingNewArrivals, setSavingNewArrivals] = useState(false);
    const [savingOptin, setSavingOptin] = useState(false);

    useEffect(() => {
        Promise.all([
            supabase
                .from("categories")
                .select("id, name, slug")
                .eq("is_active", true)
                .order("name"),
            supabase
                .from("featured_categories")
                .select("*")
                .order("position"),
            supabase
                .from("site_settings")
                .select(
                    "homepage_new_arrivals_category_id, homepage_new_arrivals_title, homepage_new_arrivals_limit, optin_section_enabled, optin_title, optin_subtitle, welcome_coupon_enabled, welcome_coupon_code, welcome_coupon_percentage"
                )
                .eq("id", "singleton")
                .single(),
        ]).then(([catRes, featRes, siteRes]) => {
            setCategories(catRes.data ?? []);

            if (featRes.data && featRes.data.length > 0) {
                const loaded: FeaturedSlot[] = EMPTY_SLOTS.map((empty) => {
                    const found = featRes.data!.find(
                        (f: { position: number }) => f.position === empty.position
                    );
                    if (found) {
                        return {
                            id: found.id,
                            position: found.position,
                            category_id: found.category_id ?? null,
                            custom_label: found.custom_label ?? "",
                            item_count_override: found.item_count_override ?? null,
                            enabled: found.enabled ?? true,
                        };
                    }
                    return empty;
                });
                setSlots(loaded);
            }

            if (siteRes.data) {
                setSiteSettings({
                    homepage_new_arrivals_category_id:
                        siteRes.data.homepage_new_arrivals_category_id ?? null,
                    homepage_new_arrivals_title:
                        siteRes.data.homepage_new_arrivals_title ?? "New Arrivals",
                    homepage_new_arrivals_limit:
                        siteRes.data.homepage_new_arrivals_limit ?? 8,
                    optin_section_enabled:
                        siteRes.data.optin_section_enabled ?? true,
                    optin_title: siteRes.data.optin_title ?? "Join the Atelier",
                    optin_subtitle: siteRes.data.optin_subtitle ?? "",
                    welcome_coupon_enabled:
                        siteRes.data.welcome_coupon_enabled ?? false,
                    welcome_coupon_code: siteRes.data.welcome_coupon_code ?? "",
                    welcome_coupon_percentage:
                        siteRes.data.welcome_coupon_percentage ?? 10,
                });
            }

            setLoading(false);
        });
    }, []);

    // Load subscribers separately
    useEffect(() => {
        loadSubscribers(0);
    }, []);

    const loadSubscribers = async (page: number) => {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, count } = await supabase
            .from("newsletter_subscribers")
            .select("id, email, subscribed_at, coupon_code, source", {
                count: "exact",
            })
            .order("subscribed_at", { ascending: false })
            .range(from, to);

        setSubscribers(data ?? []);
        setSubscriberCount(count ?? 0);
        setSubscriberPage(page);
    };

    // ---- Slot helpers ----
    const updateSlot = (
        pos: number,
        field: keyof FeaturedSlot,
        value: string | number | boolean | null
    ) => {
        setSlots((prev) =>
            prev.map((s) => (s.position === pos ? { ...s, [field]: value } : s))
        );
    };

    // ---- Save featured categories ----
    const handleSaveFeatured = async () => {
        setSavingFeatured(true);
        const upsertRows = slots.map((slot) => ({
            ...(slot.id ? { id: slot.id } : { id: crypto.randomUUID() }),
            position: slot.position,
            category_id: slot.category_id || null,
            custom_label: slot.custom_label || null,
            item_count_override: slot.item_count_override || null,
            enabled: slot.enabled,
        }));

        const { error } = await supabase
            .from("featured_categories")
            .upsert(upsertRows, { onConflict: "id" });

        setSavingFeatured(false);
        if (error) {
            toast.error("Failed to save featured categories");
        } else {
            toast.success("Featured categories saved");
        }
    };

    // ---- Save new arrivals ----
    const handleSaveNewArrivals = async () => {
        setSavingNewArrivals(true);
        const { error } = await supabase
            .from("site_settings")
            .upsert(
                {
                    id: "singleton",
                    homepage_new_arrivals_category_id:
                        siteSettings.homepage_new_arrivals_category_id,
                    homepage_new_arrivals_title:
                        siteSettings.homepage_new_arrivals_title,
                    homepage_new_arrivals_limit:
                        siteSettings.homepage_new_arrivals_limit,
                },
                { onConflict: "id" }
            );
        setSavingNewArrivals(false);
        if (error) {
            toast.error("Failed to save new arrivals settings");
        } else {
            toast.success("New arrivals settings saved");
        }
    };

    // ---- Save opt-in + coupon ----
    const handleSaveOptin = async () => {
        setSavingOptin(true);
        const { error } = await supabase
            .from("site_settings")
            .upsert(
                {
                    id: "singleton",
                    optin_section_enabled: siteSettings.optin_section_enabled,
                    optin_title: siteSettings.optin_title,
                    optin_subtitle: siteSettings.optin_subtitle,
                    welcome_coupon_enabled: siteSettings.welcome_coupon_enabled,
                    welcome_coupon_code: siteSettings.welcome_coupon_code,
                    welcome_coupon_percentage: siteSettings.welcome_coupon_percentage,
                },
                { onConflict: "id" }
            );
        setSavingOptin(false);
        if (error) {
            toast.error("Failed to save opt-in settings");
        } else {
            toast.success("Opt-in settings saved");
        }
    };

    // ---- CSV export ----
    const handleExportCSV = async () => {
        const { data } = await supabase
            .from("newsletter_subscribers")
            .select("email, subscribed_at, coupon_code, source")
            .order("subscribed_at", { ascending: false });

        if (!data || data.length === 0) {
            toast.error("No subscribers to export");
            return;
        }

        const header = "Email,Subscribed At,Coupon Code,Source";
        const rows = data.map(
            (s) =>
                `"${s.email}","${new Date(s.subscribed_at).toLocaleDateString("en-GB")}","${s.coupon_code ?? ""}","${s.source ?? ""}"`
        );
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "subscribers.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <p className="text-neutral-400 italic font-serif">Loading...</p>
        );
    }

    return (
        <div className="max-w-3xl space-y-10">
            {/* ---- Featured Categories ---- */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest">
                        Featured Categories
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1">
                        Choose up to 4 categories to feature in the homepage grid.
                    </p>
                </div>

                <div className="bg-white border border-neutral-200 p-6 space-y-5">
                    {slots.map((slot) => (
                        <div
                            key={slot.position}
                            className="border-b border-neutral-100 pb-5 last:border-0 last:pb-0"
                        >
                            <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-3">
                                Position {slot.position + 1}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                {/* Category select */}
                                <div>
                                    <label className={LABEL_CLASS}>Category</label>
                                    <select
                                        value={slot.category_id ?? ""}
                                        onChange={(e) =>
                                            updateSlot(
                                                slot.position,
                                                "category_id",
                                                e.target.value || null
                                            )
                                        }
                                        className={INPUT_CLASS}
                                    >
                                        <option value="">— none —</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Custom label */}
                                <div>
                                    <label className={LABEL_CLASS}>
                                        Custom Label (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={slot.custom_label}
                                        onChange={(e) =>
                                            updateSlot(
                                                slot.position,
                                                "custom_label",
                                                e.target.value
                                            )
                                        }
                                        className={INPUT_CLASS}
                                        placeholder="Heels"
                                    />
                                </div>

                                {/* Count override + enabled */}
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className={LABEL_CLASS}>
                                            Item Count Override
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={slot.item_count_override ?? ""}
                                            onChange={(e) =>
                                                updateSlot(
                                                    slot.position,
                                                    "item_count_override",
                                                    e.target.value
                                                        ? parseInt(e.target.value)
                                                        : null
                                                )
                                            }
                                            className={INPUT_CLASS}
                                            placeholder="Auto"
                                        />
                                    </div>
                                    <div className="pb-2">
                                        <Toggle
                                            on={slot.enabled}
                                            onToggle={() =>
                                                updateSlot(
                                                    slot.position,
                                                    "enabled",
                                                    !slot.enabled
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleSaveFeatured}
                        disabled={savingFeatured}
                        className="px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {savingFeatured ? "Saving..." : "Save Featured Categories"}
                    </button>
                </div>
            </div>

            {/* ---- New Arrivals Section ---- */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest">
                        New Arrivals Section
                    </h2>
                </div>

                <div className="bg-white border border-neutral-200 p-6 space-y-5">
                    <div>
                        <label className={LABEL_CLASS}>Section Title</label>
                        <input
                            type="text"
                            value={siteSettings.homepage_new_arrivals_title}
                            onChange={(e) =>
                                setSiteSettings((p) => ({
                                    ...p,
                                    homepage_new_arrivals_title: e.target.value,
                                }))
                            }
                            className={INPUT_CLASS}
                            placeholder="New Arrivals"
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Filter by Category</label>
                        <select
                            value={siteSettings.homepage_new_arrivals_category_id ?? ""}
                            onChange={(e) =>
                                setSiteSettings((p) => ({
                                    ...p,
                                    homepage_new_arrivals_category_id:
                                        e.target.value || null,
                                }))
                            }
                            className={INPUT_CLASS}
                        >
                            <option value="">
                                — Latest products (no filter) —
                            </option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            Number of Products (4–16)
                        </label>
                        <input
                            type="number"
                            min={4}
                            max={16}
                            value={siteSettings.homepage_new_arrivals_limit}
                            onChange={(e) =>
                                setSiteSettings((p) => ({
                                    ...p,
                                    homepage_new_arrivals_limit: parseInt(e.target.value) || 8,
                                }))
                            }
                            className={INPUT_CLASS}
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleSaveNewArrivals}
                        disabled={savingNewArrivals}
                        className="px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {savingNewArrivals ? "Saving..." : "Save New Arrivals"}
                    </button>
                </div>
            </div>

            {/* ---- Email Opt-In & Welcome Coupon ---- */}
            <div className="space-y-4">
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest">
                        Email Opt-In & Welcome Coupon
                    </h2>
                </div>

                <div className="bg-white border border-neutral-200 p-6 space-y-5">
                    {/* Opt-in toggle */}
                    <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                        <p className="text-sm font-medium">Enable opt-in section</p>
                        <Toggle
                            on={siteSettings.optin_section_enabled}
                            onToggle={() =>
                                setSiteSettings((p) => ({
                                    ...p,
                                    optin_section_enabled: !p.optin_section_enabled,
                                }))
                            }
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Section Headline</label>
                        <input
                            type="text"
                            value={siteSettings.optin_title}
                            onChange={(e) =>
                                setSiteSettings((p) => ({
                                    ...p,
                                    optin_title: e.target.value,
                                }))
                            }
                            className={INPUT_CLASS}
                            placeholder="Join the Atelier"
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>Section Subtitle</label>
                        <textarea
                            rows={3}
                            value={siteSettings.optin_subtitle}
                            onChange={(e) =>
                                setSiteSettings((p) => ({
                                    ...p,
                                    optin_subtitle: e.target.value,
                                }))
                            }
                            className={INPUT_CLASS + " resize-none"}
                            placeholder="Subscribe for exclusive offers and new arrivals."
                        />
                    </div>

                    {/* Coupon toggle */}
                    <div className="flex items-center justify-between py-2 border-b border-neutral-100">
                        <p className="text-sm font-medium">Enable welcome coupon</p>
                        <Toggle
                            on={siteSettings.welcome_coupon_enabled}
                            onToggle={() =>
                                setSiteSettings((p) => ({
                                    ...p,
                                    welcome_coupon_enabled: !p.welcome_coupon_enabled,
                                }))
                            }
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={LABEL_CLASS}>Coupon Code</label>
                            <input
                                type="text"
                                value={siteSettings.welcome_coupon_code}
                                onChange={(e) =>
                                    setSiteSettings((p) => ({
                                        ...p,
                                        welcome_coupon_code: e.target.value.toUpperCase(),
                                    }))
                                }
                                className={INPUT_CLASS}
                                placeholder="WELCOME10"
                            />
                        </div>
                        <div>
                            <label className={LABEL_CLASS}>Discount %</label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                value={siteSettings.welcome_coupon_percentage}
                                onChange={(e) =>
                                    setSiteSettings((p) => ({
                                        ...p,
                                        welcome_coupon_percentage:
                                            parseInt(e.target.value) || 10,
                                    }))
                                }
                                className={INPUT_CLASS}
                            />
                        </div>
                    </div>

                    <p className="text-[10px] text-neutral-400 tracking-wider">
                        This coupon code must also be created in your Discounts
                        settings.
                    </p>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleSaveOptin}
                        disabled={savingOptin}
                        className="px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {savingOptin ? "Saving..." : "Save Opt-In Settings"}
                    </button>
                </div>
            </div>

            {/* ---- Subscribers Table ---- */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-widest">
                            Subscribers
                        </h2>
                        <p className="text-sm text-neutral-500 mt-1">
                            {subscriberCount} total subscribers
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-4 py-2 border border-black text-black text-[10px] uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                    >
                        Export CSV
                    </button>
                </div>

                <div className="bg-white border border-neutral-200 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200">
                                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-semibold text-neutral-500">
                                    Email
                                </th>
                                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-semibold text-neutral-500">
                                    Subscribed
                                </th>
                                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-semibold text-neutral-500">
                                    Coupon
                                </th>
                                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-semibold text-neutral-500">
                                    Source
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {subscribers.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-8 text-center text-neutral-400 italic"
                                    >
                                        No subscribers yet.
                                    </td>
                                </tr>
                            ) : (
                                subscribers.map((sub) => (
                                    <tr
                                        key={sub.id}
                                        className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-sm">
                                            {sub.email}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-500">
                                            {new Date(sub.subscribed_at).toLocaleDateString(
                                                "en-GB"
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono">
                                            {sub.coupon_code ?? "—"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-500">
                                            {sub.source ?? "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {subscriberCount > PAGE_SIZE && (
                    <div className="flex items-center justify-between pt-2">
                        <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                            Page {subscriberPage + 1} of{" "}
                            {Math.ceil(subscriberCount / PAGE_SIZE)}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => loadSubscribers(subscriberPage - 1)}
                                disabled={subscriberPage === 0}
                                className="px-3 py-1.5 border border-neutral-300 text-[10px] uppercase tracking-widest hover:bg-black hover:text-white hover:border-black disabled:opacity-30 transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                onClick={() => loadSubscribers(subscriberPage + 1)}
                                disabled={
                                    (subscriberPage + 1) * PAGE_SIZE >= subscriberCount
                                }
                                className="px-3 py-1.5 border border-neutral-300 text-[10px] uppercase tracking-widest hover:bg-black hover:text-white hover:border-black disabled:opacity-30 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
