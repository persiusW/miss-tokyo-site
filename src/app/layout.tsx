import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "../../public/fonts/geist.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const playfairDisplay = localFont({
  src: "../../public/fonts/playfair.woff2",
  variable: "--font-playfair-display",
  weight: "400 900",
});

const cinzel = localFont({
  src: "../../public/fonts/cinzel.woff2",
  variable: "--font-cinzel",
  weight: "400 900",
});

import { supabase } from "@/lib/supabase";

export async function generateMetadata(): Promise<Metadata> {
  const { data } = await supabase.from("site_metadata").select("*").eq("page_path", "/").single();

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
      </body>
    </html>
  );
}
