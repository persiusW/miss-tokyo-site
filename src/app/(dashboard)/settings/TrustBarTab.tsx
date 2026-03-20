"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";

type TrustBarItem = {
    id: string;
    text: string;
    enabled: boolean;
};

export function TrustBarTab() {
    const [enabled, setEnabled] = useState(false);
    const [items, setItems] = useState<TrustBarItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        supabase
            .from("site_settings")
            .select("trust_bar_enabled, trust_bar_items")
            .eq("id", "singleton")
            .single()
            .then(({ data }: { data: any }) => {
                if (data) {
                    setEnabled(data.trust_bar_enabled ?? false);
                    setItems(
                        Array.isArray(data.trust_bar_items)
                            ? data.trust_bar_items
                            : []
                    );
                }
                setLoading(false);
            });
    }, []);

    const addItem = () => {
        setItems((prev) => [
            ...prev,
            { id: crypto.randomUUID(), text: "", enabled: true },
        ]);
    };

    const updateItem = (id: string, field: keyof TrustBarItem, value: string | boolean) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const removeItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const moveItem = (index: number, direction: "up" | "down") => {
        const next = [...items];
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= next.length) return;
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
        setItems(next);
    };

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase
            .from("site_settings")
            .upsert(
                { id: "singleton", trust_bar_enabled: enabled, trust_bar_items: items },
                { onConflict: "id" }
            );
        setSaving(false);
        if (error) {
            toast.error("Failed to save trust bar");
        } else {
            toast.success("Trust bar saved");
        }
    };

    if (loading) {
        return (
            <p className="text-neutral-400 italic font-serif">Loading...</p>
        );
    }

    return (
        <div className="max-w-2xl space-y-8">
            <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-1">
                    Trust Bar
                </h2>
                <p className="text-sm text-neutral-500">
                    The thin message strip below the navigation.
                </p>
            </div>

            {/* Master toggle */}
            <div className="bg-white border border-neutral-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Show trust bar</p>
                        <p className="text-[10px] uppercase tracking-widest text-neutral-400 mt-0.5">
                            Displays the strip across all pages
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEnabled((v) => !v)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            enabled ? "bg-black" : "bg-neutral-200"
                        }`}
                        aria-pressed={enabled}
                    >
                        <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                enabled ? "translate-x-[18px]" : "translate-x-[3px]"
                            }`}
                        />
                    </button>
                </div>
            </div>

            {/* Items */}
            <div className="bg-white border border-neutral-200 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                    <h3 className="text-xs font-semibold uppercase tracking-widest">
                        Items
                    </h3>
                    <button
                        type="button"
                        onClick={addItem}
                        className="text-[10px] uppercase tracking-widest font-semibold text-black hover:underline"
                    >
                        + Add Item
                    </button>
                </div>

                {items.length === 0 && (
                    <p className="text-sm text-neutral-400 italic">
                        No items yet. Add one above.
                    </p>
                )}

                {items.map((item, index) => (
                    <div
                        key={item.id}
                        className="flex items-center gap-3 py-2 border-b border-neutral-100 last:border-0"
                    >
                        <span className="text-[10px] text-neutral-400 w-5 shrink-0 text-center">
                            {index + 1}
                        </span>

                        <input
                            type="text"
                            value={item.text}
                            onChange={(e) =>
                                updateItem(item.id, "text", e.target.value)
                            }
                            className="flex-1 border-b border-neutral-300 bg-transparent py-1.5 outline-none focus:border-black text-sm transition-colors"
                            placeholder="Free delivery on orders over ₦50,000"
                        />

                        {/* Enabled toggle */}
                        <button
                            type="button"
                            onClick={() =>
                                updateItem(item.id, "enabled", !item.enabled)
                            }
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                                item.enabled ? "bg-black" : "bg-neutral-200"
                            }`}
                            aria-pressed={item.enabled}
                        >
                            <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                    item.enabled
                                        ? "translate-x-[18px]"
                                        : "translate-x-[3px]"
                                }`}
                            />
                        </button>

                        {/* Move buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => moveItem(index, "up")}
                                disabled={index === 0}
                                className="p-0.5 text-neutral-400 hover:text-black disabled:opacity-30 transition-colors"
                            >
                                <ArrowUp size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={() => moveItem(index, "down")}
                                disabled={index === items.length - 1}
                                className="p-0.5 text-neutral-400 hover:text-black disabled:opacity-30 transition-colors"
                            >
                                <ArrowDown size={12} />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="shrink-0 text-neutral-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save Trust Bar"}
                </button>
            </div>
        </div>
    );
}
