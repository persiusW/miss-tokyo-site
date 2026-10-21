import type { Metadata } from "next";
import { CategoriesV2 } from "@/components/admin/v2/catalogue/CatalogueRoute";

export const metadata: Metadata = { title: "Categories" };
export const dynamic = "force-dynamic";

// /catalogue/categories (was /catalog/categories).
export default async function CategoriesRoute() {
    return <CategoriesV2 />;
}
