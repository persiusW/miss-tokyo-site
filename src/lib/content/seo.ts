// A page's metadata with the row saved in Content › Pages › Search engines
// laid over it. Pure: lib/content/load reads the row.
import type { Metadata } from "next";

export type SeoRow = { title?: string | null; description?: string | null; keywords?: string | null; og_image_url?: string | null };

/** Empty fields keep the page's own; a share image replaces the inherited one. */
export function withSeoRow(row: SeoRow | null | undefined, fallback: Metadata): Metadata {
    if (!row) return fallback;
    return {
        ...fallback,
        title: row.title?.trim() || fallback.title,
        description: row.description?.trim() || fallback.description,
        ...(row.keywords?.trim() ? { keywords: row.keywords } : {}),
        ...(row.og_image_url ? { openGraph: { ...(fallback.openGraph ?? {}), images: [row.og_image_url] } } : {}),
    };
}
