import { supabase } from "@/lib/supabase";
import { TrustBar } from "@/components/public/TrustBar";
import { HeroSlider } from "@/components/public/HeroSlider";
import { CategoryGrid } from "@/components/public/CategoryGrid";
import { NewArrivalsSection } from "@/components/public/NewArrivalsSection";
import { ReviewGrid } from "@/components/public/ReviewGrid";
import { OptInSection } from "@/components/public/OptInSection";
import { InstagramFeed } from "@/components/public/InstagramFeed";
import type { SiteSettings, HeroSlide, FeaturedCategory, HomepageReview, TrustBarItem } from "@/types/settings";

export const revalidate = 60;

export default async function HomePage() {
  const [
    { data: settingsData },
    { data: heroSlidesData },
    { data: featuredCatsData },
    { data: reviewsData },
  ] = await Promise.all([
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", "singleton")
      .maybeSingle(),
    supabase
      .from("hero_slides")
      .select("*")
      .eq("enabled", true)
      .order("position", { ascending: true }),
    supabase
      .from("featured_categories")
      .select("*, category:categories(name, slug, image_url)")
      .eq("enabled", true)
      .order("position", { ascending: true }),
    supabase
      .from("homepage_reviews")
      .select("*")
      .eq("enabled", true)
      .order("position", { ascending: true }),
  ]);

  const settings = settingsData as SiteSettings | null;
  const heroSlides = (heroSlidesData || []) as HeroSlide[];
  const reviews = (reviewsData || []) as HomepageReview[];
  const featuredCats = (featuredCatsData || []) as FeaturedCategory[];

  // Fetch item counts for featured categories
  const categoriesWithCounts = await Promise.all(
    featuredCats.map(async (fc) => {
      if (fc.item_count_override !== null) {
        return { ...fc, itemCount: fc.item_count_override };
      }
      const categoryName = fc.category?.name ?? "";
      if (!categoryName) return { ...fc, itemCount: 0 };
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_type", categoryName)
        .eq("is_active", true);
      return { ...fc, itemCount: count || 0 };
    })
  );

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

      {/* 5. Review Grid */}
      <ReviewGrid reviews={reviews} />

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
