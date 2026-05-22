"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
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

function getActionBadgeClass(actionType: string): string {
    if (["CREATE", "CREATE_DISCOUNT", "CREATE_AUTO_DISCOUNT"].includes(actionType)) return "ac-badge-ok";
    if (["DELETE", "DELETE_DISCOUNT", "DELETE_AUTO_DISCOUNT", "REMOVE_MEMBER"].includes(actionType)) return "ac-badge-danger";
    if (["UPDATE", "UPDATE_AUTO_DISCOUNT", "UPDATE_STATUS", "TOGGLE_DISCOUNT", "TOGGLE_AUTO_DISCOUNT"].includes(actionType)) return "ac-badge-processing";
    if (["SIGN_IN"].includes(actionType)) return "ac-badge-packed";
    return "ac-badge-inactive";
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

const ROLE_BADGE_CLASS: Record<string, string> = {
    owner: "ac-badge ac-badge-role-owner",
    admin: "ac-badge ac-badge-role-admin",
    sales_staff: "ac-badge ac-badge-role-staff",
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
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1000 }}>
            {/* Header / Tabs */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                <div className="ac-tabs" style={{ flex: 1, minWidth: 0 }}>
                    <button className={`ac-tab${activeTab === 'members' ? ' active' : ''}`} onClick={() => setActiveTab("members")}>
                        Active Members
                    </button>
                    <button className={`ac-tab${activeTab === 'pending' ? ' active' : ''}`} onClick={() => setActiveTab("pending")}>
                        Pending Invites
                    </button>
                    <button className={`ac-tab${activeTab === 'logs' ? ' active' : ''}`} onClick={() => setActiveTab("logs")}>
                        Activity Logs
                    </button>
                </div>
                {(activeTab === "members" || activeTab === "pending") && (
                    <button onClick={() => setShowModal(true)} className="ac-btn ac-btn-primary" style={{ marginBottom: 1, flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                        Invite Member
                    </button>
                )}
            </div>

            {/* Content areas based on tab */}
            <div className="ac-card" style={{ overflow: "hidden", padding: 0 }}>
                
                {/* ACTIVE MEMBERS TAB */}
                {activeTab === "members" && (
                    <div style={{ overflowX: "auto" }}>
                        {loading ? (
                            <div className="ac-empty"><p className="ac-empty-title">Loading active members...</p></div>
                        ) : members.length === 0 ? (
                            <div className="ac-empty"><p className="ac-empty-title">No team members yet.</p></div>
                        ) : (
                            <table className="ac-table" style={{ width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Joined</th>
                                        <th className="r"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map(member => (
                                        <tr key={member.id}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: "var(--ac-ink)", fontSize: 13 }}>{member.full_name || "—"}</div>
                                                <div style={{ fontSize: 11, color: "var(--ac-ink-3)", fontFamily: "var(--f-mono)", marginTop: 2 }}>{member.email}</div>
                                            </td>
                                            <td>
                                                <span className={ROLE_BADGE_CLASS[member.role] || "ac-badge ac-badge-role-staff"}>
                                                    {ROLE_LABELS[member.role] || member.role}
                                                </span>
                                            </td>
                                            <td style={{ color: "var(--ac-ink-3)", fontSize: 12 }}>
                                                {new Date(member.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="r">
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                                                    <button
                                                        onClick={() => handleSendReset(member)}
                                                        disabled={sendingResetId === member.id}
                                                        title="Send password reset link"
                                                        className="ac-btn ac-btn-ghost ac-btn-sm"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="17" r="3"/><path d="M10.3 14.7L18 7"/><path d="M14 11l2 2"/><path d="M17 7l2 2"/></svg>
                                                        {sendingResetId === member.id ? "Sending..." : "Reset"}
                                                    </button>
                                                    {(member.role !== "owner" && member.role !== "admin") && (
                                                        <button
                                                            onClick={() => handleRemove(member)}
                                                            disabled={removingId === member.id}
                                                            className="ac-btn ac-btn-danger ac-btn-sm"
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
                    <div style={{ overflowX: "auto" }}>
                        {loading ? (
                            <div className="ac-empty"><p className="ac-empty-title">Loading pending invitations...</p></div>
                        ) : invites.length === 0 ? (
                            <div className="ac-empty"><p className="ac-empty-title">No pending invitations.</p></div>
                        ) : (
                            <table className="ac-table" style={{ width: "100%" }}>
                                <thead>
                                    <tr>
                                        <th>Invitee</th>
                                        <th>Role</th>
                                        <th>Sent on</th>
                                        <th className="r">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invites.map(invite => (
                                        <tr key={invite.id}>
                                            <td>
                                                <div style={{ fontWeight: 600, color: "var(--ac-ink)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                                    {invite.full_name}
                                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ac-warn)", flexShrink: 0, display: "inline-block" }}></span>
                                                </div>
                                                <div style={{ fontSize: 11, color: "var(--ac-ink-3)", fontFamily: "var(--f-mono)", marginTop: 2 }}>{invite.email}</div>
                                            </td>
                                            <td>
                                                <span className={ROLE_BADGE_CLASS[invite.role] || "ac-badge ac-badge-role-staff"}>
                                                    {ROLE_LABELS[invite.role] || invite.role}
                                                </span>
                                            </td>
                                            <td style={{ color: "var(--ac-ink-3)", fontSize: 12 }}>
                                                {new Date(invite.created_at).toLocaleString()}
                                            </td>
                                            <td className="r">
                                                <button onClick={() => handleRevoke(invite.id, invite.email)} className="ac-btn ac-btn-danger ac-btn-sm">
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {/* Filters Bar */}
                        <div style={{ padding: "12px 24px", background: "var(--ac-panel-2)", borderBottom: "1px solid var(--ac-line)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <label className="ac-label" style={{ fontSize: 9 }}>Date</label>
                                <input
                                    type="date"
                                    value={filterDate}
                                    onChange={e => setFilterDate(e.target.value)}
                                    className="ac-input" style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
                                />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <label className="ac-label" style={{ fontSize: 9 }}>Staff</label>
                                <select
                                    value={filterUserId}
                                    onChange={e => setFilterUserId(e.target.value)}
                                    className="ac-select" style={{ fontSize: 12, padding: "4px 8px" }}
                                >
                                    <option value="all">All Members</option>
                                    {allStaff.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <label className="ac-label" style={{ fontSize: 9 }}>Action</label>
                                <select
                                    value={filterAction}
                                    onChange={e => setFilterAction(e.target.value)}
                                    className="ac-select" style={{ fontSize: 12, padding: "4px 8px" }}
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
                                className="ac-btn ac-btn-ghost ac-btn-sm"
                            >
                                Reset Filters
                            </button>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            {loading ? (
                                <div className="ac-empty"><p className="ac-empty-title">Updating log view...</p></div>
                            ) : logs.length === 0 ? (
                                <div className="ac-empty"><p className="ac-empty-title">No logs found matching your criteria.</p></div>
                            ) : (
                                <table className="ac-table" style={{ width: "100%" }}>
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>Staff Member</th>
                                            <th>Action</th>
                                            <th>Page</th>
                                            <th>Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
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
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <td style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                            <span style={{ color: "var(--ac-ink-4)", fontSize: 8, transition: "transform .15s", transform: isExpanded ? "rotate(90deg)" : "none" }}>▶</span>
                                                            {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        <div style={{ fontWeight: 600, color: "var(--ac-ink)", fontSize: 13 }}>{allStaff.find(s => s.id === log.user_id)?.full_name || "Unknown"}</div>
                                                        <div style={{ fontSize: 10, color: "var(--ac-ink-3)", textTransform: "uppercase", letterSpacing: ".08em", marginTop: 2 }}>{ROLE_LABELS[log.user_role] || log.user_role}</div>
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        <span className={`ac-badge ${getActionBadgeClass(log.action_type)}`}>
                                                            {ACTION_LABELS[log.action_type] || log.action_type}
                                                        </span>
                                                    </td>
                                                    <td style={{ whiteSpace: "nowrap" }}>
                                                        <span className="ac-badge" style={{ background: "color-mix(in oklab, var(--ac-ink) 8%, transparent)", color: "var(--ac-ink-3)" }}>
                                                            {getPageLabel(log.action_type, log.resource)}
                                                        </span>
                                                    </td>
                                                    <td style={{ minWidth: 260 }}>
                                                        <div style={{ fontSize: 13, color: "var(--ac-ink-2)" }}>{summary}</div>
                                                        {isExpanded && (
                                                            <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", display: "flex", flexDirection: "column", gap: 4 }}>
                                                                {log.details?.changes && Object.entries(log.details.changes).map(([field, delta]: [string, any]) => (
                                                                    <div key={field} style={{ fontSize: 11, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                                                                        <span style={{ fontWeight: 600, color: "var(--ac-ink-3)", textTransform: "capitalize" }}>{field.replace(/_/g, ' ')}:</span>
                                                                        <span style={{ color: "var(--ac-danger)", textDecoration: "line-through", opacity: 0.7 }}>
                                                                            {typeof delta.from === 'object' ? 'Data' : String(delta.from ?? 'null')}
                                                                        </span>
                                                                        <span style={{ color: "var(--ac-ink-4)" }}>→</span>
                                                                        <span style={{ color: "var(--ac-accent)", fontWeight: 500 }}>
                                                                            {typeof delta.to === 'object' ? 'Data' : String(delta.to ?? 'null')}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                                {!log.details?.changes && log.details && (
                                                                    <div style={{ fontSize: 11, color: "var(--ac-ink-3)", display: "flex", flexDirection: "column", gap: 2 }}>
                                                                        {Object.entries(log.details)
                                                                            .filter(([k]) => !['resource_name', 'changes'].includes(k))
                                                                            .map(([k, v]) => (
                                                                                <div key={k}>
                                                                                    <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{k.replace(/_/g, ' ')}:</span>{' '}
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
                                <div style={{ padding: "20px 24px", borderTop: "1px solid var(--ac-line)", display: "flex", justifyContent: "center" }}>
                                    <button onClick={() => setPage(prev => prev + 1)} className="ac-btn ac-btn-ghost">
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
                <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: 16 }}>
                    <div className="ac-card" style={{ width: "100%", maxWidth: 440, padding: 0 }}>
                        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--ac-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--ac-ink)" }}>Invite New Member</p>
                            <button onClick={() => setShowModal(false)} className="admin-icon-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <form onSubmit={handleInvite} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label className="ac-label">Full Name</label>
                                <input type="text" required value={inviteName} onChange={e => setInviteName(e.target.value)}
                                    className="ac-input" style={{ marginTop: 6 }} placeholder="Ama Staff" />
                            </div>
                            <div>
                                <label className="ac-label">Email Address</label>
                                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                                    className="ac-input" style={{ marginTop: 6 }} placeholder="ama@misstokyo.com" />
                            </div>
                            <div>
                                <label className="ac-label">Phone Number <span style={{ fontWeight: 400, color: "var(--ac-ink-4)" }}>(Optional)</span></label>
                                <input type="text" value={invitePhone} onChange={e => setInvitePhone(e.target.value)}
                                    className="ac-input" style={{ marginTop: 6 }} placeholder="+233..." />
                            </div>
                            <div>
                                <label className="ac-label">Role</label>
                                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                                    className="ac-select" style={{ marginTop: 6 }}>
                                    <option value="sales_staff">Sales Staff</option>
                                    <option value="admin">Admin</option>
                                    <option value="owner">Owner</option>
                                </select>
                            </div>
                            <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
                                <button type="button" onClick={() => setShowModal(false)} className="ac-btn ac-btn-ghost" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={inviting} className="ac-btn ac-btn-primary" style={{ flex: 1 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
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
