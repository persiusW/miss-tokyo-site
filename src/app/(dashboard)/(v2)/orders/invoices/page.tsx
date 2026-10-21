import type { Metadata } from "next";
import { InvoicesV2 } from "@/components/admin/v2/orders/OrdersRoute";

export const metadata: Metadata = { title: "Invoices and pay links" };
export const dynamic = "force-dynamic";

// /orders/invoices (was /finance, /finance/invoices and /finance/links → ?type=link).
export default async function InvoicesRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <InvoicesV2 openId={null} searchParams={await searchParams} />;
}
