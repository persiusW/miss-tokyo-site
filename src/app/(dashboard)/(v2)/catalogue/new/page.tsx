import type { Metadata } from "next";
import { ProductsV2 } from "@/components/admin/v2/catalogue/CatalogueRoute";

export const metadata: Metadata = { title: "Add product" };
export const dynamic = "force-dynamic";

// /catalogue/new (was /catalog/products/new): the list with an empty product panel open.
export default async function NewProductRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <ProductsV2 searchParams={await searchParams} openId={null} isNew />;
}
