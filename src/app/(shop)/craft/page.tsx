import Image from "next/image";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export default async function CraftPage() {
    const { data: assetsData } = await supabase.from("site_assets").select("*");
    const siteAssets = (assetsData || []).reduce((acc: any, asset: any) => {
        acc[asset.section_key] = asset;
        return acc;
    }, {});

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-white">
            {/* Sticky Text Side */}
            <div className="w-full md:w-5/12 p-8 md:p-16 lg:p-24 md:sticky md:top-0 md:h-screen flex flex-col justify-center z-10 bg-white md:border-r border-neutral-100">
                <h1 className="font-serif text-4xl md:text-6xl tracking-widest uppercase mb-12">The Craft</h1>

                <div className="space-y-12">
                    <div>
                        <h2 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">01. Heritage</h2>
                        <h3 className="font-serif text-2xl tracking-widest uppercase mb-4 text-neutral-900">The Name Is Personal</h3>
                        <p className="text-neutral-600 leading-relaxed text-sm md:text-base">
                            BADU is more than a label; it is a lineage. Born in Accra, our atelier honors the artisanal legacy of Ghana
                            by refusing the shortcuts of mass production. Every stitch is a deliberate act of preservation.
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">02. Philosophy</h2>
                        <h3 className="font-serif text-2xl tracking-widest uppercase mb-4 text-neutral-900">Visual Silence</h3>
                        <p className="text-neutral-600 leading-relaxed text-sm md:text-base">
                            We strip away the extraneous to leave only the essential structure. True luxury is found in the quiet details:
                            unbranded surfaces, perfectly skived edges, and leathers selected to age alongside you. Elegance is refusal.
                        </p>
                    </div>
                </div>
            </div>

            {/* Scrolling Imagery Side */}
            <div className="w-full md:w-7/12 flex flex-col">
                <div className="relative h-[60vh] md:h-[80vh] w-full bg-creme">
                    <Image
                        src={siteAssets['craft_img_1']?.image_url || "https://images.unsplash.com/photo-1610963197825-f71e98950d87?q=80&w=1000&auto=format&fit=crop"}
                        alt={siteAssets['craft_img_1']?.alt_text || "Badu Ghanaian Leather Footwear - Leather Craft and Stitching"}
                        fill
                        className="object-cover object-center"
                    />
                </div>
                <div className="relative h-[60vh] md:h-[80vh] w-full bg-neutral-100">
                    <Image
                        src={siteAssets['craft_img_2']?.image_url || "https://images.unsplash.com/photo-1481277542470-605612bd2d61?q=80&w=1000&auto=format&fit=crop"}
                        alt={siteAssets['craft_img_2']?.alt_text || "Badu Ghanaian Leather Footwear - Macro Leather Texture"}
                        fill
                        className="object-cover object-center"
                    />
                </div>
                <div className="relative h-[60vh] md:h-[80vh] w-full bg-creme">
                    <Image
                        src={siteAssets['craft_img_3']?.image_url || "https://images.unsplash.com/photo-1531604250646-2f0e818c4f06?q=80&w=1000&auto=format&fit=crop"}
                        alt={siteAssets['craft_img_3']?.alt_text || "Badu Ghanaian Leather Footwear - Minimalist Architecture Space"}
                        fill
                        className="object-cover object-center"
                    />
                </div>
            </div>
        </div>
    );
}
