import type { ReactNode } from "react";
import { OwnerAdminGate } from "@/components/admin/OwnerAdminGate";

// Settings is an owner + admin area (hidden from sales staff in the sidebar).
export default function SettingsLayout({ children }: { children: ReactNode }) {
    return <OwnerAdminGate what="settings">{children}</OwnerAdminGate>;
}
