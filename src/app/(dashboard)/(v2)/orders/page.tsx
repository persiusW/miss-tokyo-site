import type { Metadata } from "next";
import { OrdersV2 } from "@/components/admin/v2/orders/OrdersRoute";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

// /orders (was /sales/orders and /sales/pre-orders → ?preorder=1).
export default async function OrdersRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <OrdersV2 searchParams={await searchParams} openId={null} />;
}
