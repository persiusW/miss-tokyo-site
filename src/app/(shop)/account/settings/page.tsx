"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Pencil, X } from "lucide-react";

type Profile = { full_name: string; phone: string; notif_email: boolean; notif_sms: boolean; notif_whatsapp: boolean };
const DEFAULT: Profile = { full_name: "", phone: "", notif_email: true, notif_sms: true, notif_whatsapp: false };

type StoreContact = { store_email: string | null; store_phone: string | null };

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

function ProfileRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-[#e0d5c0] last:border-0 gap-4">
            <span className="text-sm text-[#4a3f33]">{label}</span>
            <span className="text-sm text-[#1a1714] text-right truncate max-w-[60%]">{value || "—"}</span>
        </div>
    );
}

export default function SettingsPage() {
    const [email, setEmail] = useState("");
    const [form, setForm] = useState(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [resetSending, setResetSending] = useState(false);
    const [storeContact, setStoreContact] = useState<StoreContact>({ store_email: null, store_phone: null });

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser() as any;
            if (!user) return;
            setUserId(user.id);
            setEmail(user.email ?? "");

            const [profileRes, settingsRes] = await Promise.all([
                supabase.from("profiles").select("full_name, phone, notif_email, notif_sms, notif_whatsapp").eq("id", user.id).maybeSingle(),
                supabase.from("site_settings").select("store_email, store_phone").eq("id", "singleton").maybeSingle(),
            ]);

            if (profileRes.data) {
                setForm({
                    full_name: profileRes.data.full_name ?? "",
                    phone: profileRes.data.phone ?? "",
                    notif_email: profileRes.data.notif_email ?? true,
                    notif_sms: profileRes.data.notif_sms ?? true,
                    notif_whatsapp: profileRes.data.notif_whatsapp ?? false,
                });
            }

            if (settingsRes.data) {
                setStoreContact({
                    store_email: (settingsRes.data as any).store_email ?? null,
                    store_phone: (settingsRes.data as any).store_phone ?? null,
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
            toast.success("Profile saved.");
            setEditing(false);
        } else if (!updateErr) {
            const { error: insertErr } = await supabase.from("profiles").insert({ id: userId, email, ...payload });
            if (insertErr) toast.error("Failed to save.");
            else { toast.success("Profile saved."); setEditing(false); }
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

    const sendPasswordReset = async () => {
        if (!email) return;
        setResetSending(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
            toast.error("Failed to send reset email.");
        } else {
            toast.success("Password reset email sent. Check your inbox.");
        }
        setResetSending(false);
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
                <h1 className="font-serif text-2xl md:text-3xl tracking-widest uppercase">
                    Settings <em className="italic">& preferences</em>
                </h1>
                <p className="text-sm text-[#8c7e6a] mt-1">Manage your profile, how we reach you, and the look of the app.</p>
            </div>

            {/* Profile */}
            <section>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#e0d5c0]">
                    <h2 className="font-serif text-base tracking-widest uppercase text-[#4a3f33]">Profile</h2>
                    {!editing ? (
                        <button
                            onClick={() => setEditing(true)}
                            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-[#8b2f30] hover:opacity-70 transition-opacity"
                        >
                            <Pencil size={11} /> Edit
                        </button>
                    ) : (
                        <button
                            onClick={() => setEditing(false)}
                            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] hover:text-[#1a1714] transition-colors"
                        >
                            <X size={11} /> Cancel
                        </button>
                    )}
                </div>

                {!editing ? (
                    <div className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl px-5">
                        <ProfileRow label="Name" value={form.full_name} />
                        <ProfileRow label="Email" value={email} />
                        <ProfileRow label="Phone" value={form.phone} />
                    </div>
                ) : (
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
                )}
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

            {/* Security & Support */}
            <section>
                <h2 className="font-serif text-sm tracking-widest uppercase text-[#4a3f33] mb-2 pb-2 border-b border-[#e0d5c0]">Security &amp; support</h2>
                <div className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl divide-y divide-[#e0d5c0]">
                    {/* Password reset */}
                    <div className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-sm font-medium text-[#1a1714]">Password</p>
                            <p className="text-[11px] text-[#8c7e6a] mt-0.5">Send a reset link to {email}</p>
                        </div>
                        <button
                            onClick={sendPasswordReset}
                            disabled={resetSending}
                            className="text-[10px] uppercase tracking-widest font-semibold text-[#8b2f30] hover:opacity-70 transition-opacity disabled:opacity-40"
                        >
                            {resetSending ? "Sending…" : "Reset"}
                        </button>
                    </div>

                    {/* Contact support */}
                    {(storeContact.store_email || storeContact.store_phone) && (
                        <div className="px-5 py-4">
                            <p className="text-sm font-medium text-[#1a1714] mb-2">Contact Support</p>
                            {storeContact.store_email && (
                                <a
                                    href={`mailto:${storeContact.store_email}`}
                                    className="block text-[11px] text-[#8c7e6a] hover:text-[#8b2f30] transition-colors mb-1"
                                >
                                    {storeContact.store_email}
                                </a>
                            )}
                            {storeContact.store_phone && (
                                <a
                                    href={`tel:${storeContact.store_phone}`}
                                    className="block text-[11px] text-[#8c7e6a] hover:text-[#8b2f30] transition-colors"
                                >
                                    {storeContact.store_phone}
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Danger zone */}
            <section className="pt-4 border-t border-[#e0d5c0]">
                <button className="text-[11px] uppercase tracking-widest font-semibold text-red-600/70 hover:text-red-600 transition-colors">
                    Delete account
                </button>
            </section>
        </div>
    );
}
