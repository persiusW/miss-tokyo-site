import type { ReactNode } from "react";
import { OwnerAdminGate } from "@/components/admin/OwnerAdminGate";

// Content is an owner + admin area (hidden from sales staff in the sidebar).
export default function ContentLayout({ children }: { children: ReactNode }) {
    return <OwnerAdminGate what="the site content">{children}</OwnerAdminGate>;
}
