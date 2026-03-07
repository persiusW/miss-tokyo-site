import Image from "next/image";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function GalleryPage() {
    const { data: assetsData } = await supabase.from("site_assets").select("*");
    const siteAssets = (assetsData || []).reduce((acc: any, asset: any) => {
        acc[asset.section_key] = asset;
        return acc;
    }, {});

    const images = [
        {
            src: siteAssets['gallery_img_1']?.image_url || "https://images.unsplash.com/photo-1610963197825-f71e98950d87?q=80&w=1000&auto=format&fit=crop",
            alt: siteAssets['gallery_img_1']?.alt_text || "Badu Ghanaian Leather Footwear - Leather Craft and Stitching",
            aspectRatio: "aspect-[3/4]",
        },
        {
            src: siteAssets['gallery_img_2']?.image_url || "https://images.unsplash.com/photo-1481277542470-605612bd2d61?q=80&w=1000&auto=format&fit=crop",
            alt: siteAssets['gallery_img_2']?.alt_text || "Badu Ghanaian Leather Footwear - Macro Leather Texture",
            aspectRatio: "aspect-[4/3]",
        },
        {
            src: siteAssets['gallery_img_3']?.image_url || "https://images.unsplash.com/photo-1531604250646-2f0e818c4f06?q=80&w=1000&auto=format&fit=crop",
            alt: siteAssets['gallery_img_3']?.alt_text || "Badu Ghanaian Leather Footwear - Minimalist Architecture Space",
            aspectRatio: "aspect-square",
        },
        {
            src: siteAssets['gallery_img_4']?.image_url || "https://images.unsplash.com/photo-1618220179428-22790b46a0eb?q=80&w=1000&auto=format&fit=crop",
            alt: siteAssets['gallery_img_4']?.alt_text || "Badu Ghanaian Leather Footwear - Warm Tones and Abstract Design",
            aspectRatio: "aspect-[3/4]",
        }
    ];

    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen">
            <header className="mb-16 md:mb-24 text-center md:text-left">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">Gallery</h1>
                <p className="text-sm tracking-[0.2em] text-neutral-500 uppercase">Visual References & Editorial.</p>
            </header>

            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {images.map((img, idx) => (
                    <div key={idx} className={`relative w-full overflow-hidden ${img.aspectRatio} bg-creme break-inside-avoid group`}>
                        <Image
                            src={img.src}
                            alt={img.alt}
                            fill
                            className="object-cover object-center grayscale hover:grayscale-0 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.03]"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
