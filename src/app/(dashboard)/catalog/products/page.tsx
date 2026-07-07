import ProductsClient from "./ProductsClient";
import { fetchProductsPage } from "./productsQuery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CatalogProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string }>;
}) {
    const sp = await searchParams;
    const query = sp.q ?? "";
    const page = Math.max(1, Number(sp.page) || 1);

    const { products, totalCount, pageSize } = await fetchProductsPage(query, page);

    return (
        <ProductsClient
            initialProducts={products}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            query={query}
        />
    );
}
