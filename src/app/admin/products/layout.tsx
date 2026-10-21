import type { ReactNode } from "react";
import { LegacyStaffGate } from "@/components/admin/LegacyStaffGate";

export default function LegacyLayout({ children }: { children: ReactNode }) {
    return <LegacyStaffGate>{children}</LegacyStaffGate>;
}
