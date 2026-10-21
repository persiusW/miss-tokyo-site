import type { ReactNode } from "react";
import { OwnerAdminGate } from "@/components/admin/OwnerAdminGate";

// Wholesalers is an owner + admin area (hidden from sales staff in the sidebar).
export default function WholesalersLayout({ children }: { children: ReactNode }) {
    return <OwnerAdminGate what="wholesalers">{children}</OwnerAdminGate>;
}
