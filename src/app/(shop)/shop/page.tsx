import ShopCatalog from "@/components/ui/miss-tokyo/ShopCatalog";

export const revalidate = 60;

export default async function ShopPage() {
    return <ShopCatalog />;
}
