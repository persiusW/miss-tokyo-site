"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";
import { toast } from "@/lib/toast";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";

type Rider = {
    id: string;
    full_name: string;
    phone_number: string;
    bike_reg: string | null;
    image_url: string | null;
    is_active: boolean;
    created_at: string;
};

type RiderForm = {
    full_name: string;
    phone_number: string;
    bike_reg: string;
    image_url: string;
};

const EMPTY_FORM: RiderForm = { full_name: "", phone_number: "", bike_reg: "", image_url: "" };

export function RidersTab() {
    const [riders, setRiders] = useState<Rider[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<RiderForm>(EMPTY_FORM);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<RiderForm>(EMPTY_FORM);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetch = async () => {
        setLoading(true);
        const { data } = await supabase.from("riders").select("*").order("full_name");
        if (data) setRiders(data);
        setLoading(false);
    };

    useEffect(() => { fetch(); }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.full_name || !form.phone_number) return;
        setSaving(true);
        const { error } = await supabase.from("riders").insert([{
            full_name: form.full_name,
            phone_number: form.phone_number,
            bike_reg: form.bike_reg || null,
            image_url: form.image_url || null,
            is_active: true,
        }]);
        if (error) {
            toast.error("Failed to add rider.");
        } else {
            toast.success("Rider added.");
            setForm(EMPTY_FORM);
            setIsAdding(false);
            await fetch();
        }
        setSaving(false);
    };

    const startEdit = (r: Rider) => {
        setEditingId(r.id);
        setEditForm({
            full_name: r.full_name,
            phone_number: r.phone_number,
            bike_reg: r.bike_reg || "",
            image_url: r.image_url || "",
        });
    };

    const handleSaveEdit = async (id: string) => {
        setSaving(true);
        const { error } = await supabase.from("riders").update({
            full_name: editForm.full_name,
            phone_number: editForm.phone_number,
            bike_reg: editForm.bike_reg || null,
            image_url: editForm.image_url || null,
        }).eq("id", id);
        if (error) {
            toast.error("Failed to update rider.");
        } else {
            toast.success("Rider updated.");
            setEditingId(null);
            await fetch();
        }
        setSaving(false);
    };

    const toggleActive = async (id: string, is_active: boolean) => {
        setRiders(prev => prev.map(r => r.id === id ? { ...r, is_active: !is_active } : r));
        await supabase.from("riders").update({ is_active: !is_active }).eq("id", id);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from("riders").delete().eq("id", id);
        if (error) {
            toast.error("Failed to delete rider.");
        } else {
            toast.success("Rider removed.");
            setRiders(prev => prev.filter(r => r.id !== id));
        }
        setConfirmDeleteId(null);
    };

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest">Rider Profiles</h2>
                    <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-widest">Manage delivery riders for dispatch assignment.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    <Plus size={13} /> {isAdding ? "Cancel" : "Add Rider"}
                </button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <form onSubmit={handleAdd} className="bg-white border border-neutral-200 p-8 space-y-6">
                    <h3 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-100 pb-4">New Rider</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Full Name *</label>
                                <input type="text" required value={form.full_name}
                                    onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                    placeholder="Kwame Asante" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Phone Number *</label>
                                <input type="text" required value={form.phone_number}
                                    onChange={e => setForm(p => ({ ...p, phone_number: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                    placeholder="+233 20 000 0000" />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Bike Registration</label>
                                <input type="text" value={form.bike_reg}
                                    onChange={e => setForm(p => ({ ...p, bike_reg: e.target.value }))}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors"
                                    placeholder="GR-1234-23" />
                            </div>
                        </div>
                        <div>
                            <ImageUploader
                                bucket="product-images"
                                folder="riders"
                                currentUrl={form.image_url || null}
                                onUpload={(url) => setForm(p => ({ ...p, image_url: url }))}
                                aspectRatio="square"
                                label="Rider Photo"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end border-t border-neutral-100 pt-6">
                        <button type="submit" disabled={saving}
                            className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50">
                            {saving ? "Saving..." : "Add Rider"}
                        </button>
                    </div>
                </form>
            )}

            {/* Table */}
            <div className="bg-white border border-neutral-200 overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500 w-16">Photo</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Name</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Phone</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Bike Reg</th>
                            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">Status</th>
                            <th className="px-6 py-4 w-20"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-400 italic font-serif">Loading...</td></tr>
                        ) : riders.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-400 italic font-serif">No riders yet. Add your first above.</td></tr>
                        ) : riders.map(rider =>
                            editingId === rider.id ? (
                                <tr key={rider.id} className="bg-neutral-50">
                                    <td className="px-6 py-4">
                                        <div className="w-12 h-12">
                                            <ImageUploader
                                                bucket="product-images" folder="riders"
                                                currentUrl={editForm.image_url || null}
                                                onUpload={(url) => setEditForm(p => ({ ...p, image_url: url }))}
                                                aspectRatio="square" label="" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input value={editForm.full_name}
                                            onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                                            className="border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black w-full" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input value={editForm.phone_number}
                                            onChange={e => setEditForm(p => ({ ...p, phone_number: e.target.value }))}
                                            className="border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black w-full" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input value={editForm.bike_reg}
                                            onChange={e => setEditForm(p => ({ ...p, bike_reg: e.target.value }))}
                                            className="border-b border-neutral-300 bg-transparent py-1 outline-none focus:border-black w-full font-mono text-xs" />
                                    </td>
                                    <td className="px-6 py-4 text-xs text-neutral-400 italic">editing</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 justify-end">
                                            <button onClick={() => handleSaveEdit(rider.id)} disabled={saving}
                                                className="text-green-600 hover:text-green-800 disabled:opacity-50"><Check size={16} /></button>
                                            <button onClick={() => setEditingId(null)}
                                                className="text-neutral-400 hover:text-black"><X size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                <tr key={rider.id} className="hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="w-10 h-10 bg-neutral-100 overflow-hidden flex-shrink-0">
                                            {rider.image_url
                                                ? <img src={rider.image_url} alt={rider.full_name} className="w-full h-full object-cover" />
                                                : <div className="w-full h-full bg-neutral-200 flex items-center justify-center text-[10px] text-neutral-400 uppercase">{rider.full_name.charAt(0)}</div>
                                            }
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium">{rider.full_name}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-neutral-600">{rider.phone_number}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-neutral-500">{rider.bike_reg || "—"}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => toggleActive(rider.id, rider.is_active)}
                                            className={`px-2 py-1 text-[10px] uppercase tracking-widest rounded ${rider.is_active ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                                            {rider.is_active ? "Active" : "Inactive"}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 justify-end">
                                            {confirmDeleteId === rider.id ? (
                                                <>
                                                    <button onClick={() => handleDelete(rider.id)}
                                                        className="text-xs uppercase tracking-widest text-red-600 hover:text-red-800 font-semibold">Yes</button>
                                                    <button onClick={() => setConfirmDeleteId(null)}
                                                        className="text-xs uppercase tracking-widest text-neutral-400 hover:text-black">No</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(rider)}
                                                        className="text-neutral-400 hover:text-black transition-colors"><Pencil size={14} /></button>
                                                    <button onClick={() => setConfirmDeleteId(rider.id)}
                                                        className="text-neutral-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
