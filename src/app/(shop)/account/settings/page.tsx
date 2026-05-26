"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Pencil, X, Plus, Trash2, Star, MapPin } from "lucide-react";

// ── Profile types ─────────────────────────────────────────────────────────────

type Profile = { full_name: string; phone: string; email_subscribed: boolean; sms_subscribed: boolean };
const DEFAULT_PROFILE: Profile = { full_name: "", phone: "", email_subscribed: true, sms_subscribed: true };

type StoreContact = { store_email: string | null; store_phone: string | null };

// ── Address types ─────────────────────────────────────────────────────────────

type Address = { id: string; label: string; address_line: string; city: string | null; region: string | null; country: string; is_default: boolean };
const EMPTY_ADDR: Omit<Address, "id"> = { label: "Home", address_line: "", city: "", region: "", country: "Ghana", is_default: false };

// ── UI helpers ────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button onClick={onToggle} aria-pressed={on}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-[#8b2f30]" : "bg-[#e0d5c0]"}`}>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
    const [email, setEmail] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Profile state
    const [form, setForm] = useState(DEFAULT_PROFILE);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Address state
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [showAddrForm, setShowAddrForm] = useState(false);
    const [addrForm, setAddrForm] = useState(EMPTY_ADDR);
    const [savingAddr, setSavingAddr] = useState(false);

    // Security & support
    const [resetSending, setResetSending] = useState(false);
    const [storeContact, setStoreContact] = useState<StoreContact>({ store_email: null, store_phone: null });

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser() as any;
            if (!user) return;
            setUserId(user.id);
            setEmail(user.email ?? "");

            const [profileRes, addrRes, settingsRes] = await Promise.all([
                supabase.from("profiles").select("full_name, phone, email_subscribed, sms_subscribed").eq("id", user.id).maybeSingle(),
                supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
                supabase.from("site_settings").select("store_email, store_phone").eq("id", "singleton").maybeSingle(),
            ]);

            if (profileRes.data) {
                const d = profileRes.data as any;
                setForm({ full_name: d.full_name ?? "", phone: d.phone ?? "", email_subscribed: d.email_subscribed ?? true, sms_subscribed: d.sms_subscribed ?? true });
            }
            setAddresses(addrRes.data ?? []);
            if (settingsRes.data) {
                const d = settingsRes.data as any;
                setStoreContact({ store_email: d.store_email ?? null, store_phone: d.store_phone ?? null });
            }
            setLoading(false);
        })();
    }, []);

    // ── Profile save ──────────────────────────────────────────────────────────

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setSaving(true);
        const { error } = await supabase.from("profiles")
            .upsert({ id: userId, email, full_name: form.full_name, phone: form.phone }, { onConflict: "id" });
        if (error) toast.error("Failed to save.");
        else { toast.success("Profile saved."); setEditing(false); }
        setSaving(false);
    };

    const toggleComm = (key: keyof Pick<Profile, "email_subscribed" | "sms_subscribed">) => {
        setForm(p => {
            const next = { ...p, [key]: !p[key] };
            if (userId) {
                supabase.from("profiles")
                    .upsert({ id: userId, email, [key]: next[key] }, { onConflict: "id" })
                    .then(({ error }: { error: any }) => { if (error) toast.error("Failed to update preference."); });
            }
            return next;
        });
    };

    // ── Address CRUD ──────────────────────────────────────────────────────────

    const saveAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addrForm.address_line.trim()) { toast.error("Address line required."); return; }
        if (!userId) return;
        setSavingAddr(true);
        if (addrForm.is_default) {
            await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
        }
        const { data, error } = await supabase.from("addresses").insert({ ...addrForm, user_id: userId }).select().single();
        setSavingAddr(false);
        if (error) { toast.error("Failed to save address."); return; }
        setAddresses(prev => addrForm.is_default
            ? [data, ...prev.map(a => ({ ...a, is_default: false }))]
            : [...prev, data]);
        setAddrForm(EMPTY_ADDR);
        setShowAddrForm(false);
        toast.success("Address saved.");
    };

    const deleteAddress = async (id: string) => {
        const { error } = await supabase.from("addresses").delete().eq("id", id);
        if (error) { toast.error("Failed to delete."); return; }
        setAddresses(prev => prev.filter(a => a.id !== id));
        toast.success("Address removed.");
    };

    const setDefaultAddress = async (id: string) => {
        if (!userId) return;
        await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
        await supabase.from("addresses").update({ is_default: true }).eq("id", id);
        setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
        toast.success("Default address updated.");
    };

    // ── Password reset ────────────────────────────────────────────────────────

    const sendPasswordReset = async () => {
        if (!email) return;
        setResetSending(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) toast.error("Failed to send reset email.");
        else toast.success("Reset link sent. Check your inbox.");
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
                <p className="text-sm text-[#8c7e6a] mt-1">Manage your profile, addresses, and preferences.</p>
            </div>

            {/* ── Profile ── */}
            <section>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#e0d5c0]">
                    <h2 className="font-serif text-base tracking-widest uppercase text-[#4a3f33]">Profile</h2>
                    {!editing ? (
                        <button onClick={() => setEditing(true)}
                            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-[#8b2f30] hover:opacity-70 transition-opacity">
                            <Pencil size={11} /> Edit
                        </button>
                    ) : (
                        <button onClick={() => setEditing(false)}
                            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] hover:text-[#1a1714] transition-colors">
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
                    <form onSubmit={saveProfile} className="space-y-5">
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Email</label>
                            <input type="email" value={email} disabled
                                className="w-full border-b border-[#e0d5c0] bg-transparent py-2 text-sm text-[#8c7e6a] cursor-not-allowed outline-none" />
                            <p className="text-[10px] text-[#b4a587] mt-1">Email cannot be changed here.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Full Name</label>
                            <input type="text" value={form.full_name}
                                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                                className="w-full border-b border-[#c8bb98] bg-transparent py-2 text-sm text-[#1a1714] outline-none focus:border-[#8b2f30] transition-colors"
                                placeholder="Your full name" />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Phone</label>
                            <input type="tel" value={form.phone}
                                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                                className="w-full border-b border-[#c8bb98] bg-transparent py-2 text-sm text-[#1a1714] outline-none focus:border-[#8b2f30] transition-colors"
                                placeholder="+233 ..." />
                        </div>
                        <button type="submit" disabled={saving}
                            className="px-8 py-3 bg-[#1a1714] text-white text-xs uppercase tracking-widest hover:bg-[#8b2f30] transition-colors disabled:opacity-50">
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </form>
                )}
            </section>

            {/* ── Addresses ── */}
            <section>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#e0d5c0]">
                    <h2 className="font-serif text-base tracking-widest uppercase text-[#4a3f33]">Addresses</h2>
                    <button
                        onClick={() => { setShowAddrForm(v => !v); setAddrForm(EMPTY_ADDR); }}
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-[#8b2f30] hover:opacity-70 transition-opacity"
                    >
                        <Plus size={11} /> {showAddrForm ? "Cancel" : "Add"}
                    </button>
                </div>

                {showAddrForm && (
                    <form onSubmit={saveAddress} className="border border-[#e0d5c0] bg-[#fdf9f3] rounded-xl p-5 mb-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Label</label>
                                <input type="text" value={addrForm.label}
                                    onChange={e => setAddrForm(p => ({ ...p, label: e.target.value }))}
                                    className="w-full border-b border-[#c8bb98] bg-transparent py-2 outline-none focus:border-[#8b2f30] text-sm text-[#1a1714] transition-colors"
                                    placeholder="Home / Work" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">City</label>
                                <input type="text" value={addrForm.city ?? ""}
                                    onChange={e => setAddrForm(p => ({ ...p, city: e.target.value }))}
                                    className="w-full border-b border-[#c8bb98] bg-transparent py-2 outline-none focus:border-[#8b2f30] text-sm text-[#1a1714] transition-colors"
                                    placeholder="Accra" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Address Line</label>
                            <input type="text" value={addrForm.address_line}
                                onChange={e => setAddrForm(p => ({ ...p, address_line: e.target.value }))}
                                className="w-full border-b border-[#c8bb98] bg-transparent py-2 outline-none focus:border-[#8b2f30] text-sm text-[#1a1714] transition-colors"
                                placeholder="123 Osu, Airport Residential" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Region</label>
                                <input type="text" value={addrForm.region ?? ""}
                                    onChange={e => setAddrForm(p => ({ ...p, region: e.target.value }))}
                                    className="w-full border-b border-[#c8bb98] bg-transparent py-2 outline-none focus:border-[#8b2f30] text-sm text-[#1a1714] transition-colors"
                                    placeholder="Greater Accra" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a] mb-2">Country</label>
                                <input type="text" value={addrForm.country}
                                    onChange={e => setAddrForm(p => ({ ...p, country: e.target.value }))}
                                    className="w-full border-b border-[#c8bb98] bg-transparent py-2 outline-none focus:border-[#8b2f30] text-sm text-[#1a1714] transition-colors" />
                            </div>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={addrForm.is_default}
                                onChange={e => setAddrForm(p => ({ ...p, is_default: e.target.checked }))}
                                className="w-4 h-4 accent-[#8b2f30]" />
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-[#8c7e6a]">Set as default</span>
                        </label>
                        <button type="submit" disabled={savingAddr}
                            className="px-8 py-3 bg-[#1a1714] text-white text-xs uppercase tracking-widest hover:bg-[#8b2f30] transition-colors disabled:opacity-50">
                            {savingAddr ? "Saving..." : "Save Address"}
                        </button>
                    </form>
                )}

                {addresses.length === 0 && !showAddrForm ? (
                    <div className="text-center py-10">
                        <MapPin size={28} className="mx-auto text-[#e0d5c0] mb-3" strokeWidth={1} />
                        <p className="font-serif text-[#8c7e6a] italic text-sm mb-4">No saved addresses yet.</p>
                        <button onClick={() => setShowAddrForm(true)}
                            className="text-xs uppercase tracking-widest font-semibold border-b border-[#8b2f30] text-[#8b2f30] pb-0.5 hover:opacity-70 transition-opacity">
                            Add your first address →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {addresses.map(addr => (
                            <div key={addr.id} className={`border rounded-xl p-4 bg-[#fdf9f3] flex justify-between items-start gap-3 ${
                                addr.is_default ? "border-[#8b2f30]/40" : "border-[#e0d5c0]"
                            }`}>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-xs font-semibold uppercase tracking-widest text-[#1a1714]">{addr.label}</span>
                                        {addr.is_default && (
                                            <span className="text-[9px] bg-[#8b2f30] text-white px-2 py-0.5 uppercase tracking-widest rounded-full">Default</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[#4a3f33]">{addr.address_line}</p>
                                    <p className="text-xs text-[#8c7e6a] mt-0.5">{[addr.city, addr.region, addr.country].filter(Boolean).join(", ")}</p>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                    {!addr.is_default && (
                                        <button onClick={() => setDefaultAddress(addr.id)}
                                            className="p-2 text-[#c8bb98] hover:text-[#b4894a] transition-colors" title="Set as default">
                                            <Star size={14} />
                                        </button>
                                    )}
                                    <button onClick={() => deleteAddress(addr.id)}
                                        className="p-2 text-[#c8bb98] hover:text-red-500 transition-colors" title="Remove">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Notifications ── */}
            <section>
                <h2 className="font-serif text-sm tracking-widest uppercase text-[#4a3f33] mb-2 pb-2 border-b border-[#e0d5c0]">How we reach you</h2>
                <div className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl divide-y divide-[#e0d5c0]">
                    <div className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-sm font-medium text-[#1a1714]">Order updates · Email</p>
                            <p className="text-[11px] text-[#8c7e6a] mt-0.5">Receipts, dispatch &amp; delivery</p>
                        </div>
                        <Toggle on={form.email_subscribed} onToggle={() => toggleComm("email_subscribed")} />
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-sm font-medium text-[#1a1714]">Order updates · SMS</p>
                            <p className="text-[11px] text-[#8c7e6a] mt-0.5">Carrier handoff &amp; delivery</p>
                        </div>
                        <Toggle on={form.sms_subscribed} onToggle={() => toggleComm("sms_subscribed")} />
                    </div>
                </div>
            </section>

            {/* ── Security & Support ── */}
            <section>
                <h2 className="font-serif text-sm tracking-widest uppercase text-[#4a3f33] mb-2 pb-2 border-b border-[#e0d5c0]">Security &amp; support</h2>
                <div className="bg-[#fdf9f3] border border-[#e0d5c0] rounded-xl divide-y divide-[#e0d5c0]">
                    <div className="flex items-center justify-between px-5 py-4">
                        <div>
                            <p className="text-sm font-medium text-[#1a1714]">Password</p>
                            <p className="text-[11px] text-[#8c7e6a] mt-0.5">Send a reset link to {email}</p>
                        </div>
                        <button onClick={sendPasswordReset} disabled={resetSending}
                            className="text-[10px] uppercase tracking-widest font-semibold text-[#8b2f30] hover:opacity-70 transition-opacity disabled:opacity-40">
                            {resetSending ? "Sending…" : "Reset"}
                        </button>
                    </div>

                    {(storeContact.store_email || storeContact.store_phone) && (
                        <div className="px-5 py-4">
                            <p className="text-sm font-medium text-[#1a1714] mb-2">Contact Support</p>
                            {storeContact.store_email && (
                                <a href={`mailto:${storeContact.store_email}`} className="block text-[11px] text-[#8c7e6a] hover:text-[#8b2f30] transition-colors mb-1">
                                    {storeContact.store_email}
                                </a>
                            )}
                            {storeContact.store_phone && (
                                <a href={`tel:${storeContact.store_phone}`} className="block text-[11px] text-[#8c7e6a] hover:text-[#8b2f30] transition-colors">
                                    {storeContact.store_phone}
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Danger zone ── */}
            <section className="pt-4 border-t border-[#e0d5c0]">
                <button className="text-[11px] uppercase tracking-widest font-semibold text-red-600/70 hover:text-red-600 transition-colors">
                    Delete account
                </button>
            </section>
        </div>
    );
}
