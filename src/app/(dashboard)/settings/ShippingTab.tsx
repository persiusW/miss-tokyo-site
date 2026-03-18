"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

const DEFAULT_INSTRUCTIONS = "Ensure you receive an email confirmation confirming your pickup before arriving at the shop. If you arrive before receiving the confirmation email, you'll have to return later to pick up your order. Working Hours: 10 am - 8 pm";
const MAX_CHARS = 500;

type PickupForm = {
    pickup_enabled: boolean;
    pickup_instructions: string;
    pickup_address: string;
    pickup_contact_phone: string;
    pickup_estimated_wait: string;
};

const DEFAULT_FORM: PickupForm = {
    pickup_enabled: true,
    pickup_instructions: DEFAULT_INSTRUCTIONS,
    pickup_address: "",
    pickup_contact_phone: "",
    pickup_estimated_wait: "24 hours",
};

export function ShippingTab() {
    const [form, setForm] = useState<PickupForm>(DEFAULT_FORM);
    const [storeAddress, setStoreAddress] = useState("");
    const [storePhone, setStorePhone] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        Promise.all([
            supabase.from("site_settings").select("pickup_enabled, pickup_instructions, pickup_address, pickup_contact_phone, pickup_estimated_wait").eq("id", "singleton").single(),
            supabase.from("business_settings").select("address, contact").eq("id", "default").single(),
        ]).then(([{ data: ss }, { data: biz }]) => {
            if (ss) {
                setForm({
                    pickup_enabled: ss.pickup_enabled ?? true,
                    pickup_instructions: ss.pickup_instructions || DEFAULT_INSTRUCTIONS,
                    pickup_address: ss.pickup_address || "",
                    pickup_contact_phone: ss.pickup_contact_phone || "",
                    pickup_estimated_wait: ss.pickup_estimated_wait || "24 hours",
                });
            }
            if (biz) {
                setStoreAddress(biz.address || "");
                setStorePhone(biz.contact || "");
            }
            setLoading(false);
        });
    }, []);

    // Auto-resize textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
        const minH = lineHeight * 4;
        const maxH = lineHeight * 8;
        el.style.height = `${Math.min(maxH, Math.max(minH, el.scrollHeight))}px`;
    }, [form.pickup_instructions]);

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase.from("site_settings").upsert(
            {
                id: "singleton",
                pickup_enabled: form.pickup_enabled,
                pickup_instructions: form.pickup_instructions,
                pickup_address: form.pickup_address || null,
                pickup_contact_phone: form.pickup_contact_phone || null,
                pickup_estimated_wait: form.pickup_estimated_wait,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
        );
        setSaving(false);
        if (error) {
            toast.error("Failed to save pickup settings.");
        } else {
            toast.success("Pickup settings saved.");
        }
    };

    const previewAddress = form.pickup_address || storeAddress || "—";
    const previewPhone = form.pickup_contact_phone || storePhone || "—";
    const charCount = form.pickup_instructions.length;

    if (loading) return <p className="text-neutral-400 italic font-serif py-8">Loading...</p>;

    const disabled = !form.pickup_enabled;

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Section header */}
            <div className="bg-white border border-neutral-200 p-8 space-y-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">Store Pickup</h2>

                {/* Enable toggle */}
                <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={form.pickup_enabled}
                            onClick={() => setForm(p => ({ ...p, pickup_enabled: !p.pickup_enabled }))}
                            className={`relative w-10 h-5 rounded-full transition-colors ${form.pickup_enabled ? "bg-black" : "bg-neutral-300"}`}
                        >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.pickup_enabled ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-700">
                            Enable store pickup option at checkout
                        </span>
                    </label>
                    {!form.pickup_enabled && (
                        <p className="mt-2 ml-[52px] text-[10px] uppercase tracking-widest text-amber-600">
                            Store pickup is disabled. Customers will not see this option at checkout.
                        </p>
                    )}
                </div>

                {/* Fields — greyed out when disabled */}
                <div className={`space-y-6 transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`}>

                    {/* Pickup instructions */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">
                            Pickup Instructions
                        </label>
                        <textarea
                            ref={textareaRef}
                            value={form.pickup_instructions}
                            onChange={e => {
                                if (e.target.value.length <= MAX_CHARS) {
                                    setForm(p => ({ ...p, pickup_instructions: e.target.value }));
                                }
                            }}
                            rows={4}
                            className="w-full border border-neutral-200 p-3 bg-transparent outline-none focus:border-black transition-colors resize-none text-sm leading-relaxed"
                            placeholder={DEFAULT_INSTRUCTIONS}
                            style={{ whiteSpace: "pre-wrap" }}
                        />
                        <div className="flex items-start justify-between mt-1 gap-2">
                            <p className="text-[10px] text-neutral-400 tracking-wider">
                                This text appears verbatim in pickup order emails and receipts.
                            </p>
                            <span className={`text-[10px] tracking-wider shrink-0 ${charCount > MAX_CHARS * 0.9 ? "text-amber-600" : "text-neutral-400"}`}>
                                {charCount} / {MAX_CHARS}
                            </span>
                        </div>
                    </div>

                    {/* Pickup address */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">
                            Pickup Address <span className="font-normal normal-case tracking-normal text-neutral-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={form.pickup_address}
                            onChange={e => setForm(p => ({ ...p, pickup_address: e.target.value }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                            placeholder="Leave blank to use your store address"
                        />
                        {!form.pickup_address && storeAddress && (
                            <p className="text-[10px] text-neutral-400 mt-1 tracking-wider">
                                Using store address: <span className="text-neutral-600">{storeAddress}</span>
                            </p>
                        )}
                    </div>

                    {/* Pickup contact phone */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">
                            Pickup Contact Number <span className="font-normal normal-case tracking-normal text-neutral-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={form.pickup_contact_phone}
                            onChange={e => setForm(p => ({ ...p, pickup_contact_phone: e.target.value }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                            placeholder="Leave blank to use your store phone number"
                        />
                    </div>

                    {/* Estimated wait */}
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">
                            Estimated Pickup Ready Time
                        </label>
                        <input
                            type="text"
                            value={form.pickup_estimated_wait}
                            onChange={e => setForm(p => ({ ...p, pickup_estimated_wait: e.target.value }))}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors text-sm"
                            placeholder="e.g. 24 hours, Same day, 1–2 business days"
                        />
                        <p className="text-[10px] text-neutral-400 mt-1 tracking-wider">Shown to customers after placing a pickup order.</p>
                    </div>

                    {/* Live preview */}
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-3">Preview — How it appears in emails & receipts</p>
                        <div style={{ backgroundColor: "#F7F2EC", padding: "20px", borderRadius: "2px", border: "1px solid #E8E4DE" }}>
                            <p style={{ fontSize: "13px", fontWeight: 700, marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                📦 Store Pickup Instructions
                            </p>
                            <p style={{ fontSize: "13px", lineHeight: 1.7, color: "#404040", whiteSpace: "pre-wrap", marginBottom: "16px" }}>
                                {form.pickup_instructions || DEFAULT_INSTRUCTIONS}
                            </p>
                            <div style={{ borderTop: "1px solid #DDD8D1", paddingTop: "12px", fontSize: "12px", color: "#525252", lineHeight: 2 }}>
                                <div>📍 {previewAddress}</div>
                                <div>📞 {previewPhone}</div>
                                <div>⏱ Ready in: {form.pickup_estimated_wait || "24 hours"}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2 border-t border-neutral-100">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Pickup Settings"}
                    </button>
                </div>
            </div>
        </div>
    );
}
