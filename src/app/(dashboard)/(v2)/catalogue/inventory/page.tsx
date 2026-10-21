import type { Metadata } from "next";
import { InventoryV2 } from "@/components/admin/v2/catalogue/CatalogueRoute";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

// /catalogue/inventory (was /catalog/products/low-stock, now ?view=low): stock per size and colour.
export default async function InventoryRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <InventoryV2 searchParams={await searchParams} />;
}
