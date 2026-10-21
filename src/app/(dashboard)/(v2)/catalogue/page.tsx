import type { Metadata } from "next";
import { ProductsV2 } from "@/components/admin/v2/catalogue/CatalogueRoute";

export const metadata: Metadata = { title: "Products" };
export const dynamic = "force-dynamic";

// /catalogue (was /catalog/products): the product list. The storefront owns
// /products/[slug], so the admin's Products area lives here.
export default async function CatalogueRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    return <ProductsV2 searchParams={await searchParams} openId={null} />;
}
