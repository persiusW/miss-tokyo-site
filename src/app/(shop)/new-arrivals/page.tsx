import ShopCatalog from "@/components/ui/miss-tokyo/ShopCatalog";

export const revalidate = 60;

export default async function NewArrivalsPage() {
    return (
        <ShopCatalog 
            title="New Arrivals" 
            subtitle="The Latest From Our Archive."
            defaultSort="newest" 
        />
    );
}
