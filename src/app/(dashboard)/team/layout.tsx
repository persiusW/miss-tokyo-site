import type { ReactNode } from "react";
import { OwnerAdminGate } from "@/components/admin/OwnerAdminGate";

// Team is an owner + admin area (hidden from sales staff in the sidebar).
export default function TeamLayout({ children }: { children: ReactNode }) {
    return <OwnerAdminGate what="the team page">{children}</OwnerAdminGate>;
}
