import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

function esc(str: string): string {
    return (str || "")
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;");
}

export async function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";
    const bizName = "Miss Tokyo";

    const { data: products } = await supabaseAdmin
        .from("products")
        .select("name, slug, description, image_urls, created_at")
        .eq("is_active", true)
        .eq("is_wholesale_only", false)
        .order("created_at", { ascending: false })
        .limit(20);

    const items = (products ?? []).map(p => {
        const imageUrl = Array.isArray(p.image_urls) ? p.image_urls[0] : null;
        const desc = [
            p.description ? esc(p.description) : "",
            imageUrl ? `<br/><img src="${esc(imageUrl)}" alt="${esc(p.name)}" style="max-width:100%;" />` : "",
        ].filter(Boolean).join("");

        return `
    <item>
      <title><![CDATA[${p.name}]]></title>
      <link>${baseUrl}/products/${p.slug}</link>
      <guid isPermaLink="true">${baseUrl}/products/${p.slug}</guid>
      <description><![CDATA[${desc}]]></description>
      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
    </item>`;
    }).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${bizName} — Latest Drops</title>
    <link>${baseUrl}</link>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <description>New arrivals and the latest drops from ${bizName} Atelier, Accra, Ghana.</description>
    <language>en-gh</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${baseUrl}/favicon-96x96.png</url>
      <title>${bizName}</title>
      <link>${baseUrl}</link>
    </image>${items}
  </channel>
</rss>`;

    return new Response(xml, {
        headers: {
            "Content-Type":  "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
    });
}
