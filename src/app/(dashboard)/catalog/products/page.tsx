import ProductsClient from "./ProductsClient";
import { fetchProductsPage, type ProductStatusFilter, type ProductStockFilter } from "./productsQuery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CatalogProductsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; status?: string; stock?: string }>;
}) {
    const sp = await searchParams;
    const query = sp.q ?? "";
    const page = Math.max(1, Number(sp.page) || 1);
    const status = (["active", "inactive", "preorder"].includes(sp.status ?? "") ? sp.status : "all") as ProductStatusFilter;
    const stock = (["in", "low", "out"].includes(sp.stock ?? "") ? sp.stock : "all") as ProductStockFilter;

    const { products, totalCount, pageSize } = await fetchProductsPage(query, page, status, stock);

    return (
        <ProductsClient
            initialProducts={products}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            query={query}
            status={status}
            stock={stock}
        />
    );
}
