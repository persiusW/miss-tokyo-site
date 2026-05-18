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
        <>
            <div className="ac-page-head">
                <div>
                    <h1 className="ac-page-h1">CMS</h1>
                    <p className="ac-page-sub">Hero slides, homepage sections, navigation, and editorial content.</p>
                </div>
            </div>

            <div className="ac-tabs" style={{ marginBottom: 28 }}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`ac-tab ${activeTab === tab.key ? "active" : ""}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div>
                {activeTab === "hero-slides" && <HeroSlidesTab />}
                {activeTab === "trust-bar"   && <TrustBarTab />}
                {activeTab === "homepage"    && <HomepageSectionsTab />}
                {activeTab === "navigation"  && <NavigationTab />}
                {activeTab === "reviews"     && <ReviewsTab />}
                {activeTab === "about"       && <AboutPageTab />}
                {activeTab === "gift-cards"  && <GiftCardsTab />}
                {activeTab === "assets"      && <AssetsTab />}
            </div>
        </>
    );
}
