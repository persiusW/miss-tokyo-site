import type { Metadata } from "next";
import { Geist, Playfair_Display, Cinzel } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
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
    title: "BADU | Minimalist Luxury",
    description: "Handmade in Ghana. A minimalist collection of luxury footwear.",
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
