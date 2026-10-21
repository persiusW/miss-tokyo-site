import type { Metadata } from "next";
import { DiscountsV2 } from "@/components/admin/v2/discounts/DiscountsRoute";

export const metadata: Metadata = { title: "Discounts" };
export const dynamic = "force-dynamic";

// /discounts (was /catalog/discounts and /catalog/auto-discounts): codes and
// automatic discounts in one list.
export default async function DiscountsRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <DiscountsV2 searchParams={await searchParams} openId={null} />;
}
