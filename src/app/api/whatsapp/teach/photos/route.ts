// Photo flashcards: upload up to 10 photos (multipart "photos") to start a
// round, and the products to choose from. Admin and owner.
import { NextRequest, NextResponse } from "next/server";
import { logCause } from "@/lib/errors/apiError";
import { createRound, MAX_PHOTOS, productOptions } from "@/lib/ai/teach/photoCards";
import { teacher } from "../guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
    const who = await teacher();
    if (who instanceof NextResponse) return who;
    try {
        return NextResponse.json({ products: await productOptions() });
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/teach/photos GET" });
        return NextResponse.json({ error: "We couldn't load your products. Please refresh." }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const who = await teacher();
    if (who instanceof NextResponse) return who;
    const form = await req.formData().catch(() => null);
    const files = (form?.getAll("photos") ?? []).filter((f): f is File => f instanceof File);
    if (files.length === 0) return NextResponse.json({ error: "Choose at least one photo." }, { status: 400 });
    if (files.length > MAX_PHOTOS) return NextResponse.json({ error: `Up to ${MAX_PHOTOS} photos at a time.` }, { status: 400 });
    try {
        const r = await createRound(files, who.staffId);
        if (r.refused === files.length) return NextResponse.json({ error: "Those files aren't photos we can read. Use JPEG, PNG or WebP." }, { status: 400 });
        return NextResponse.json(r);
    } catch (e) {
        logCause("GEN-00", e, { route: "whatsapp/teach/photos POST" });
        return NextResponse.json({ error: "We couldn't upload those photos. Please try again." }, { status: 500 });
    }
}
