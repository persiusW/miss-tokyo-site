import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { GiftCardPageClient } from "./GiftCardPageClient";

export const revalidate = 60;

export const metadata: Metadata = {
    title: "Gift Cards — Miss Tokyo",
    description:
        "Give the gift of style. Miss Tokyo gift cards are delivered instantly by email and never expire.",
};

export default async function GiftCardsPage() {
    const { data: s } = await supabaseAdmin
        .from("site_settings")
        .select(
            "gc_enabled, gc_min_amount, gc_max_amount, gc_preset_amounts, gc_never_expires, gc_delivery_note, store_email"
        )
        .eq("id", "singleton")
        .single();

    const config = {
        enabled: s?.gc_enabled ?? true,
        minAmount: Number(s?.gc_min_amount ?? 20),
        maxAmount: Number(s?.gc_max_amount ?? 500),
        presetAmounts: (s?.gc_preset_amounts as number[]) ?? [50, 100, 150, 200, 250, 300, 400, 500],
        neverExpires: s?.gc_never_expires ?? true,
        deliveryNote:
            s?.gc_delivery_note ??
            "Gift cards are delivered instantly by email and never expire.",
    };

    return <GiftCardPageClient config={config} />;
}
