import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  async redirects() {
    return [
      // Legacy CMS-generated slugs → correct search-param routes (permanent)
      { source: "/shop/sale",         destination: "/shop?sale=true",    permanent: true },
      { source: "/shop/new-arrivals", destination: "/shop?sort=newest",  permanent: true },
      { source: "/new-arrivals",      destination: "/shop?sort=newest",  permanent: true },
      // Old Wix product-page URLs → new /products/ route
      { source: "/product-page/:slug*", destination: "/products/:slug*", permanent: true },
      // Old Wix /category/:slug → shop filter page
      { source: "/category/:slug",      destination: "/shop?category=:slug", permanent: true },
      // Wix static pages with no Next.js equivalent
      { source: "/accessibility-statement", destination: "/",            permanent: false },
    ];
  },
  poweredByHeader: false, // SPD-12: suppress X-Powered-By header
  images: {
    formats: ["image/avif", "image/webp"],
    // Image optimization enabled — Vercel Pro plan
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wcygtmcnysbhzgcicocm.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'dfhrtuiszsumvtzsfzic.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        // Wildcard catches any future Supabase project or CDN edge hostname
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
