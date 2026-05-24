"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { ChevronRight } from "lucide-react";

type Profile = { full_name: string; phone: string; notif_email: boolean; notif_sms: boolean; notif_whatsapp: boolean };
const DEFAULT: Profile = { full_name: "", phone: "", notif_email: true, notif_sms: true, notif_whatsapp: false };

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            aria-pressed={on}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-[#8b2f30]" : "bg-[#e0d5c0]"}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
        </button>
    );
}

function SettingRow({ label, sub, value, arrow }: { label: string; sub?: string; value?: React.ReactNode; arrow?: boolean }) {
    return (
        <div className="flex items-center justify-between gap-4 py-4 border-b border-[#e0d5c0] last:border-0">
            <div>
                <p className="text-sm font-medium text-[#1a1714]">{label}</p>
                {sub && <p className="text-[11px] text-[#8c7e6a] mt-0.5">{sub}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {value}
                {arrow && <ChevronRight size={14} className="text-[#c8bb98]" />}
            </div>
        </div>
    );
}

export default function SettingsPage() {
    const [email, setEmail] = useState("");
    const [form, setForm] = useState(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser() as any;
            if (!user) return;
            setUserId(user.id);
            setEmail(user.email ?? "");
            const { data } = await supabase.from("profiles").select("full_name, phone, notif_email, notif_sms, notif_whatsapp").eq("id", user.id).maybeSingle();
            if (data) {
                setForm({
                    full_name: data.full_name ?? "",
                    phone: data.phone ?? "",
                    notif_email: data.notif_email ?? true,
                    notif_sms: data.notif_sms ?? true,
                    notif_whatsapp: data.notif_whatsapp ?? false,
                });
            }
            setLoading(false);
        })();
    }, []);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setSaving(true);
        const payload = { full_name: form.full_name, phone: form.phone, notif_email: form.notif_email, notif_sms: form.notif_sms, notif_whatsapp: form.notif_whatsapp };
        const { data: updated, error: updateErr } = await supabase.from("profiles").update(payload).eq("id", userId).select("id");
        if (!updateErr && updated && updated.length > 0) {
            toast.success("Settings saved.");
        } else if (!updateErr) {
            const { error: insertErr } = await supabase.from("profiles").insert({ id: userId, email, ...payload });
            if (insertErr) toast.error("Failed to save.");
            else toast.success("Settings saved.");
        } else {
            toast.error("Failed to save.");
        }
        setSaving(false);
    };

    const toggleComm = (key: keyof Pick<Profile, "notif_email" | "notif_sms" | "notif_whatsapp">) => {
        setForm(p => {
            const next = { ...p, [key]: !p[key] };
            if (userId) {
                supabase.from("profiles").update({ [key]: next[key] }).eq("id", userId).then(({ error }: { error: any }) => {
                    if (error) toast.error("Failed to update preference.");
                });
            }
            return next;
        });
    };

    if (loading) return (
        <div className="max-w-lg space-y-6 animate-pulse">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-[#e0d5c0] rounded" />)}
        </div>
    );

    return (
        <div className="max-w-lg space-y-10">
            <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#8c7e6a] mb-1">Account</p>
                <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase">Settings</h1>
            </div>

            {/* Profile */}
            <section>
                <h2 className="font-serif text-sm tracking-widest uppercase text-[#4a3f33] mb-4 pb-2 border-b border-[#e0d5c0]">Profile</h2>
                <form onSubmit={save} className="space-y-5">
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full border-b border-[#e0d5c0] bg-transparent py-2 text-sm text-[#8c7e6a] cursor-not-allowed outline-none"
                        />
                        <p className="text-[10px] text-[#b4a587] mt-1">Email cannot be changed here.</p>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Full Name</label>
                        <input
                            type="text"
                            value={form.full_name}
                            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                            className="w-full border-b border-[#c8bb98] bg-transparent py-2 text-sm text-[#1a1714] outline-none focus:border-[#8b2f30] transition-colors"
                            placeholder="Your full name"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Phone</label>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                            className="w-full border-b border-[#c8bb98] bg-transparent py-2 text-sm text-[#1a1714] outline-none focus:border-[#8b2f30] transition-colors"
                            placeholder="+233 ..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-[#1a1714] text-white text-xs uppercase tracking-widest hover:bg-[#8b2f30] transition-colors disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            </section>

            {/* Notifications */}
            <section>
                <h2 className="font-serif text-sm tracking-widest uppercase text-[#4a3f33] mb-2 pb-2 border-b border-[#e0d5c0]">How we reach you</h2>
                <div className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl divide-y divide-[#e0d5c0]">
                    <div className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-sm font-medium text-[#1a1714]">Order updates · Email</p>
                            <p className="text-[11px] text-[#8c7e6a] mt-0.5">Receipts, dispatch &amp; delivery</p>
                        </div>
                        <Toggle on={form.notif_email} onToggle={() => toggleComm("notif_email")} />
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-sm font-medium text-[#1a1714]">Order updates · SMS</p>
                            <p className="text-[11px] text-[#8c7e6a] mt-0.5">Carrier handoff &amp; delivery</p>
                        </div>
                        <Toggle on={form.notif_sms} onToggle={() => toggleComm("notif_sms")} />
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-sm font-medium text-[#1a1714]">WhatsApp</p>
                            <p className="text-[11px] text-[#8c7e6a] mt-0.5">Order disputes &amp; atelier enquiries</p>
                        </div>
                        <Toggle on={form.notif_whatsapp} onToggle={() => toggleComm("notif_whatsapp")} />
                    </div>
                </div>
            </section>

            {/* Security */}
            <section>
                <h2 className="font-serif text-sm tracking-widest uppercase text-[#4a3f33] mb-2 pb-2 border-b border-[#e0d5c0]">Security &amp; privacy</h2>
                <div className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl divide-y divide-[#e0d5c0]">
                    <SettingRow label="Password" sub="Change your password" value={<span className="text-[10px] text-[#8c7e6a]">Update</span>} arrow />
                    <SettingRow label="Active sessions" sub="Devices signed in to your account" value={<span className="text-[10px] text-[#8c7e6a]">View</span>} arrow />
                </div>
            </section>

            {/* Danger zone */}
            <section className="pt-4 border-t border-[#e0d5c0]">
                <button
                    className="text-[11px] uppercase tracking-widest font-semibold text-red-600/70 hover:text-red-600 transition-colors"
                >
                    Delete account
                </button>
            </section>
        </div>
    );
}
