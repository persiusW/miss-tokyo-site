// The old /admin/* screens sit outside the dashboard layout, so nothing gated
// them: anyone could load the UI (their data reads are covered by RLS). Staff
// keep them; everyone else is sent to sign in. Roles match each screen's
// dashboard equivalent (all staff), except /admin/settings, which has its own
// owner/admin layout.
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/ai/requireStaff";

export async function LegacyStaffGate({ children }: { children: ReactNode }) {
    const auth = await requireStaff();
    if ("status" in auth) redirect("/admin/login");
    return <>{children}</>;
}
