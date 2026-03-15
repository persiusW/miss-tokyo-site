import Image from "next/image";
import { GiftCardForm } from "@/components/ui/miss-tokyo/GiftCardForm";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

export const metadata = {
    title: "eGift Card | MISS TOKYO",
    description: "The perfect gift for any occasion. Shop MISS TOKYO eGift Cards.",
};

const FALLBACK_GIFT_IMAGE = "https://wcygtmcnysbhzgcicocm.supabase.co/storage/v1/object/public/site_assets/gift-card-v2.jpg";

export default async function GiftCardPage() {
    const { data: assetRow } = await supabase
        .from("site_assets")
        .select("image_url")
        .eq("section_key", "gift_card_hero")
        .single();

    const giftImageUrl = assetRow?.image_url || FALLBACK_GIFT_IMAGE;

    return (
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 md:grid md:grid-cols-2 gap-16 lg:gap-24 min-h-screen">
            {/* Left Column (Sticky Visual) */}
            <div className="mb-12 md:mb-0">
                <div className="md:sticky md:top-28 h-max">
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100 relative">
                        <Image
                            src={giftImageUrl}
                            alt="Miss Tokyo eGift Card"
                            fill
                            className="object-cover object-center rounded-none grayscale sm:grayscale-0 hover:grayscale-0 transition-all duration-700"
                            priority
                        />
                    </div>
                </div>
            </div>

            {/* Right Column (Form Content) */}
            <div className="flex flex-col">
                <header className="mb-12">
                    <h1 className="text-3xl md:text-5xl font-serif uppercase tracking-[0.2em] text-black mb-4">
                        eGift Card
                    </h1>
                    <div className="h-px w-12 bg-black mb-8"></div>
                </header>

                <GiftCardForm />
            </div>
        </div>
    );
}
