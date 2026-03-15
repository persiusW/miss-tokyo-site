import Image from "next/image";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export const metadata = {
    title: "About | MISS TOKYO",
    description: "Our story, our craft, and our vision.",
};

const FALLBACK_HERO    = "https://images.unsplash.com/photo-1534452286302-2f50d8b5e1cd?q=80&w=2070&auto=format&fit=crop";
const FALLBACK_FOUNDER = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop";

export default async function AboutPage() {
    const [assetsRes, copyRes] = await Promise.all([
        supabase.from("site_assets").select("section_key, image_url").in("section_key", ["about_hero", "about_founder"]),
        supabase.from("site_copy").select("copy_key, value").eq("page_group", "about"),
    ]);

    const assets = (assetsRes.data ?? []).reduce((acc: any, a: any) => { acc[a.section_key] = a.image_url; return acc; }, {});
    const copy   = (copyRes.data  ?? []).reduce((acc: any, r: any) => { acc[r.copy_key]   = r.value;     return acc; }, {});

    const heroImage    = assets["about_hero"]    || FALLBACK_HERO;
    const founderImage = assets["about_founder"] || FALLBACK_FOUNDER;

    const heroTitle     = copy["about_hero_title"]      || "Our Story";
    const founderTitle  = copy["about_founder_title"]   || "The Founder";
    const founderP1     = copy["about_founder_p1"]      || "Miss Tokyo began as a vision to merge traditional Ghanaian craftsmanship with a stark, modern aesthetic of visual silence.";
    const founderP2     = copy["about_founder_p2"]      || "Our director believes that luxury is found in the quiet details—the weight of the leather, the precision of a single stitch, and the enduring quality of a silhouette that transcends seasons.";
    const founderP3     = copy["about_founder_p3"]      || "Every piece is handcrafted in our Accra atelier, where we preserve heritage techniques while pushing the boundaries of contemporary design.";
    const philosophyQ   = copy["about_philosophy_quote"]|| "\u201cWe do not create trends; we create archives. Each piece is a testament to the belief that simplicity is the ultimate sophistication.\u201d";

    return (
        <div className="pb-24">
            {/* Hero Section */}
            <section className="relative h-[70vh] w-full overflow-hidden">
                <Image
                    src={heroImage}
                    alt="Miss Tokyo Atelier"
                    fill
                    className="object-cover grayscale"
                    priority
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6">
                    <h1 className="text-4xl md:text-6xl text-white font-serif uppercase tracking-[0.25em] text-center max-w-4xl">
                        {heroTitle}
                    </h1>
                </div>
            </section>

            {/* Founder Section */}
            <section className="my-24 max-w-7xl mx-auto px-6 md:px-12">
                <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
                    {/* Left - Image */}
                    <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                        <Image
                            src={founderImage}
                            alt="The Founder"
                            fill
                            className="object-cover rounded-none grayscale"
                        />
                    </div>

                    {/* Right - Text */}
                    <div className="max-w-md">
                        <h2 className="text-2xl md:text-3xl font-serif uppercase tracking-[0.2em] text-black mb-8">
                            {founderTitle}
                        </h2>
                        <div className="space-y-6 text-sm leading-relaxed text-neutral-600 uppercase tracking-wide font-light">
                            <p>{founderP1}</p>
                            <p>{founderP2}</p>
                            <p>{founderP3}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Philosophy / Secondary Section */}
            <section className="bg-neutral-50 py-24 px-6 md:px-12 text-center rounded-none">
                <div className="max-w-3xl mx-auto">
                    <h2 className="font-serif text-[10px] uppercase tracking-[0.4em] text-neutral-400 mb-8 font-bold">The Philosophy</h2>
                    <blockquote className="text-xl md:text-2xl font-serif text-black leading-relaxed italic mb-8">
                        {philosophyQ}
                    </blockquote>
                    <div className="h-px w-12 bg-black mx-auto"></div>
                </div>
            </section>
        </div>
    );
}
