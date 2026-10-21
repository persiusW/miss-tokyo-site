import type { Metadata } from "next";
import { GiftCardsV2 } from "@/components/admin/v2/catalogue/CatalogueRoute";

export const metadata: Metadata = { title: "Gift cards" };
export const dynamic = "force-dynamic";

// /catalogue/gift-cards (was /catalog/gift-cards).
export default async function GiftCardsRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <GiftCardsV2 searchParams={await searchParams} />;
}
