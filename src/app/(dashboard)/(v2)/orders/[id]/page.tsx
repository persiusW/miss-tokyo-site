import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrdersV2 } from "@/components/admin/v2/orders/OrdersRoute";

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// /orders/<id> (was /sales/orders/<id>): the list with this order's panel open.
export default async function OrderRoute({ params, searchParams }: Params) {
    const { id } = await params;
    if (!UUID.test(id)) redirect("/orders");
    return <OrdersV2 searchParams={await searchParams} openId={id.toLowerCase()} />;
}
