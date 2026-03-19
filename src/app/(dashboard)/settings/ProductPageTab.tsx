"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type PDPSettings = {
    pdp_show_trust_strip: boolean;
    pdp_show_reviews: boolean;
    pdp_show_product_details: boolean;
    pdp_show_care_instructions: boolean;
    pdp_show_delivery_returns: boolean;
};

const DEFAULTS: PDPSettings = {
    pdp_show_trust_strip: true,
    pdp_show_reviews: true,
    pdp_show_product_details: true,
    pdp_show_care_instructions: true,
    pdp_show_delivery_returns: true,
};

function Toggle({
    checked,
    onChange,
    label,
    description,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description?: string;
}) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-neutral-100">
            <div className="flex-1 pr-6">
                <p className="text-sm font-medium text-neutral-800">{label}</p>
                {description && (
                    <p className="text-xs text-neutral-400 mt-0.5 leading-snug">{description}</p>
                )}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    checked ? "bg-black" : "bg-neutral-200"
                }`}
            >
                <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        checked ? "translate-x-4" : "translate-x-0"
                    }`}
                />
            </button>
        </div>
    );
}

export function ProductPageTab() {
    const [settings, setSettings] = useState<PDPSettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase
            .from("site_settings")
            .select("pdp_show_trust_strip, pdp_show_reviews, pdp_show_product_details, pdp_show_care_instructions, pdp_show_delivery_returns")
            .eq("id", "singleton")
            .single()
            .then(({ data }) => {
                if (data) setSettings({ ...DEFAULTS, ...data });
                setLoading(false);
            });
    }, []);

    const set = (key: keyof PDPSettings, val: boolean) =>
        setSettings(s => ({ ...s, [key]: val }));

    const save = async () => {
        setSaving(true);
        const { error } = await supabase
            .from("site_settings")
            .update(settings)
            .eq("id", "singleton");
        setSaving(false);
        if (error) toast.error("Failed to save: " + error.message);
        else toast.success("Product page settings saved");
    };

    if (loading) return <p className="text-sm text-neutral-400">Loading…</p>;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-1">
                    Product Page Sections
                </h2>
                <p className="text-sm text-neutral-500 mb-6">
                    Control which sections are visible on every product detail page.
                    Changes take effect after the next deployment or within 60 seconds via ISR.
                </p>

                <div className="bg-white border border-neutral-200 rounded-lg px-4">
                    <Toggle
                        checked={settings.pdp_show_trust_strip}
                        onChange={v => set("pdp_show_trust_strip", v)}
                        label="Trust Strip"
                        description='Free Delivery / Easy Returns / Secure Payment icons below the CTA buttons.'
                    />
                    <Toggle
                        checked={settings.pdp_show_product_details}
                        onChange={v => set("pdp_show_product_details", v)}
                        label="Product Details accordion"
                        description="Expandable section showing the product description and features list."
                    />
                    <Toggle
                        checked={settings.pdp_show_care_instructions}
                        onChange={v => set("pdp_show_care_instructions", v)}
                        label="Care Instructions accordion"
                        description="Expandable section with washing and care guidance."
                    />
                    <Toggle
                        checked={settings.pdp_show_delivery_returns}
                        onChange={v => set("pdp_show_delivery_returns", v)}
                        label="Delivery & Returns accordion"
                        description="Expandable section with delivery times, free-delivery threshold, and return policy."
                    />
                    <Toggle
                        checked={settings.pdp_show_reviews}
                        onChange={v => set("pdp_show_reviews", v)}
                        label="Customer Reviews section"
                        description="Rating summary bars and review cards at the bottom of the page."
                    />
                </div>
            </div>

            <button
                type="button"
                onClick={save}
                disabled={saving}
                className="px-5 py-2 bg-black text-white text-xs font-semibold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
                {saving ? "Saving…" : "Save Settings"}
            </button>
        </div>
    );
}
