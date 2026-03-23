import { headers } from "next/headers";

export async function getUrl(): Promise<string> {
    const headersList = await headers();
    const host = headersList.get("host") || process.env.NEXT_PUBLIC_SITE_URL || "misstokyo.shop";
    const proto = headersList.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
}
