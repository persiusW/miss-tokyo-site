import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TrustBar } from "@/components/public/TrustBar";
import { HeroSlider } from "@/components/public/HeroSlider";
import { CategoryGrid } from "@/components/public/CategoryGrid";
import { NewArrivalsSection } from "@/components/public/NewArrivalsSection";
import { OptInSection } from "@/components/public/OptInSection";
import { InstagramFeed } from "@/components/public/InstagramFeed";
import type { SiteSettings, HeroSlide, FeaturedCategory, TrustBarItem } from "@/types/settings";

// 5-minute ISR: homepage content (hero, categories) changes rarely.
// Under heavy load this means only ~1 DB query per 5 minutes instead of per-request.
export const revalidate = 300;

export default async function HomePage() {
  const [
    { data: settingsData },
    { data: heroSlidesData },
    { data: featuredCatsData },
  ] = await Promise.all([
    supabaseAdmin
      .from("site_settings")
      .select("*")
      .eq("id", "singleton")
      .maybeSingle(),
    supabaseAdmin
      .from("hero_slides")
      .select("*")
      .eq("enabled", true)
      .order("position", { ascending: true }),
    supabaseAdmin
      .from("featured_categories")
      .select("*, category:categories(name, slug, image_url, product_count)")
      .eq("enabled", true)
      .order("position", { ascending: true }),
  ]);

  const settings = settingsData as SiteSettings | null;
  const heroSlides = (heroSlidesData || []) as HeroSlide[];
  const featuredCats = (featuredCatsData || []) as FeaturedCategory[];

  // PERF-01: use pre-fetched product_count from the category join — no per-category DB round-trips
  const categoriesWithCounts = featuredCats.map((fc) => ({
    ...fc,
    itemCount: fc.item_count_override ?? (fc.category as any)?.product_count ?? 0,
  }));

  // Trust bar data
  const trustBarEnabled = settings?.trust_bar_enabled ?? false;
  const trustBarItems: TrustBarItem[] = settings?.trust_bar_items ?? [];

  // Opt-in data
  const optInEnabled = settings?.optin_section_enabled ?? true;
  const optInTitle = settings?.optin_title ?? "Get 10% Off Your First Order";
  const optInSubtitle =
    settings?.optin_subtitle ??
    "Subscribe to our newsletter and receive an exclusive discount on your first purchase.";
  const couponEnabled = settings?.welcome_coupon_enabled ?? true;
  const couponCode = settings?.welcome_coupon_code ?? "FIRST10";

  return (
    <>
      {/* 1. Hero Slider */}
      <HeroSlider slides={heroSlides} />

      {/* 2. Trust Bar (below hero) */}
      <TrustBar enabled={trustBarEnabled} items={trustBarItems} />

      {/* 3. Category Grid */}
      <CategoryGrid categories={categoriesWithCounts} />

      {/* 4. New Arrivals */}
      <NewArrivalsSection />

      {/* 5. Transparent Turtle Review Widget */}
      <div className="w-full px-4 md:px-8 py-8">
        <iframe
          src="https://www.transparentturtle.com/widget/misstokyo?type=full&theme=light"
          width="100%"
          height="160"
          title="Transparent Turtle review widget"
          frameBorder="0"
          scrolling="no"
          style={{ border: "none", overflow: "hidden", width: "100%" }}
        />
      </div>

      {/* 6. Email Opt-In */}
      <OptInSection
        enabled={optInEnabled}
        title={optInTitle}
        subtitle={optInSubtitle}
        couponEnabled={couponEnabled}
        couponCode={couponCode}
      />

      {/* 7. Instagram Feed */}
      <InstagramFeed
        instagramUrl={settings?.social_instagram ?? null}
        accessToken={settings?.instagram_access_token ?? null}
      />

    </>
  );
}
