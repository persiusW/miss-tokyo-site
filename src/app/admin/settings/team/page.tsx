"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, UserCog, Shield, ShieldCheck, User, Search, Loader2, XCircle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/ui/miss-tokyo/ConfirmationModal";

type TeamRole = "owner" | "admin" | "sales_staff" | "customer";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: TeamRole;
  created_at: string;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  owner:       "Owner",
  admin:       "Admin",
  sales_staff: "Sales Staff",
  customer:    "Revoked",
};

const ROLE_ICONS: Record<TeamRole, any> = {
  owner:       ShieldCheck,
  admin:       Shield,
  sales_staff: UserCog,
  customer:    User,
};

// Roles that can be assigned via dropdown (excluding customers as that's via 'Revoke')
const ASSIGNABLE_ROLES: TeamRole[] = ["owner", "admin", "sales_staff"];

export default function TeamSettingsPage() {
  const supabase = createClient();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{id: string, role: TeamRole} | null>(null);
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "sales_staff" as TeamRole });
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    
    // 1. Get current user session/role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", user.id).single();
      if (profile) setCurrentUser(profile as any);
    }

    // 2. Fetch all staff members
    const { data: members, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .in("role", ["owner", "admin", "sales_staff"])
      .order("role", { ascending: true });

    if (error) {
      toast.error("Cloud access restricted.");
    } else {
      setTeam(members as TeamMember[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    
    const invitePromise = async () => {
        const response = await fetch("/api/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(inviteForm),
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to send invitation.");
        return result;
    };

    toast.promise(invitePromise(), {
      loading: 'Dispatched invitation signal...',
      success: 'Invitation successfully transmitted.',
      error: (err) => `Dispatch failure: ${err.message}`,
    }).then(() => {
      setShowInviteModal(false);
      setInviteForm({ email: "", role: "sales_staff" });
      fetchTeam();
    }).finally(() => {
      setInviting(false);
    });
  };

  const handleRoleChange = async (id: string, newRole: TeamRole) => {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    if (error) {
      toast.error("Failed to reassign role.");
    } else {
      setTeam(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m));
      toast.success("Security permissions updated.");
    }
  };

  const handleRevoke = async (id: string) => {
    const revokePromise = async () => {
        const { error } = await supabase.from("profiles").update({ role: "customer" }).eq("id", id);
        if (error) throw error;
    };

    toast.promise(revokePromise(), {
      loading: 'Rescinding administrative clearance...',
      success: 'Administrative access revoked.',
      error: (err) => `Revocation failed: ${err.message}`,
    }).then(() => {
      setTeam(prev => prev.filter(m => m.id !== id));
    });
  };

  // RBAC: Whether the current user can manage a specific member
  const canManage = (memberRole: TeamRole) => {
    if (!currentUser) return false;
    if (currentUser.role === "owner") return true; // Owner manages all
    if (currentUser.role === "admin" && memberRole !== "owner") return true; // Admin manages non-owners
    return false;
  };

  const filteredTeam = team.filter(m => 
    m.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Team Management</h1>
          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Arial, sans-serif" }}>
            Administrative RBAC Control
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input type="text" placeholder="Find member..." value={search} onChange={e => setSearch(e.target.value)}
              className="border border-gray-100 pl-8 pr-3 py-2 text-xs outline-none focus:border-black transition-colors" />
          </div>
          <button onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-widest px-5 py-2.5 hover:bg-gray-900 transition-colors"
            style={{ fontFamily: "Arial, sans-serif" }}>
            <Plus size={13} strokeWidth={2} /> Invite Member
          </button>
        </div>
      </div>

      {currentUser?.role === "admin" && (
        <div className="bg-gray-50 border border-gray-100 px-4 py-3 mb-6 text-[10px] uppercase tracking-widest text-gray-500 font-serif">
          Administrator View — Restricting access to Owner profiles.
        </div>
      )}

      <div className="bg-white border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Member", "Role", "Join Date", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-5 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold" style={{ fontFamily: "Arial, sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="py-20 text-center text-xs text-gray-400 italic font-serif">Gathering security clearance records...</td></tr>
            ) : filteredTeam.length === 0 ? (
              <tr><td colSpan={5} className="py-20 text-center text-xs text-gray-400 italic font-serif">No administrative members found.</td></tr>
            ) : (
              filteredTeam.map(member => {
                const editable = canManage(member.role) && member.id !== currentUser?.id;
                const Icon = ROLE_ICONS[member.role] || User;
                return (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black text-white flex items-center justify-center text-[11px] font-bold">
                          {member.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>{member.full_name || "Unknown"}</p>
                          <p className="text-[10px] text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-2">
                        <Icon size={12} className="text-gray-400" />
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500" style={{ fontFamily: "Arial, sans-serif" }}>
                          {ROLE_LABELS[member.role]}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-[10px] text-gray-400 font-medium" style={{ fontFamily: "Arial, sans-serif" }}>
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-5">
                      {editable ? (
                        <select value={member.role} onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                          className="bg-white border border-gray-100 text-[10px] uppercase tracking-widest px-2 py-1 outline-none focus:border-black font-bold">
                          {ASSIGNABLE_ROLES.filter(r => !(currentUser?.role === "admin" && r === "owner")).map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[9px] uppercase tracking-widest text-gray-300 font-bold">Fixed Access</span>
                      )}
                    </td>
                    <td className="px-5 py-5">
                      {editable ? (
                        <button onClick={() => setRevokeId(member.id)} className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors">
                          <Trash2 size={13} />
                          <span className="text-[10px] uppercase tracking-widest font-bold">Revoke</span>
                        </button>
                      ) : (
                        <span className="text-gray-200">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={!!revokeId}
        onClose={() => setRevokeId(null)}
        onConfirm={() => revokeId && handleRevoke(revokeId)}
        title="Revoke Clearance"
        message="Are you sure you want to rescind all administrative access for this member? They will be reassigned as a standard customer profile."
        confirmLabel="Confirm Revocation"
      />
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
          <div className="relative bg-white w-full max-w-md border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Authorize New Access</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-black transition-colors"><XCircle size={18} /></button>
            </div>
            <form onSubmit={handleInvite} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Member Email</label>
                <div className="relative">
                  <Mail size={12} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input type="email" required value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border-b border-gray-100 pl-5 py-2 text-xs outline-none focus:border-black transition-colors" placeholder="colleague@misstokyo.com" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Designated Role</label>
                <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value as TeamRole }))}
                  className="w-full border-b border-gray-100 py-2 text-xs outline-none focus:border-black transition-colors bg-transparent appearance-none cursor-pointer font-bold uppercase tracking-widest">
                  {ASSIGNABLE_ROLES.filter(r => !(currentUser?.role === "admin" && r === "owner")).map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={inviting} className="w-full bg-black text-white text-[10px] uppercase tracking-widest py-4 hover:bg-gray-900 transition-colors disabled:opacity-50 font-bold">
                  {inviting ? "Broadcasting..." : "Dispatch Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
