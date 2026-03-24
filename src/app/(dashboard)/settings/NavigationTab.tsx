"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type NavSettings = {
    nav_show_home: boolean;
    nav_show_shop: boolean;
    nav_show_gallery: boolean;
    nav_show_sale: boolean;
    nav_show_dresses: boolean;
    nav_show_new_arrivals: boolean;
    nav_show_gift_card: boolean;
    nav_show_contact: boolean;
    nav_show_about: boolean;
};

const DEFAULT: NavSettings = {
    nav_show_home: true,
    nav_show_shop: true,
    nav_show_gallery: true,
    nav_show_sale: true,
    nav_show_dresses: true,
    nav_show_new_arrivals: true,
    nav_show_gift_card: true,
    nav_show_contact: true,
    nav_show_about: true,
};

const NAV_ITEMS: { key: keyof NavSettings; label: string }[] = [
    { key: "nav_show_home", label: "Home" },
    { key: "nav_show_shop", label: "Shop" },
    { key: "nav_show_gallery", label: "Gallery" },
    { key: "nav_show_sale", label: "Sale" },
    { key: "nav_show_dresses", label: "Dresses" },
    { key: "nav_show_new_arrivals", label: "New Arrivals" },
    { key: "nav_show_gift_card", label: "Gift Cards" },
    { key: "nav_show_contact", label: "Contact" },
    { key: "nav_show_about", label: "About" },
];

export function NavigationTab() {
    const [settings, setSettings] = useState<NavSettings>(DEFAULT);
    const [loading, setLoading] = useState(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        supabase
            .from("site_settings")
            .select(
                "nav_show_home, nav_show_shop, nav_show_gallery, nav_show_sale, nav_show_dresses, nav_show_new_arrivals, nav_show_gift_card, nav_show_contact, nav_show_about"
            )
            .eq("id", "singleton")
            .single()
            .then(({ data }: { data: any }) => {
                if (data) {
                    setSettings({
                        nav_show_home: data.nav_show_home ?? true,
                        nav_show_shop: data.nav_show_shop ?? true,
                        nav_show_gallery: data.nav_show_gallery ?? true,
                        nav_show_sale: data.nav_show_sale ?? true,
                        nav_show_dresses: data.nav_show_dresses ?? true,
                        nav_show_new_arrivals: data.nav_show_new_arrivals ?? true,
                        nav_show_gift_card: data.nav_show_gift_card ?? true,
                        nav_show_contact: data.nav_show_contact ?? true,
                        nav_show_about: data.nav_show_about ?? true,
                    });
                }
                setLoading(false);
            });
    }, []);

    const toggle = (key: keyof NavSettings) => {
        const next = { ...settings, [key]: !settings[key] };
        setSettings(next);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            const { error } = await supabase
                .from("site_settings")
                .upsert({ id: "singleton", ...next }, { onConflict: "id" });
            if (error) {
                toast.error("Failed to save navigation settings");
            } else {
                toast.success("Navigation updated");
            }
        }, 500);
    };

    if (loading) {
        return (
            <p className="text-neutral-400 italic font-serif">Loading...</p>
        );
    }

    return (
        <div className="max-w-xl space-y-6">
            <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-1">
                    Navigation Visibility
                </h2>
                <p className="text-sm text-neutral-500">
                    Toggle which links appear in the site navigation.
                </p>
                <p className="text-[10px] uppercase tracking-widest text-amber-600 mt-2">
                    Recommended to keep at least one navigation link visible.
                </p>
            </div>

            <div className="bg-white border border-neutral-200 p-6 space-y-4">
                {NAV_ITEMS.map(({ key, label }) => {
                    const on = settings[key];
                    return (
                        <div
                            key={key}
                            className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0"
                        >
                            <span className="text-sm font-medium">{label}</span>
                            <button
                                type="button"
                                onClick={() => toggle(key)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                                    on ? "bg-black" : "bg-neutral-200"
                                }`}
                                aria-pressed={on}
                                aria-label={`Toggle ${label}`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                        on ? "translate-x-[18px]" : "translate-x-[3px]"
                                    }`}
                                />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
