import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${playfairDisplay.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
