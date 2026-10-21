"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Btn, Card, Empty, ErrorState, TwoTap, ago, toast } from "@/components/admin/ui";
import type { StaffInvite } from "./data";
import { inviteExpiry, roleLabel } from "./staffCopy";
import { resendInvite, revokeInvite } from "./actions";

export function InvitesTab({ invites, failed }: { invites: StaffInvite[]; failed: boolean }) {
    const router = useRouter();
    const [busy, setBusy] = useState<string | null>(null);

    if (failed) return <Card><ErrorState what="the invites" onRetry={() => router.refresh()} /></Card>;

    const run = async (id: string, fn: () => ReturnType<typeof resendInvite>) => {
        if (busy) return;
        setBusy(id);
        try {
            const res = await fn();
            if (res.ok) { toast.success(res.message); router.refresh(); }
            else toast.error(res.error);
        } catch {
            toast.code("NET-01", { audience: "staff" });
        } finally {
            setBusy(null);
        }
    };

    return (
        <Card>
            {invites.length === 0
                ? <Empty icon="mail" title="No invites waiting" body="When you invite someone, the invite shows here until they set a password." />
                : (
                    <div className="rows">
                        {invites.map(x => {
                            const exp = inviteExpiry(x.expiresAt);
                            return (
                                <div className="row stf-invite" key={x.id}>
                                    <div className="row-main">
                                        <div className="row-title">{x.email}</div>
                                        <div className="row-sub">
                                            {[x.name, roleLabel(x.role), `Sent ${ago(x.sent).replace(/^Today/, "today").replace(/^Yesterday/, "yesterday")}`].filter(Boolean).join(" · ")}
                                            {" · "}{exp.expired ? <Badge tone="warn" plain>Expired</Badge> : exp.text}
                                        </div>
                                    </div>
                                    <div className="hrow-sm stf-invite-actions">
                                        <Btn sm disabled={!!busy} onClick={() => run(x.id, () => resendInvite(x.id))}>{busy === x.id ? "Sending…" : exp.expired ? "Send again" : "Resend"}</Btn>
                                        <TwoTap sm label="Revoke" disabled={!!busy} onConfirm={() => run(x.id, () => revokeInvite(x.id))} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
        </Card>
    );
}
