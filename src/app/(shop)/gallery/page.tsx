import { getVideoProducts, VIDEO_BATCH_SIZE } from "@/lib/products";
import { GalleryClient } from "@/components/ui/miss-tokyo/GalleryClient";

export const revalidate = 60;

export default async function GalleryPage() {
    const { videos, nextOffset, hasMore } = await getVideoProducts(0);

    return (
        <GalleryClient
            initialVideos={videos}
            initialNextOffset={nextOffset}
            initialHasMore={hasMore}
        />
    );
}
