import type { Metadata } from "next";
import { Cinzel } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// Cinzel — used for headings, logo, and body text ("conzel")
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
    title: "Miss Tokyo | Women's Fashion & Lifestyle",
    description: "Your all-girl destination for everything cute, cool, and unmistakably feminine.",
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
        suppressHydrationWarning
        className={`${cinzel.variable} antialiased`}
      >
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#000',
            color: '#fff',
            fontSize: '11px',
            borderRadius: '0px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }
        }} />
        {children}
      </body>
    </html>
  );
}
