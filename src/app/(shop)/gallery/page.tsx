import { getVideoProducts } from "@/lib/products";
import { GalleryClient } from "@/components/ui/miss-tokyo/GalleryClient";

export const revalidate = 60; // Refresh data every minute

export default async function GalleryPage() {
    const products = await getVideoProducts();

    return <GalleryClient products={products} />;
}
