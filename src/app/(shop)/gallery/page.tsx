import Image from "next/image";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function GalleryPage() {
    const { data: assetsData } = await supabase.from("site_assets").select("*");
    const siteAssets = (assetsData || []).reduce((acc: any, asset: any) => {
        acc[asset.section_key] = asset;
        return acc;
    }, {});

    const rawImages = [
        {
            src: siteAssets['gallery_img_1']?.image_url,
            alt: siteAssets['gallery_img_1']?.alt_text || "Badu Ghanaian Leather Footwear - Leather Craft and Stitching",
            aspectRatio: "aspect-[3/4]",
        },
        {
            src: siteAssets['gallery_img_2']?.image_url,
            alt: siteAssets['gallery_img_2']?.alt_text || "Badu Ghanaian Leather Footwear - Macro Leather Texture",
            aspectRatio: "aspect-[4/3]",
        },
        {
            src: siteAssets['gallery_img_3']?.image_url,
            alt: siteAssets['gallery_img_3']?.alt_text || "Badu Ghanaian Leather Footwear - Minimalist Architecture Space",
            aspectRatio: "aspect-square",
        },
        {
            src: siteAssets['gallery_img_4']?.image_url,
            alt: siteAssets['gallery_img_4']?.alt_text || "Badu Ghanaian Leather Footwear - Warm Tones and Abstract Design",
            aspectRatio: "aspect-[3/4]",
        }
    ];

    const images = rawImages.filter(img => !!img.src);

    return (
        <div className="pt-32 pb-24 px-6 md:px-12 max-w-[1600px] mx-auto min-h-screen">
            <header className="mb-16 md:mb-24 text-center md:text-left">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">Gallery</h1>
                <p className="text-sm tracking-[0.2em] text-neutral-500 uppercase">Visual References & Editorial.</p>
            </header>

            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {images.length > 0 ? images.map((img, idx) => (
                    <div key={idx} className={`relative w-full overflow-hidden ${img.aspectRatio} bg-neutral-100 break-inside-avoid group`}>
                        <Image
                            src={img.src}
                            alt={img.alt}
                            fill
                            className="object-cover object-center grayscale hover:grayscale-0 transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.03]"
                        />
                    </div>
                )) : (
                    <div className="col-span-full py-24 text-center">
                        <span className="text-neutral-400 text-xs tracking-widest uppercase">No images in gallery yet</span>
                    </div>
                )}
            </div>
        </div>
    );
}
