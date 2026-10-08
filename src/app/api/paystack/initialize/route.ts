export const maxDuration = 30; // 30 seconds — headroom for Paystack API handshake

import { NextResponse } from "next/server";
import { runCheckout } from "@/lib/checkout/createCheckoutOrder";

// Thin adapter: the order logic lives in @/lib/checkout so staff and WhatsApp
// orders run exactly the same code. Request and response shapes are unchanged.
export async function POST(request: Request) {
    try {
        const { status, body } = await runCheckout(await request.json());
        return NextResponse.json(body, { status });
    } catch (error) {
        console.error("Paystack Init Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
