import { Denied } from "@/components/admin/ui";
import { requireV2Page } from "@/lib/admin/v2/server";
import { BillingPage } from "@/components/admin/v2/billing/BillingPage";
import { loadBillingPage } from "@/components/admin/v2/billing/data";

export const metadata = { title: "Billing · Miss Tokyo admin" };
export const dynamic = "force-dynamic";

// Owners and admins. The admin also sees the payout account and ledger summary.
export default async function BillingRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const g = await requireV2Page("billing", "/billing", ["owner", "admin"]);
    if (!g.allowed) return <Denied title="Billing" />;
    const q = await searchParams;
    const paid = typeof q.paid === "string" ? q.paid : null;
    return <BillingPage d={await loadBillingPage(g.role === "admin" ? "admin" : "owner", paid)} />;
}
