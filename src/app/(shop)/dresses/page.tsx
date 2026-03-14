import ShopCatalog from "@/components/ui/miss-tokyo/ShopCatalog";

export const revalidate = 60;

export default async function DressesPage() {
    return (
        <ShopCatalog 
            title="Dresses" 
            subtitle="Elegant Silhouettes. Effortless Grace."
            defaultCategorySlug="dresses" 
        />
    );
}
