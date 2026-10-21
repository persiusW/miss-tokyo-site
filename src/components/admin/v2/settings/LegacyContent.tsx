"use client";

// Site content editors from the old Settings page (CMS, Size Guide, Product
// Page, the home page carousel and SEO for the other pages). They move to
// Content; until that area is switched on they stay reachable here, unchanged,
// each with its own Save as before.
import { useState } from "react";
import { Banner, Tabs } from "@/components/admin/ui";
import { HeroSlidesTab } from "@/app/(dashboard)/settings/HeroSlidesTab";
import { TrustBarTab } from "@/app/(dashboard)/settings/TrustBarTab";
import { HomepageSectionsTab } from "@/app/(dashboard)/settings/HomepageSectionsTab";
import { NavigationTab } from "@/app/(dashboard)/settings/NavigationTab";
import { ReviewsTab } from "@/app/(dashboard)/settings/ReviewsTab";
import { AboutPageTab } from "@/app/(dashboard)/settings/AboutPageTab";
import { GiftCardsTab } from "@/app/(dashboard)/settings/GiftCardsTab";
import { AssetsTab } from "@/app/(dashboard)/settings/AssetsTab";
import { SizeGuideTab } from "@/app/(dashboard)/settings/SizeGuideTab";
import { ProductPageTab } from "@/app/(dashboard)/settings/ProductPageTab";
import { CarouselConfigSection, SEOTab } from "@/app/(dashboard)/settings/LegacySettingsPage";

const TABS = [
    { v: "hero", l: "Hero slides" }, { v: "trust", l: "Trust bar" }, { v: "sections", l: "Home sections" },
    { v: "carousel", l: "Carousel" }, { v: "nav", l: "Navigation" }, { v: "reviews", l: "Reviews" },
    { v: "about", l: "About page" }, { v: "gift", l: "Gift card page" }, { v: "assets", l: "Site assets" },
    { v: "size", l: "Size guide" }, { v: "pdp", l: "Product page" }, { v: "seo", l: "Other pages' SEO" },
] as const;
type T = (typeof TABS)[number]["v"];

export function LegacyContent() {
    const [t, setT] = useState<T>("hero");
    return (
        <div className="stack" style={{ width: "100%" }}>
            <Banner tone="info" title="Each editor saves on its own">These are the editors from the old Settings page, unchanged. They move to Content once it&apos;s switched on.</Banner>
            <div className="set-tabs-scroll"><Tabs label="Site content" tabs={TABS.map(x => ({ v: x.v, l: x.l }))} value={t} onChange={setT} /></div>
            {/* The old editors were drawn for the light theme only, so they keep it. */}
            <div className="adm2 set-legacy-card set-legacy-light" data-theme="light">
                {t === "hero" && <HeroSlidesTab />}
                {t === "trust" && <TrustBarTab />}
                {t === "sections" && <HomepageSectionsTab />}
                {t === "carousel" && <CarouselConfigSection />}
                {t === "nav" && <NavigationTab />}
                {t === "reviews" && <ReviewsTab />}
                {t === "about" && <AboutPageTab />}
                {t === "gift" && <GiftCardsTab />}
                {t === "assets" && <AssetsTab />}
                {t === "size" && <SizeGuideTab />}
                {t === "pdp" && <ProductPageTab />}
                {t === "seo" && <SEOTab />}
            </div>
        </div>
    );
}
