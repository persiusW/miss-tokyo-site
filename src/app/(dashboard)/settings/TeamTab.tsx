"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { X, Mail, UserPlus } from "lucide-react";

type TeamMember = {
    id: string;
    email: string;
    full_name?: string | null;
    role: string;
    created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    sales_staff: "Sales Staff",
};

const ROLE_COLORS: Record<string, string> = {
    owner: "bg-neutral-900 text-white",
    admin: "bg-neutral-800 text-white",
    sales_staff: "bg-neutral-100 text-neutral-700",
};

export function TeamTab() {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<"admin" | "sales_staff">("sales_staff");
    const [inviting, setInviting] = useState(false);

    const fetchTeam = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("profiles")
            .select("id, email, full_name, role, created_at")
            .in("role", ["owner", "admin", "sales_staff"])
            .order("created_at", { ascending: true });
        setMembers(data ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchTeam(); }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        try {
            const res = await fetch("/api/admin/invite-team", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Invite failed");
            toast.success(`Invitation sent to ${inviteEmail}`);
            setShowModal(false);
            setInviteEmail("");
            setInviteRole("sales_staff");
            fetchTeam();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setInviting(false);
        }
    };

    const handleRemove = async (member: TeamMember) => {
        if (member.role === "owner" || member.role === "admin") {
            toast.error("Admin and owner accounts cannot be removed.");
            return;
        }
        if (!confirm(`Remove ${member.email} from the team? They will lose dashboard access.`)) return;
        const { error } = await supabase
            .from("profiles")
            .update({ role: null })
            .eq("id", member.id);
        if (error) { toast.error("Failed to remove member."); return; }
        toast.success("Team member removed.");
        fetchTeam();
    };

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Permission Levels */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1">Permission Levels</h2>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Role-based access control for your atelier console</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors rounded-lg"
                    >
                        <UserPlus size={14} />
                        Invite Member
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { role: "Owner", desc: "Full system access. Cannot be removed.", badge: "bg-neutral-900 text-white" },
                        { role: "Admin", desc: "Full access to all sections and settings. Cannot be removed.", badge: "bg-neutral-800 text-white" },
                        { role: "Sales Staff", desc: "Access to Products, Sales, and Customers only.", badge: "bg-neutral-100 text-neutral-700" },
                    ].map(({ role, desc, badge }) => (
                        <div key={role} className="p-4 rounded-xl bg-neutral-50 space-y-2">
                            <span className={`inline-block text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-md ${badge}`}>{role}</span>
                            <p className="text-[10px] text-neutral-400 tracking-wider leading-relaxed uppercase">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Team table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">
                        {members.length} {members.length === 1 ? "member" : "members"}
                    </p>
                </div>

                {loading ? (
                    <p className="px-8 py-10 text-neutral-400 italic font-serif">Loading team...</p>
                ) : members.length === 0 ? (
                    <p className="px-8 py-10 text-neutral-400 italic font-serif">No team members yet.</p>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-neutral-100 bg-neutral-50">
                                <th className="px-6 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Member</th>
                                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Role</th>
                                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Joined</th>
                                <th className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(member => (
                                <tr key={member.id} className="border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold">{member.full_name || "—"}</p>
                                        <p className="text-[10px] text-neutral-400 tracking-wide">{member.email}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-md ${ROLE_COLORS[member.role] || "bg-neutral-100"}`}>
                                            {ROLE_LABELS[member.role] || member.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-[11px] text-neutral-500">
                                        {new Date(member.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {member.role === "sales_staff" && (
                                            <button
                                                onClick={() => handleRemove(member)}
                                                className="text-[10px] uppercase tracking-widest text-neutral-400 hover:text-rose-600 transition-colors font-semibold"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Invite Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-neutral-200 shadow-2xl">
                        <div className="px-8 py-5 border-b border-neutral-100 flex items-center justify-between">
                            <h2 className="font-serif text-lg tracking-widest uppercase">Invite Team Member</h2>
                            <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-black">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleInvite} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                                    placeholder="staff@misstokyo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Role</label>
                                <select
                                    value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value as "admin" | "sales_staff")}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors appearance-none"
                                >
                                    <option value="sales_staff">Sales Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">
                                    {inviteRole === "sales_staff"
                                        ? "Access to Products, Sales, and Customers only."
                                        : "Full access to all sections and settings."}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 border border-neutral-200 text-xs uppercase tracking-widest hover:bg-neutral-50 transition-colors rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviting}
                                    className="flex-1 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg"
                                >
                                    <Mail size={12} />
                                    {inviting ? "Sending..." : "Send Invite"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
