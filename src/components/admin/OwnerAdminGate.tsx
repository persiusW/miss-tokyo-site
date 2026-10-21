// Server gate for the owner + admin areas the sidebar hides from sales staff
// (Settings, Content, Team, Wholesalers, Invoices, Pay Links). The sidebar only
// hides the links; this makes a typed URL show a calm notice instead of the
// page. The real write protection is RLS (fn_is_owner_or_admin) and the role
// check in each route, so this gate is about what renders, not the only wall.
import type { ReactNode } from "react";
import { requireStaff } from "@/lib/ai/requireStaff";

export const OWNER_ADMIN = ["admin", "owner"] as const;

export function OwnerAdminNotice({ what }: { what: string }) {
    return (
        <div className="ac-card">
            <div className="ac-empty">
                <div className="ac-empty-title">Only admins and owners can open {what}.</div>
            </div>
        </div>
    );
}

export async function OwnerAdminGate({ what, children }: { what: string; children: ReactNode }) {
    const auth = await requireStaff([...OWNER_ADMIN]);
    if ("status" in auth) return <OwnerAdminNotice what={what} />;
    return <>{children}</>;
}
