import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // excludes 0,O,I,1,L

function genSegment(): string {
    return Array.from({ length: 4 }, () =>
        CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join("");
}

function genCode(): string {
    return `MT-${genSegment()}-${genSegment()}-${genSegment()}`;
}

/** Generates a unique gift card code, retrying up to 5 times on collision. */
export async function generateGiftCardCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = genCode();
        const { data } = await supabaseAdmin
            .from("gift_cards")
            .select("id")
            .eq("code", code)
            .maybeSingle();
        if (!data) return code;
    }
    throw new Error("Failed to generate unique gift card code after 5 attempts.");
}
