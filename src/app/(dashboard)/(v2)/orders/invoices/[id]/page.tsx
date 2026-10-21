import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InvoicesV2 } from "@/components/admin/v2/orders/OrdersRoute";

export const metadata: Metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// /orders/invoices/<id> (was /finance/invoices/<id>): the list with that document open.
export default async function InvoiceRoute({ params, searchParams }: Params) {
    const { id } = await params;
    if (!UUID.test(id)) redirect("/orders/invoices");
    return <InvoicesV2 openId={id.toLowerCase()} searchParams={await searchParams} />;
}
