import type { Metadata } from "next";
import { ProductsV2 } from "@/components/admin/v2/catalogue/CatalogueRoute";

export const metadata: Metadata = { title: "Product" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// /catalogue/<id> (was /catalog/products/<id>/edit): the list with that product's panel open.
export default async function ProductRoute({ params, searchParams }: Params) {
    const { id } = await params;
    return <ProductsV2 searchParams={await searchParams} openId={decodeURIComponent(id)} />;
}
