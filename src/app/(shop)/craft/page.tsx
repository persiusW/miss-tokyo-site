import Image from "next/image";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const revalidate = 300;

export default async function CraftPage() {
    const [{ data: assetsData }, { data: copyData }] = await Promise.all([
        supabaseAdmin.from("site_assets").select("*"),
        supabaseAdmin.from("site_copy").select("copy_key, value").eq("page_group", "craft"),
    ]);
    const siteAssets = (assetsData || []).reduce((acc: any, asset: any) => {
        acc[asset.section_key] = asset;
        return acc;
    }, {});
    const copy = (copyData || []).reduce((acc: any, row: any) => {
        acc[row.copy_key] = row.value;
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
                        <h3 className="font-serif text-2xl tracking-widest uppercase mb-4 text-neutral-900">
                            {copy['craft_heritage_heading'] || "The Name Is Personal"}
                        </h3>
                        <p className="text-neutral-600 leading-relaxed text-sm md:text-base">
                            {copy['craft_heritage_body'] || "MISS TOKYO is more than a label; it is a lineage. Born in Accra, our atelier honors the artisanal legacy of Ghana by refusing the shortcuts of mass production. Every stitch is a deliberate act of preservation."}
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">02. Philosophy</h2>
                        <h3 className="font-serif text-2xl tracking-widest uppercase mb-4 text-neutral-900">
                            {copy['craft_philosophy_heading'] || "Visual Silence"}
                        </h3>
                        <p className="text-neutral-600 leading-relaxed text-sm md:text-base">
                            {copy['craft_philosophy_body'] || "We strip away the extraneous to leave only the essential structure. True luxury is found in the quiet details: unbranded surfaces, perfectly skived edges, and leathers selected to age alongside you. Elegance is refusal."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Scrolling Imagery Side */}
            <div className="w-full md:w-7/12 flex flex-col">
                <div className="relative h-[60vh] md:h-[80vh] w-full bg-neutral-100 flex items-center justify-center">
                    {siteAssets['craft_img_1']?.image_url ? (
                        <Image
                            src={siteAssets['craft_img_1'].image_url}
                            alt={siteAssets['craft_img_1']?.alt_text || "Miss Tokyo Craftsmanship"}
                            fill
                            className="object-cover object-center"
                        />
                    ) : <span className="text-neutral-400 text-xs tracking-widest uppercase">Image 1</span>}
                </div>
                <div className="relative h-[60vh] md:h-[80vh] w-full bg-neutral-50 flex items-center justify-center">
                    {siteAssets['craft_img_2']?.image_url ? (
                        <Image
                            src={siteAssets['craft_img_2'].image_url}
                            alt={siteAssets['craft_img_2']?.alt_text || "Miss Tokyo Atelier"}
                            fill
                            className="object-cover object-center"
                        />
                    ) : <span className="text-neutral-400 text-xs tracking-widest uppercase">Image 2</span>}
                </div>
                <div className="relative h-[60vh] md:h-[80vh] w-full bg-neutral-100 flex items-center justify-center">
                    {siteAssets['craft_img_3']?.image_url ? (
                        <Image
                            src={siteAssets['craft_img_3'].image_url}
                            alt={siteAssets['craft_img_3']?.alt_text || "Miss Tokyo Atelier Details"}
                            fill
                            className="object-cover object-center"
                        />
                    ) : <span className="text-neutral-400 text-xs tracking-widest uppercase">Image 3</span>}
                </div>
            </div>
        </div>
    );
}
