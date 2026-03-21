"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { X, Mail, UserPlus, CheckCircle, Clock } from "lucide-react";
import { inviteTeamMember } from "@/app/(dashboard)/settings/actions";

type TeamMember = {
    id: string;
    email: string;
    full_name?: string | null;
    role: string;
    created_at: string;
};

type PendingInvite = {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    created_at: string;
};

type ActivityLog = {
    id: string;
    user_id: string;
    user_role: string;
    action_type: string;
    resource: string;
    created_at: string;
    profiles?: { full_name: string; email: string };
};

const ROLE_LABELS: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    sales_staff: "Sales Staff",
    rider: "Rider",
    support: "Support",
    content_editor: "Content Editor"
};

const ROLE_COLORS: Record<string, string> = {
    owner: "bg-neutral-900 text-white",
    admin: "bg-neutral-800 text-white",
    sales_staff: "bg-neutral-100 text-neutral-700",
    rider: "bg-blue-100 text-blue-700",
    support: "bg-purple-100 text-purple-700",
    content_editor: "bg-emerald-100 text-emerald-700"
};

export function TeamTab() {
    const [activeTab, setActiveTab] = useState<"members" | "pending" | "logs">("members");
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<PendingInvite[]>([]);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [showModal, setShowModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteName, setInviteName] = useState("");
    const [invitePhone, setInvitePhone] = useState("");
    const [inviteRole, setInviteRole] = useState("sales_staff");
    const [inviting, setInviting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        if (activeTab === "members") {
            const { data } = await supabase
                .from("profiles")
                .select("id, email, full_name, role, created_at")
                .order("created_at", { ascending: true });
            if (data) setMembers(data);
        } else if (activeTab === "pending") {
            const { data } = await supabase
                .from("team_invitations")
                .select("*")
                .eq("status", "pending")
                .order("created_at", { ascending: false });
            if (data) setInvites(data);
        } else if (activeTab === "logs") {
            const { data } = await supabase
                .from("activity_logs")
                .select(`
                    id, user_id, user_role, action_type, resource, created_at,
                    profiles:user_id ( full_name, email )
                `)
                .order("created_at", { ascending: false })
                .limit(50);
            if (data) setLogs(data as any);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        
        const res = await inviteTeamMember({
            fullName: inviteName,
            email: inviteEmail,
            phone: invitePhone || undefined,
            role: inviteRole
        });

        if (!res.success) {
            toast.error(res.error || "Invite failed");
        } else {
            toast.success(`Invitation sent to ${inviteEmail}`);
            setShowModal(false);
            setInviteEmail("");
            setInviteName("");
            setInvitePhone("");
            if (activeTab === "pending") fetchData();
        }
        setInviting(false);
    };

    const handleRevoke = async (id: string, email: string) => {
        if (!confirm(`Revoke invitation for ${email}?`)) return;
        const { error } = await supabase
            .from("team_invitations")
            .update({ status: "revoked" })
            .eq("id", id);
        if (error) { toast.error("Failed to revoke invite."); return; }
        toast.success("Invitation revoked.");
        fetchData();
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
        fetchData();
    };

    return (
        <div className="space-y-8 max-w-5xl">
            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => setActiveTab("members")}
                        className={`text-xs uppercase tracking-widest font-semibold pb-4 border-b-2 transition-colors ${activeTab === 'members' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`}
                    >
                        Active Members
                    </button>
                    <button 
                        onClick={() => setActiveTab("pending")}
                        className={`text-xs uppercase tracking-widest font-semibold pb-4 border-b-2 transition-colors ${activeTab === 'pending' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`}
                    >
                        Pending Invites
                    </button>
                    <button 
                        onClick={() => setActiveTab("logs")}
                        className={`text-xs uppercase tracking-widest font-semibold pb-4 border-b-2 transition-colors ${activeTab === 'logs' ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-black'}`}
                    >
                        Activity Logs
                    </button>
                </div>
                
                {(activeTab === "members" || activeTab === "pending") && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-[10px] md:text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors rounded-lg whitespace-nowrap"
                    >
                        <UserPlus size={14} />
                        Invite Member
                    </button>
                )}
            </div>

            {/* Content areas based on tab */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
                
                {/* ACTIVE MEMBERS TAB */}
                {activeTab === "members" && (
                    <div className="overflow-x-auto">
                        {loading ? (
                            <p className="px-8 py-10 text-neutral-400 italic">Loading active members...</p>
                        ) : members.length === 0 ? (
                            <p className="px-8 py-10 text-neutral-400 italic">No team members yet.</p>
                        ) : (
                            <table className="w-full text-left bg-white">
                                <thead className="bg-neutral-50 border-b border-neutral-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">User</th>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Role</th>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Joined</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-50 text-sm">
                                    {members.map(member => (
                                        <tr key={member.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-neutral-900">{member.full_name || "—"}</div>
                                                <div className="text-[11px] text-neutral-500 font-mono tracking-tight mt-0.5">{member.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-md ${ROLE_COLORS[member.role] || "bg-neutral-100 text-neutral-700"}`}>
                                                    {ROLE_LABELS[member.role] || member.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-500 text-[11px]">
                                                {new Date(member.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(member.role !== "owner" && member.role !== "admin") && (
                                                    <button 
                                                        onClick={() => handleRemove(member)}
                                                        className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors"
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
                )}

                {/* PENDING INVITES TAB */}
                {activeTab === "pending" && (
                    <div className="overflow-x-auto">
                        {loading ? (
                            <p className="px-8 py-10 text-neutral-400 italic">Loading pending invitations...</p>
                        ) : invites.length === 0 ? (
                            <p className="px-8 py-10 text-neutral-400 italic">No pending invitations.</p>
                        ) : (
                            <table className="w-full text-left bg-white">
                                <thead className="bg-neutral-50 border-b border-neutral-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Invitee</th>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Role</th>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Sent on</th>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-50 text-sm">
                                    {invites.map(invite => (
                                        <tr key={invite.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-neutral-900 flex items-center gap-2">
                                                    {invite.full_name}
                                                    <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                                                </div>
                                                <div className="text-[11px] text-neutral-500 font-mono tracking-tight mt-0.5">{invite.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-md ${ROLE_COLORS[invite.role] || "bg-neutral-100 text-neutral-700"}`}>
                                                    {ROLE_LABELS[invite.role] || invite.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-500 text-[11px]">
                                                {new Date(invite.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleRevoke(invite.id, invite.email)}
                                                    className="text-[10px] font-semibold uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors bg-rose-50 px-3 py-1.5 rounded-md"
                                                >
                                                    Revoke
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ACTIVITY LOGS TAB */}
                {activeTab === "logs" && (
                    <div className="overflow-x-auto">
                        {loading ? (
                            <p className="px-8 py-10 text-neutral-400 italic">Loading activity logs...</p>
                        ) : logs.length === 0 ? (
                            <p className="px-8 py-10 text-neutral-400 italic">No recent activity logged by staff.</p>
                        ) : (
                            <table className="w-full text-left bg-white">
                                <thead className="bg-neutral-50 border-b border-neutral-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Timestamp</th>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Staff Member</th>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Action</th>
                                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Resource</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-50 text-sm">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                                            <td className="px-6 py-4 text-neutral-500 text-[11px]">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-neutral-900">{log.profiles?.full_name || "Unknown"}</div>
                                                <div className="text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5">{ROLE_LABELS[log.user_role] || log.user_role}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs font-semibold px-2 py-1 bg-neutral-100 rounded text-neutral-700 uppercase tracking-wider">
                                                    {log.action_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-neutral-600 font-medium">
                                                {log.resource}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-neutral-200 shadow-2xl">
                        <div className="px-8 py-5 border-b border-neutral-100 flex items-center justify-between">
                            <h2 className="font-serif text-lg tracking-widest uppercase">Invite New Member</h2>
                            <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-black">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleInvite} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={inviteName}
                                    onChange={e => setInviteName(e.target.value)}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                                    placeholder="Ama Staff"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                                    placeholder="ama@misstokyo.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Phone Number (Optional)</label>
                                <input
                                    type="text"
                                    value={invitePhone}
                                    onChange={e => setInvitePhone(e.target.value)}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                                    placeholder="+233..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Role Assignment</label>
                                <select
                                    value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value)}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors appearance-none"
                                >
                                    <option value="admin">Admin</option>
                                    <option value="sales_staff">Sales Staff</option>
                                    <option value="rider">Rider</option>
                                    <option value="content_editor">Content Editor</option>
                                    <option value="support">Support</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3 pt-4">
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
