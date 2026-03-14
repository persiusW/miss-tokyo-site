import ShopCatalog from "@/components/ui/miss-tokyo/ShopCatalog";

export const revalidate = 60;

export default async function SalePage() {
    return (
        <ShopCatalog 
            title="The Sale" 
            subtitle="Archive Pieces. Exclusive Pricing."
            isSaleOnly={true} 
        />
    );
}
