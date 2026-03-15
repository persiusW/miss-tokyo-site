import Image from "next/image";
import { CustomOrderForm } from "@/components/ui/badu/CustomOrderForm";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";

export default async function WhiteLabelPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
    let imageUrl: string | null = null;
    const { ref: refSlug } = await searchParams;

    if (refSlug) {
        const { data } = await supabase.from("products").select("image_urls")
            .eq("slug", refSlug).single();
        if (data && data.image_urls && data.image_urls.length > 0) {
            imageUrl = data.image_urls[0];
        }
    }

    return (
        <div className="pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto flex flex-col md:flex-row gap-16 md:gap-24">
            {/* Editorial Image */}
            <div className="w-full md:w-5/12 hidden md:block relative h-[80vh] bg-neutral-100 flex items-center justify-center">
                {imageUrl ? (
                    <Image src={imageUrl} alt="Reference Product" fill className="object-cover" />
                ) : (
                    <span className="text-neutral-400 text-sm tracking-widest uppercase">White Labelling</span>
                )}
            </div>

            {/* Form Content */}
            <div className="w-full md:w-7/12 py-8">
                <h1 className="font-serif text-4xl md:text-5xl tracking-widest uppercase mb-6">White Labelling</h1>
                <p className="text-neutral-600 leading-relaxed mb-12 max-w-xl">
                    Whether you want to customize an existing silhouette or create something entirely new, our white labelling service allows you to leverage Miss Tokyo's signature craftsmanship.
                </p>

                <Suspense fallback={<p className="text-neutral-400 italic">Loading form...</p>}>
                    <CustomOrderForm />
                </Suspense>
            </div>
        </div>
    );
}
