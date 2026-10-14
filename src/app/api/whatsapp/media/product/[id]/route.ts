// A product's main photo as JPEG, for WhatsApp: the shop stores webp, and
// WhatsApp image messages take jpg or png only. Public, like the product page
// it comes from: active, shop-visible products only. Cached at the CDN.
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const notFound = () => new NextResponse("Not found", { status: 404 });

/** Only the shop's own storage is fetched, never an arbitrary URL from a product row. */
function allowedSource(url: string): boolean {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!base && url.startsWith(`${base.replace(/\/+$/, "")}/storage/v1/object/public/`);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!UUID.test(id)) return notFound();
    try {
        const { data: p } = await supabaseAdmin.from("products").select("image_urls")
            .eq("id", id).eq("is_active", true).eq("is_wholesale_only", false).maybeSingle();
        const src = Array.isArray(p?.image_urls) ? p.image_urls[0] : null;
        if (!src || !allowedSource(src)) return notFound();

        const res = await fetch(src, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) return notFound();
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > MAX_SOURCE_BYTES) return notFound();

        const jpeg = await sharp(buf).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
        return new NextResponse(new Uint8Array(jpeg), {
            headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
        });
    } catch (e) {
        console.error("[whatsapp/media] product image failed", { id, err: String(e) });
        return notFound();
    }
}
