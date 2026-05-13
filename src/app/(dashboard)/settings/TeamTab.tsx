"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { X, Mail, UserPlus, CheckCircle, Clock, KeyRound } from "lucide-react";
import { inviteTeamMember, removeTeamMember, sendPasswordResetLink } from "@/app/(dashboard)/settings/actions";

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
    details?: {
       resource_name?: string;
       order_number?: string;
       rider_name?: string;
       previous_status?: string;
       new_status?: string;
       changes?: Record<string, { from: any; to: any }>;
    };
    created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    sales_staff: "Sales Staff"
};

const ACTION_LABELS: Record<string, string> = {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
    CREATE_DISCOUNT: "Discount Created",
    TOGGLE_DISCOUNT: "Discount Toggled",
    DELETE_DISCOUNT: "Discount Deleted",
    CREATE_AUTO_DISCOUNT: "Auto-Discount Created",
    UPDATE_AUTO_DISCOUNT: "Auto-Discount Updated",
    TOGGLE_AUTO_DISCOUNT: "Auto-Discount Toggled",
    DELETE_AUTO_DISCOUNT: "Auto-Discount Deleted",
    PACKED_ORDER: "Packed",
    DISPATCHED_ORDER: "Dispatched",
    DELIVERED_ORDER: "Delivered",
    ASSIGNED_RIDER: "Rider Assigned",
    UPDATE_STATUS: "Status Updated",
    INVITE: "Invited",
    REMOVE_MEMBER: "Removed",
    RESET_PASSWORD: "Password Reset",
    SIGN_IN: "Signed In",
};

function getActionColor(actionType: string): string {
    if (["CREATE", "CREATE_DISCOUNT", "CREATE_AUTO_DISCOUNT"].includes(actionType)) return "bg-green-50 text-green-700";
    if (["DELETE", "DELETE_DISCOUNT", "DELETE_AUTO_DISCOUNT", "REMOVE_MEMBER"].includes(actionType)) return "bg-red-50 text-red-700";
    if (["UPDATE", "UPDATE_AUTO_DISCOUNT", "UPDATE_STATUS", "TOGGLE_DISCOUNT", "TOGGLE_AUTO_DISCOUNT"].includes(actionType)) return "bg-blue-50 text-blue-700";
    if (["SIGN_IN"].includes(actionType)) return "bg-purple-50 text-purple-700";
    return "bg-neutral-100 text-neutral-700";
}

function getPageLabel(actionType: string, resource?: string): string {
    if (["PACKED_ORDER", "DISPATCHED_ORDER", "DELIVERED_ORDER", "ASSIGNED_RIDER", "UPDATE_STATUS"].includes(actionType)) return "Orders";
    if (["CREATE_DISCOUNT", "TOGGLE_DISCOUNT", "DELETE_DISCOUNT"].includes(actionType)) return "Discounts";
    if (["CREATE_AUTO_DISCOUNT", "UPDATE_AUTO_DISCOUNT", "TOGGLE_AUTO_DISCOUNT", "DELETE_AUTO_DISCOUNT"].includes(actionType)) return "Auto Discounts";
    if (["CREATE", "UPDATE", "DELETE"].includes(actionType)) {
        if (resource === "category") return "Categories";
        return "Products";
    }
    if (["INVITE", "REMOVE_MEMBER", "RESET_PASSWORD"].includes(actionType)) return "Team";
    if (actionType === "SIGN_IN") return "Session";
    return "—";
}

function getSummary(log: any): string {
    const d = log.details ?? {};
    switch (log.action_type) {
        case "PACKED_ORDER":         return `Packed Order #${d.order_number ?? "—"}`;
        case "ASSIGNED_RIDER":       return `Assigned Order #${d.order_number ?? "—"} to ${d.rider_name ?? "Rider"}`;
        case "DISPATCHED_ORDER":     return `Dispatched Order #${d.order_number ?? "—"}`;
        case "DELIVERED_ORDER":      return `Delivered Order #${d.order_number ?? "—"}`;
        case "UPDATE_STATUS":        return `Order #${d.order_number ?? "—"}: ${d.previous_status ?? d.new_fulfillment_status ?? "?"} → ${d.new_status ?? "?"}`;
        case "CREATE_DISCOUNT":      return `Created discount ${d.code ?? "—"}`;
        case "TOGGLE_DISCOUNT":      return `${d.is_active ? "Enabled" : "Disabled"} discount ${d.code ?? "—"}`;
        case "DELETE_DISCOUNT":      return `Deleted discount ${d.code ?? "—"}`;
        case "CREATE_AUTO_DISCOUNT": return `Created auto-discount: ${d.title ?? "—"}`;
        case "UPDATE_AUTO_DISCOUNT": return `Updated auto-discount: ${d.title ?? "—"}`;
        case "TOGGLE_AUTO_DISCOUNT": return `${d.is_active ? "Enabled" : "Disabled"} auto-discount: ${d.title ?? "—"}`;
        case "DELETE_AUTO_DISCOUNT": return `Deleted auto-discount: ${d.title ?? "—"}`;
        case "INVITE":               return `Invited ${d.email ?? "—"} as ${d.role ?? "—"}`;
        case "REMOVE_MEMBER":        return `Removed team member`;
        case "RESET_PASSWORD":       return `Sent password reset to ${d.target_email ?? "—"}`;
        case "SIGN_IN":              return `Signed in`;
        default:                     return d.resource_name ?? log.resource ?? "—";
    }
}

const ROLE_COLORS: Record<string, string> = {
    owner: "bg-black text-white",
    admin: "bg-neutral-800 text-white",
    sales_staff: "bg-neutral-100 text-neutral-700"
};

const DASHBOARD_ROLES = ["owner", "admin", "sales_staff"] as const;

export function TeamTab() {
    const router = useRouter();
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

    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Filter states
    const [filterUserId, setFilterUserId] = useState<string>("all");
    const [filterAction, setFilterAction] = useState<string>("all");
    const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [allStaff, setAllStaff] = useState<{ id: string, full_name: string }[]>([]);

    // Pagination states
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    const fetchData = async (isLoadMore = false) => {
        if (!isLoadMore) setLoading(true);
        if (activeTab === "members") {
            const { data } = await supabase
                .from("profiles")
                .select("id, email, full_name, role, created_at")
                .in("role", DASHBOARD_ROLES)
                .order("created_at", { ascending: true });
            if (data) {
                setMembers(data);
            }
        } else if (activeTab === "pending") {
            const { data } = await supabase
                .from("team_invitations")
                .select("*")
                .eq("status", "pending")
                .order("created_at", { ascending: false });
            if (data) setInvites(data);
        } else if (activeTab === "logs") {
            const startOfDay = `${filterDate}T00:00:00.000Z`;
            const endOfDay = `${filterDate}T23:59:59.999Z`;

            let query = supabase
                .from("activity_logs")
                .select("*")
                .gte("created_at", startOfDay)
                .lte("created_at", endOfDay)
                .order("created_at", { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (filterUserId !== "all") {
                query = query.eq("user_id", filterUserId);
            }
            if (filterAction !== "all") {
                query = query.eq("action_type", filterAction);
            }

            const { data, error: logsError } = await query;
            if (logsError) {
                console.error("[activity-logs] fetch failed:", logsError.message);
            }
            if (data) {
                if (isLoadMore) {
                    setLogs(prev => [...prev, ...data as any]);
                } else {
                    setLogs(data as any);
                }
                setHasMore(data.length === PAGE_SIZE);
            }
        }
        if (!isLoadMore) setLoading(false);
    };

    useEffect(() => {
        setPage(0); // Reset page on filter change
        fetchData();
    }, [activeTab, filterUserId, filterAction, filterDate]);

    // Handle Load More
    useEffect(() => {
        if (page > 0) {
            fetchData(true);
        }
    }, [page]);

    // Fetch staff list for logs filter — dashboard roles only, independent of active tab
    useEffect(() => {
        const fetchStaff = async () => {
            const { data } = await supabase
                .from("profiles")
                .select("id, full_name, email, role")
                .in("role", DASHBOARD_ROLES)
                .order("full_name", { ascending: true });
            if (data) {
                setAllStaff(data.map((d: any) => ({ id: d.id, full_name: d.full_name || d.email })));
            }
        };
        fetchStaff();
    }, []); // empty deps — runs once on mount

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        
        try {
            const res = await inviteTeamMember({
                fullName: inviteName,
                email: inviteEmail,
                phone: invitePhone || undefined,
                role: inviteRole
            });

            if (!res.success) {
                toast.error(res.error || "Invite failed");
            } else {
                if (res.warning) {
                    toast.error(res.warning); // the custom toast component maps this as an error/alert visually
                } else {
                    toast.success(`Invitation sent to ${inviteEmail}`);
                }
                setShowModal(false);
                setInviteEmail("");
                setInviteName("");
                setInvitePhone("");
                if (activeTab === "pending") fetchData();
            }
        } catch (err: any) {
            toast.error("An unexpected error occurred while sending the invite.");
            console.error(err);
        } finally {
            setInviting(false);
        }
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

    const [removingId, setRemovingId] = useState<string | null>(null);
    const [sendingResetId, setSendingResetId] = useState<string | null>(null);

    const handleSendReset = async (member: TeamMember) => {
        if (!confirm(`Send a password reset link to ${member.email}?`)) return;
        setSendingResetId(member.id);
        try {
            const res = await sendPasswordResetLink(member.email);
            if (!res.success) {
                toast.error(res.error || "Failed to send reset link.");
            } else {
                toast.success(`Reset link sent to ${member.email}.`);
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setSendingResetId(null);
        }
    };

    const handleRemove = async (member: TeamMember) => {
        if (member.role === "owner" || member.role === "admin") {
            toast.error("Admin and owner accounts cannot be removed.");
            return;
        }
        if (!confirm(`Remove ${member.email} from the team? They will lose dashboard access.`)) return;
        
        setRemovingId(member.id);
        try {
            const res = await removeTeamMember(member.id);
            if (!res.success) {
                toast.error(res.error || "Failed to remove member.");
            } else {
                toast.success("Team member removed.");
                router.refresh();
                fetchData();
            }
        } catch (err: any) {
            toast.error("An unexpected error occurred.");
            console.error(err);
        } finally {
            setRemovingId(null);
        }
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
                                                <div className="flex items-center justify-end gap-3">
                                                    <button
                                                        onClick={() => handleSendReset(member)}
                                                        disabled={sendingResetId === member.id}
                                                        title="Send password reset link"
                                                        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400 hover:text-black transition-colors disabled:opacity-50"
                                                    >
                                                        <KeyRound size={12} />
                                                        {sendingResetId === member.id ? "Sending..." : "Reset"}
                                                    </button>
                                                    {(member.role !== "owner" && member.role !== "admin") && (
                                                        <button
                                                            onClick={() => handleRemove(member)}
                                                            disabled={removingId === member.id}
                                                            className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                        >
                                                            {removingId === member.id ? "Removing..." : "Remove"}
                                                        </button>
                                                    )}
                                                </div>
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
                    <div className="space-y-4">
                        {/* Filters Bar */}
                        <div className="px-8 py-4 bg-neutral-50 border-b border-neutral-100 flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Date:</label>
                                <input 
                                    type="date"
                                    value={filterDate}
                                    onChange={e => setFilterDate(e.target.value)}
                                    className="bg-transparent text-sm border-b border-neutral-300 outline-none focus:border-black py-1 cursor-pointer"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Staff:</label>
                                <select 
                                    value={filterUserId} 
                                    onChange={e => setFilterUserId(e.target.value)}
                                    className="bg-transparent text-sm border-b border-neutral-300 outline-none focus:border-black py-1 cursor-pointer"
                                >
                                    <option value="all">All Members</option>
                                    {allStaff.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-400">Action:</label>
                                <select 
                                    value={filterAction} 
                                    onChange={e => setFilterAction(e.target.value)}
                                    className="bg-transparent text-sm border-b border-neutral-300 outline-none focus:border-black py-1 cursor-pointer"
                                >
                                    <option value="all">All Actions</option>
                                    <optgroup label="Orders">
                                        <option value="PACKED_ORDER">Packed</option>
                                        <option value="DISPATCHED_ORDER">Dispatched</option>
                                        <option value="DELIVERED_ORDER">Delivered</option>
                                        <option value="ASSIGNED_RIDER">Rider Assigned</option>
                                        <option value="UPDATE_STATUS">Status Updated</option>
                                    </optgroup>
                                    <optgroup label="Discounts">
                                        <option value="CREATE_DISCOUNT">Discount Created</option>
                                        <option value="TOGGLE_DISCOUNT">Discount Toggled</option>
                                        <option value="DELETE_DISCOUNT">Discount Deleted</option>
                                        <option value="CREATE_AUTO_DISCOUNT">Auto-Discount Created</option>
                                        <option value="UPDATE_AUTO_DISCOUNT">Auto-Discount Updated</option>
                                        <option value="TOGGLE_AUTO_DISCOUNT">Auto-Discount Toggled</option>
                                        <option value="DELETE_AUTO_DISCOUNT">Auto-Discount Deleted</option>
                                    </optgroup>
                                    <optgroup label="Catalog">
                                        <option value="CREATE">Product/Category Created</option>
                                        <option value="UPDATE">Product/Category Updated</option>
                                        <option value="DELETE">Category Deleted</option>
                                    </optgroup>
                                    <optgroup label="Team">
                                        <option value="INVITE">Invited</option>
                                        <option value="REMOVE_MEMBER">Removed</option>
                                        <option value="RESET_PASSWORD">Password Reset</option>
                                        <option value="SIGN_IN">Sign In</option>
                                    </optgroup>
                                </select>
                            </div>
                            <button 
                                onClick={() => { 
                                    setFilterUserId("all"); 
                                    setFilterAction("all");
                                    setFilterDate(new Date().toISOString().split('T')[0]);
                                }}
                                className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-black transition-colors"
                            >
                                Reset Filters
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            {loading ? (
                                <p className="px-8 py-10 text-neutral-400 italic">Updating log view...</p>
                            ) : logs.length === 0 ? (
                                <p className="px-8 py-10 text-neutral-400 italic">No logs found matching your criteria.</p>
                            ) : (
                                <table className="w-full text-left bg-white">
                                    <thead className="bg-neutral-50/50 border-b border-neutral-100">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Timestamp</th>
                                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Staff Member</th>
                                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Action</th>
                                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Page</th>
                                            <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-50 text-sm">
                                        {logs.map(log => {
                                            const isExpanded = expandedLogId === log.id;
                                            const summary = getSummary(log);
                                            return (
                                                <tr
                                                    key={log.id}
                                                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            setExpandedLogId(isExpanded ? null : log.id);
                                                        }
                                                    }}
                                                    tabIndex={0}
                                                    aria-expanded={isExpanded}
                                                    className={`hover:bg-neutral-50 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:ring-inset ${isExpanded ? 'bg-neutral-50/70' : ''}`}
                                                >
                                                    <td className="px-6 py-3 text-neutral-500 text-[11px] whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-neutral-300 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} style={{ fontSize: '8px' }}>▶</span>
                                                            {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap">
                                                        <div className="font-semibold text-neutral-900">{allStaff.find(s => s.id === log.user_id)?.full_name || "Unknown"}</div>
                                                        <div className="text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5">{ROLE_LABELS[log.user_role] || log.user_role}</div>
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap">
                                                        <span className={`font-mono text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${getActionColor(log.action_type)}`}>
                                                            {ACTION_LABELS[log.action_type] || log.action_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 whitespace-nowrap">
                                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                                                            {getPageLabel(log.action_type, log.resource)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 min-w-[260px]">
                                                        <div className="text-sm text-neutral-700">{summary}</div>
                                                        {isExpanded && (
                                                            <div className="mt-2 space-y-1 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                                                                {log.details?.changes && Object.entries(log.details.changes).map(([field, delta]: [string, any]) => (
                                                                    <div key={field} className="text-[11px] flex flex-wrap items-center gap-x-2">
                                                                        <span className="font-semibold text-neutral-500 capitalize">{field.replace(/_/g, ' ')}:</span>
                                                                        <span className="text-red-500 line-through decoration-red-300 opacity-60">
                                                                            {typeof delta.from === 'object' ? 'Data' : String(delta.from ?? 'null')}
                                                                        </span>
                                                                        <span className="text-neutral-400">→</span>
                                                                        <span className="text-green-600 font-medium">
                                                                            {typeof delta.to === 'object' ? 'Data' : String(delta.to ?? 'null')}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                {!log.details?.changes && log.details && (
                                                                    <div className="text-[11px] text-neutral-500 space-y-0.5">
                                                                        {Object.entries(log.details)
                                                                            .filter(([k]) => !['resource_name', 'changes'].includes(k))
                                                                            .map(([k, v]) => (
                                                                                <div key={k}>
                                                                                    <span className="font-semibold capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                                                                                    <span>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</span>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}

                            {hasMore && logs.length >= PAGE_SIZE && (
                                <div className="p-6 border-t border-neutral-50 flex justify-center">
                                    <button
                                        onClick={() => setPage(prev => prev + 1)}
                                        className="px-6 py-2 border border-neutral-200 text-[10px] uppercase tracking-widest font-semibold hover:bg-neutral-50 transition-colors rounded-lg"
                                    >
                                        Load More
                                    </button>
                                </div>
                            )}
                        </div>
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
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors cursor-pointer appearance-none"
                                >
                                    <option value="sales_staff">Sales Staff</option>
                                    <option value="admin">Admin</option>
                                    <option value="owner">Owner</option>
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
