import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/ai/requireStaff";
import { OWNER_ADMIN } from "@/components/admin/OwnerAdminGate";

// The old settings screen sits outside the dashboard layout, so nothing gated
// it: anyone, signed in or not, could load it. Owners and admins keep it.
export default async function LegacySettingsLayout({ children }: { children: ReactNode }) {
    const auth = await requireStaff([...OWNER_ADMIN]);
    if ("status" in auth) redirect("/admin/login");
    return <>{children}</>;
}
