import Image from "next/image";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadSiteImages } from "@/lib/content/load";
import { wordingText, type ShownImage } from "@/lib/content/wording";

export const revalidate = 300;

/** A Craft photo from Content › Images, tappable when it has a link. */
function CraftPhoto({ img, fallbackAlt }: { img: ShownImage; fallbackAlt: string }) {
    return (
        <>
            <Image src={img.url} alt={img.alt || fallbackAlt} fill className="object-cover object-center" />
            {img.link && <Link href={img.link} className="absolute inset-0" aria-label={img.alt || fallbackAlt} />}
        </>
    );
}

export default async function CraftPage() {
    const [siteAssets, { data: copyData }] = await Promise.all([
        loadSiteImages(["craft_img_1", "craft_img_2", "craft_img_3"] as const),
        supabaseAdmin.from("site_copy").select("copy_key, value").eq("page_group", "craft"),
    ]);
    const copy: Record<string, string> = Object.fromEntries(
        ((copyData ?? []) as { copy_key: string; value: string }[]).map(r => [r.copy_key, r.value]),
    );

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-white">
            {/* Sticky Text Side */}
            <div className="w-full md:w-5/12 p-8 md:p-16 lg:p-24 md:sticky md:top-0 md:h-screen flex flex-col justify-center z-10 bg-white md:border-r border-neutral-100">
                <h1 className="font-serif text-4xl md:text-6xl tracking-widest uppercase mb-12">The Craft</h1>

                <div className="space-y-12">
                    <div>
                        <h2 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">01. Heritage</h2>
                        <h3 className="font-serif text-2xl tracking-widest uppercase mb-4 text-neutral-900">
                            {wordingText(copy, "craft_heritage_heading")}
                        </h3>
                        <p className="text-neutral-600 leading-relaxed text-sm md:text-base">
                            {wordingText(copy, "craft_heritage_body")}
                        </p>
                    </div>

                    <div>
                        <h2 className="text-xs font-semibold tracking-widest uppercase text-neutral-400 mb-4">02. Philosophy</h2>
                        <h3 className="font-serif text-2xl tracking-widest uppercase mb-4 text-neutral-900">
                            {wordingText(copy, "craft_philosophy_heading")}
                        </h3>
                        <p className="text-neutral-600 leading-relaxed text-sm md:text-base">
                            {wordingText(copy, "craft_philosophy_body")}
                        </p>
                    </div>
                </div>
            </div>

            {/* Scrolling Imagery Side */}
            <div className="w-full md:w-7/12 flex flex-col">
                <div className="relative h-[60vh] md:h-[80vh] w-full bg-neutral-100 flex items-center justify-center">
                    {siteAssets.craft_img_1 ? (
                        <CraftPhoto img={siteAssets.craft_img_1} fallbackAlt="Miss Tokyo Craftsmanship" />
                    ) : <span className="text-neutral-400 text-xs tracking-widest uppercase">Image 1</span>}
                </div>
                <div className="relative h-[60vh] md:h-[80vh] w-full bg-neutral-50 flex items-center justify-center">
                    {siteAssets.craft_img_2 ? (
                        <CraftPhoto img={siteAssets.craft_img_2} fallbackAlt="Miss Tokyo Atelier" />
                    ) : <span className="text-neutral-400 text-xs tracking-widest uppercase">Image 2</span>}
                </div>
                <div className="relative h-[60vh] md:h-[80vh] w-full bg-neutral-100 flex items-center justify-center">
                    {siteAssets.craft_img_3 ? (
                        <CraftPhoto img={siteAssets.craft_img_3} fallbackAlt="Miss Tokyo Atelier Details" />
                    ) : <span className="text-neutral-400 text-xs tracking-widest uppercase">Image 3</span>}
                </div>
            </div>
        </div>
    );
}
