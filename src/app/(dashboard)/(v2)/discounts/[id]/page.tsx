import type { Metadata } from "next";
import { DiscountsV2 } from "@/components/admin/v2/discounts/DiscountsRoute";

export const metadata: Metadata = { title: "Discount" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// /discounts/<id>: the list with that discount's panel open. The id is a
// code's or an automatic discount's; the page works out which.
export default async function DiscountRoute({ params, searchParams }: Params) {
    const { id } = await params;
    return <DiscountsV2 searchParams={await searchParams} openId={decodeURIComponent(id)} />;
}
