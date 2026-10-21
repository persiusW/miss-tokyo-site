import type { Metadata } from "next";
import { AbandonedV2 } from "@/components/admin/v2/orders/OrdersRoute";

export const metadata: Metadata = { title: "Abandoned checkouts" };
export const dynamic = "force-dynamic";

// /orders/abandoned (was /customers/abandoned).
export default async function AbandonedRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <AbandonedV2 searchParams={await searchParams} />;
}
