"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type TeamMember = {
    id: string;
    email: string;
    full_name?: string | null;
    role: string;
    created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
    owner:       "Owner",
    admin:       "Admin",
    sales_staff: "Sales Staff",
};

const ROLE_BADGE: Record<string, string> = {
    owner:       "ac-badge ac-badge-fulfilled",
    admin:       "ac-badge ac-badge-paid",
    sales_staff: "ac-badge ac-badge-info",
};

export default function TeamPage() {
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
        if (member.role === "owner") {
            toast.error("Cannot remove the owner account.");
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
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">Team</h1>
                    <p className="ac-page-sub">Manage who has access to the admin dashboard and their permission level.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="ac-btn ac-btn-primary">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "inline", marginRight: 6 }}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    Invite Member
                </button>
            </div>

            {/* Permission levels */}
            <div className="ac-card" style={{ marginBottom: 24 }}>
                <div className="ac-card-head"><span className="ac-card-title">Permission Levels</span></div>
                <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
                    {[
                        { role: "Owner",       desc: "Full system access. Cannot be removed." },
                        { role: "Admin",       desc: "Full access to all sections and settings." },
                        { role: "Sales Staff", desc: "Access to Products, Sales, and Customers only." },
                    ].map(({ role, desc }) => (
                        <div key={role}>
                            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-2)", marginBottom: 4 }}>{role}</p>
                            <p style={{ fontSize: 11, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".05em", lineHeight: 1.6 }}>{desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Team table */}
            <div className="ac-card flush">
                <div className="ac-card-head">
                    <span className="ac-card-title">Members</span>
                    <span style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{members.length} {members.length === 1 ? "member" : "members"}</span>
                </div>
                {loading ? (
                    <div className="ac-empty"><p className="ac-empty-title">Loading team...</p></div>
                ) : members.length === 0 ? (
                    <div className="ac-empty"><p className="ac-empty-title">No team members yet.</p></div>
                ) : (
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                    <th style={{ width: 80 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map(member => (
                                    <tr key={member.id}>
                                        <td>
                                            <div style={{ fontWeight: 500, color: "var(--ac-ink)" }}>{member.full_name || "—"}</div>
                                            <div style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{member.email}</div>
                                        </td>
                                        <td>
                                            <span className={ROLE_BADGE[member.role] || "ac-badge ac-badge-inactive"}>
                                                {ROLE_LABELS[member.role] || member.role}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>
                                            {new Date(member.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            {member.role !== "owner" && (
                                                <button onClick={() => handleRemove(member)}
                                                    style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = "var(--ac-danger)")}
                                                    onMouseLeave={e => (e.currentTarget.style.color = "var(--ac-ink-4)")}>
                                                    Remove
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {showModal && (
                <div className="ac-modal">
                    <div className="ac-modal-box" style={{ maxWidth: 460 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                            <h2 style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600, color: "var(--ac-ink)" }}>Invite Team Member</h2>
                            <button onClick={() => setShowModal(false)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ac-ink-4)", fontSize: 22 }}>×</button>
                        </div>
                        <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label className="ac-label">Email Address</label>
                                <input type="email" required value={inviteEmail}
                                    onChange={e => setInviteEmail(e.target.value)}
                                    className="ac-input" style={{ marginTop: 6 }}
                                    placeholder="staff@misstokyo.com"
                                    autoFocus />
                            </div>
                            <div>
                                <label className="ac-label">Role</label>
                                <select value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value as "admin" | "sales_staff")}
                                    className="ac-select" style={{ marginTop: 6 }}>
                                    <option value="sales_staff">Sales Staff</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <p style={{ fontSize: 10, color: "var(--ac-ink-4)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 6 }}>
                                    {inviteRole === "sales_staff"
                                        ? "Access to Products, Sales, and Customers only."
                                        : "Full access to all sections and settings."}
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                                <button type="button" onClick={() => setShowModal(false)} className="ac-btn ac-btn-ghost" style={{ flex: 1 }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={inviting} className="ac-btn ac-btn-primary" style={{ flex: 1 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ display: "inline", marginRight: 6 }}><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 7 12 13 2 7"/></svg>
                                    {inviting ? "Sending..." : "Send Invite"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
