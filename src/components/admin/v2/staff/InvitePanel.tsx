"use client";

import { useState } from "react";
import { Btn, Field, Panel, RadioCards, toast } from "@/components/admin/ui";
import { inviteStaff } from "./actions";
import { ROLE_DESC, ROLE_LABEL, inviteRolesFor, type StaffRoleKey } from "./staffCopy";

/** Invite staff: the existing flow (team_invitations + an email with the setup link). */
export function InvitePanel({ open, viewer, onClose, onSent }: { open: boolean; viewer: StaffRoleKey; onClose: () => void; onSent: () => void }) {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState<StaffRoleKey>("sales_staff");
    const [busy, setBusy] = useState(false);
    const ok = /^\S+@\S+\.\S+$/.test(email.trim()) && name.trim().length > 0;

    const reset = () => { setEmail(""); setName(""); setPhone(""); setRole("sales_staff"); };
    const send = async () => {
        if (!ok || busy) return;
        setBusy(true);
        try {
            const res = await inviteStaff({ fullName: name, email, phone, role });
            if (res.ok) { if (res.warning) toast.error(res.message); else toast.success(res.message); reset(); onSent(); }
            else toast.error(res.error);
        } catch {
            toast.code("NET-01", { audience: "staff" });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Panel open={open} onClose={onClose} title="Invite staff" sub="They get an email to set a password. The link works for 7 days."
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn><Btn kind="primary" disabled={!ok || busy} onClick={send}>{busy ? "Sending…" : "Send invite"}</Btn></>}>
            <Field label="Email" htmlFor="inv-email">
                <input id="inv-email" data-autofocus className="input" type="email" autoComplete="off" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="name@misstokyo.shop" />
            </Field>
            <Field label="Name" htmlFor="inv-name" help="Shown on the staff list and in the activity log.">
                <input id="inv-name" className="input" autoComplete="off" value={name} onChange={e => setName(e.target.value)} placeholder="Ama Mensah" />
            </Field>
            <Field label="Phone (optional)" htmlFor="inv-phone" help="We also text them the invite link.">
                <input id="inv-phone" className="input" type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={e => setPhone(e.target.value)} placeholder="024 000 0000" />
            </Field>
            <Field label="Role" help="To make someone an owner, invite them first, then change their role on People.">
                <RadioCards label="Role" value={role} onChange={setRole}
                    options={inviteRolesFor(viewer).map(r => ({ v: r, title: ROLE_LABEL[r], desc: ROLE_DESC[r] }))} />
            </Field>
        </Panel>
    );
}
