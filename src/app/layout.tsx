import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "../../public/fonts/geist.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  fallback: ["sans-serif"],
});

const playfairDisplay = localFont({
  src: "../../public/fonts/playfair.woff2",
  variable: "--font-playfair-display",
  weight: "400 900",
  display: "swap",
  fallback: ["serif"],
});

const cinzel = localFont({
  src: "../../public/fonts/cinzel.woff2",
  variable: "--font-cinzel",
  weight: "400 900",
  display: "swap",
  fallback: ["serif"],
});

import { Analytics } from "@vercel/analytics/next";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

export const revalidate = 60;

const getSiteMetadata = unstable_cache(
  async () => {
    const { data } = await supabase.from("site_metadata").select("*").eq("page_path", "/").single();
    return data;
  },
  ["site-metadata"],
  { revalidate: 3600 }
);

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteMetadata();

  if (data) {
    return {
      title: data.title,
      description: data.description,
      keywords: data.keywords,
      openGraph: {
        images: data.og_image_url ? [data.og_image_url] : [],
      }
    };
  }

  return {
    title: "MISS TOKYO | Minimalist Luxury",
    description: "Handmade in Ghana. A minimalist collection of luxury fashion.",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://misstokyo.shop";

  return (
    <html lang="en">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Miss Tokyo — New Arrivals"
          href={`${siteUrl}/rss.xml`}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${playfairDisplay.variable} ${cinzel.variable} antialiased font-[family-name:var(--font-cinzel)]`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
