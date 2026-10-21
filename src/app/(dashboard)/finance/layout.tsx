import type { ReactNode } from "react";
import { OwnerAdminGate } from "@/components/admin/OwnerAdminGate";

// Finance (invoices and pay links) is an owner + admin area (hidden from sales staff in the sidebar).
export default function FinanceLayout({ children }: { children: ReactNode }) {
    return <OwnerAdminGate what="invoices and pay links">{children}</OwnerAdminGate>;
}
