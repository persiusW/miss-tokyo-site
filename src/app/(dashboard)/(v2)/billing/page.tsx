import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { BillingPage } from "@/components/admin/v2/billing/BillingPage";

export const metadata = { title: "Billing · Miss Tokyo admin" };

// Static by owner decision: no live data is read here (see billingPreview.ts).
export default async function BillingRoute() {
    const g = await requireV2Page("billing", "/billing", ["owner", "admin"]);
    if (!g.allowed) return <Denied title="Billing" />;
    return <BillingPage />;
}
