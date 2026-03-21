"use client";

import { useState } from "react";
import { HeroSlidesTab } from "../settings/HeroSlidesTab";
import { TrustBarTab } from "../settings/TrustBarTab";
import { HomepageSectionsTab } from "../settings/HomepageSectionsTab";
import { NavigationTab } from "../settings/NavigationTab";
import { ReviewsTab } from "../settings/ReviewsTab";
import { AssetsTab } from "../settings/AssetsTab";
import { AboutPageTab } from "../settings/AboutPageTab";
import { GiftCardsTab } from "../settings/GiftCardsTab";

type TabKey = "hero-slides" | "trust-bar" | "homepage" | "navigation" | "reviews" | "assets" | "about" | "gift-cards";

export default function CMSPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("hero-slides");

    const tabs: { key: TabKey; label: string }[] = [
        { key: "hero-slides", label: "Hero Slides" },
        { key: "trust-bar",   label: "Trust Bar" },
        { key: "homepage",    label: "Sections" },
        { key: "navigation",  label: "Navigation" },
        { key: "reviews",     label: "Reviews" },
        { key: "about",       label: "About Page" },
        { key: "gift-cards",  label: "Gift Cards" },
        { key: "assets",      label: "Site Assets" },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4">
            <header className="mb-6">
                <h1 className="text-[20px] font-medium text-neutral-900 tracking-tight font-serif uppercase tracking-widest">CMS</h1>
                <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">Hero slides, homepage sections, navigation, and editorial content.</p>
            </header>

            {/* Horizontal Tabs */}
            <div className="flex overflow-x-auto border-b border-neutral-200 hide-scrollbar mb-8">
                <nav className="flex gap-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`whitespace-nowrap pb-4 px-1 border-b-2 text-xs uppercase tracking-widest font-semibold transition-all ${
                                activeTab === tab.key
                                    ? "border-black text-black"
                                    : "border-transparent text-neutral-400 hover:text-neutral-600"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Full Width Content Area */}
            <div className="w-full">
                {activeTab === "hero-slides" && <HeroSlidesTab />}
                {activeTab === "trust-bar"   && <TrustBarTab />}
                {activeTab === "homepage"    && <HomepageSectionsTab />}
                {activeTab === "navigation"  && <NavigationTab />}
                {activeTab === "reviews"     && <ReviewsTab />}
                {activeTab === "about"       && <AboutPageTab />}
                {activeTab === "gift-cards"  && <GiftCardsTab />}
                {activeTab === "assets"      && <AssetsTab />}
            </div>
        </div>
    );
}
