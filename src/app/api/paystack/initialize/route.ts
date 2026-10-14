export const maxDuration = 30; // 30 seconds — headroom for Paystack API handshake

import { NextResponse } from "next/server";
import { runCheckout } from "@/lib/checkout/createCheckoutOrder";
import { createClient } from "@/lib/supabaseServer";
import { apiError } from "@/lib/errors/apiError";

// Thin adapter: the order logic lives in @/lib/checkout so staff and WhatsApp
// orders run exactly the same code. Request and response shapes are unchanged.
export async function POST(request: Request) {
    try {
        const payload = await request.json();

        // Only the signed-in shopper's own account can unlock wholesale prices.
        // getClaims verifies the session JWT locally; no session means retail.
        let authUserId: string | null = null;
        try {
            const supabase = await createClient();
            const { data } = await supabase.auth.getClaims();
            authUserId = (data?.claims?.sub as string | undefined) ?? null;
        } catch {
            authUserId = null;
        }

        const { status, body } = await runCheckout(payload, { source: "storefront", authUserId });
        return NextResponse.json(body, { status });
    } catch (error) {
        return apiError("ORD-01", { status: 500, audience: "customer", cause: error, context: { route: "paystack/initialize" } });
    }
}
