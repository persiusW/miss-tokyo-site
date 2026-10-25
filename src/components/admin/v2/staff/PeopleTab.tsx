"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Banner, Btn, Card, Empty, ErrorState, Field, Panel, RadioCards, SRow, TwoTap, ago, initials, toast, when } from "@/components/admin/ui";
import type { StaffMember } from "./data";
import { LAST_OWNER_TEXT, ROLE_DESC, ROLE_LABEL, assignableRoles, type StaffRoleKey } from "./staffCopy";
import { changeStaffRole, deactivateStaff, reactivateStaff, removeFromStaff, sendStaffResetLink, signOutEverywhere } from "./actions";

const soft = (t: string) => (/^(Just now|Today|Yesterday)/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);

/** The row's time line: when they were last active. */
function lastLine(m: StaffMember): string {
    return m.lastActive ? `Active ${soft(ago(m.lastActive))}` : "Hasn't signed in yet";
}

/** The panel's subtitle adds when they were deactivated. */
function panelLine(m: StaffMember): string {
    if (m.deactivated) return m.deactivatedAt ? `Deactivated ${soft(when(m.deactivatedAt))}` : "Deactivated";
    return lastLine(m);
}

export function PeopleTab({ members, failed, meId, viewer }: { members: StaffMember[]; failed: boolean; meId: string; viewer: StaffRoleKey }) {
    const router = useRouter();
    const [open, setOpen] = useState<string | null>(null);
    const m = members.find(x => x.id === open) ?? null;
    const owners = members.filter(x => x.role === "owner" && !x.deactivated).length;

    if (failed) return <Card><ErrorState what="the staff list" onRetry={() => router.refresh()} /></Card>;

    return (
        <>
            <Card>
                {members.length === 0
                    ? <Empty icon="staff" title="No staff yet" body="When someone accepts an invite, they show here with their role and when they last signed in." />
                    : (
                        <div className="rows">
                            {members.map(s => (
                                <button type="button" key={s.id} className="row click" onClick={() => setOpen(s.id)}>
                                    <span className="avatar" aria-hidden="true">{initials(s.name)}</span>
                                    <div className="row-main">
                                        <div className="row-title">{s.name}{s.id === meId && <span className="muted" style={{ fontWeight: 500 }}> (you)</span>}</div>
                                        <div className="row-sub">{s.email}</div>
                                    </div>
                                    <span className="sm muted hide-sm nowrap">{lastLine(s)}</span>
                                    {s.deactivated ? <Badge>Deactivated</Badge> : <Badge plain tone={s.role === "sales_staff" ? undefined : "info"}>{ROLE_LABEL[s.role]}</Badge>}
                                </button>
                            ))}
                        </div>
                    )}
            </Card>
            {m && <MemberPanel key={m.id} m={m} viewer={viewer} self={m.id === meId} lastOwner={m.role === "owner" && !m.deactivated && owners <= 1}
                onClose={() => setOpen(null)} onDone={() => { setOpen(null); router.refresh(); }} />}
        </>
    );
}

type Busy = null | "save" | "reset" | "signout" | "deactivate" | "reactivate" | "remove";

function MemberPanel({ m, viewer, self, lastOwner, onClose, onDone }: { m: StaffMember; viewer: StaffRoleKey; self: boolean; lastOwner: boolean; onClose: () => void; onDone: () => void }) {
    const [role, setRole] = useState<StaffRoleKey>(m.role);
    const [busy, setBusy] = useState<Busy>(null);

    const run = async (kind: Exclude<Busy, null>, fn: () => Promise<{ ok: true; message: string; signedOutSelf?: boolean } | { ok: false; error: string }>, close = true) => {
        if (busy) return;
        setBusy(kind);
        try {
            const res = await fn();
            if (!res.ok) { toast.error(res.error); return; }
            toast.success(res.message);
            if (res.signedOutSelf) { window.location.href = "/login"; return; }
            if (close) onDone();
        } catch {
            toast.code("NET-01", { audience: "staff" });
        } finally {
            setBusy(null);
        }
    };

    const footerLeft = m.deactivated
        ? <Btn onClick={() => run("reactivate", () => reactivateStaff(m.id))} disabled={!!busy}>{busy === "reactivate" ? "Reactivating…" : "Reactivate"}</Btn>
        : (!lastOwner && !self && <TwoTap label="Deactivate" disabled={!!busy} onConfirm={() => run("deactivate", () => deactivateStaff(m.id))} />);

    return (
        <Panel open onClose={onClose} title={m.name} sub={`${m.email} · ${panelLine(m)}`}
            footerLeft={footerLeft}
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={!!busy}>Cancel</Btn>
                {!m.deactivated && <Btn kind="primary" disabled={role === m.role || !!busy} onClick={() => run("save", () => changeStaffRole(m.id, role))}>{busy === "save" ? "Saving…" : "Save"}</Btn>}
            </>}>
            {m.deactivated ? (
                <Banner tone="neutral" title={`${m.name} can't sign in`}>
                    {`Their ${ROLE_LABEL[m.role].toLowerCase()} access is paused. Reactivate gives it back as it was.`}
                </Banner>
            ) : (
                <>
                    <Field label="Role">
                        <RadioCards label="Role" value={role} onChange={setRole}
                            options={assignableRoles(viewer).map(r => ({ v: r, title: ROLE_LABEL[r], desc: ROLE_DESC[r], disabled: lastOwner && r !== "owner" }))} />
                    </Field>
                    {lastOwner && <p className="help">{LAST_OWNER_TEXT}</p>}
                    {self && !lastOwner && <p className="help">This is you. You can change your own role, but someone else has to deactivate you.</p>}
                </>
            )}
            <Card inset>
                <div className="rows">
                    {!m.deactivated && (
                        <>
                            <SRow label="Password" help="Sends a link to set a new password. Their current one keeps working until they do.">
                                <Btn sm disabled={!!busy} onClick={() => run("reset", () => sendStaffResetLink(m.id), false)}>{busy === "reset" ? "Sending…" : "Send reset link"}</Btn>
                            </SRow>
                            <SRow label="Sign out everywhere" help={self ? "Ends your session on every phone and computer, including this one." : "Ends their session on every phone and computer."}>
                                <Btn sm disabled={!!busy} onClick={() => run("signout", () => signOutEverywhere(m.id), false)}>{busy === "signout" ? "Signing out…" : "Sign out"}</Btn>
                            </SRow>
                        </>
                    )}
                    {!lastOwner && !self && (
                        <SRow label="Remove from staff" help="They lose admin access but keep their shop account, so they can still sign in and shop. They drop off this list.">
                            <TwoTap sm label="Remove" disabled={!!busy} onConfirm={() => run("remove", () => removeFromStaff(m.id))} />
                        </SRow>
                    )}
                    <SRow label="Joined" help="When their account was made.">
                        <span className="sm">{when(m.joined)}</span>
                    </SRow>
                </div>
            </Card>
        </Panel>
    );
}
