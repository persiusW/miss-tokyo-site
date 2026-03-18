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

const CMS_TAB_GROUPS: { group: string; tabs: { key: TabKey; label: string }[] }[] = [
    {
        group: "Homepage",
        tabs: [
            { key: "hero-slides", label: "Hero Slides" },
            { key: "trust-bar",   label: "Trust Bar" },
            { key: "homepage",    label: "Sections" },
        ],
    },
    {
        group: "Content",
        tabs: [
            { key: "navigation", label: "Navigation" },
            { key: "reviews",    label: "Reviews" },
            { key: "about",       label: "About Page" },
            { key: "gift-cards", label: "Gift Cards" },
            { key: "assets",     label: "Site Assets" },
        ],
    },
];

export default function CMSPage() {
    const [activeTab, setActiveTab] = useState<TabKey>("hero-slides");

    return (
        <div className="max-w-6xl">
            <header className="mb-8">
                <h1 className="text-[20px] font-medium text-neutral-900 tracking-tight">CMS</h1>
                <p className="text-sm text-neutral-500 mt-1">Hero slides, homepage sections, navigation, and editorial content.</p>
            </header>

            <div className="flex gap-8 items-start">
                {/* Vertical tab nav */}
                <aside className="w-44 shrink-0 sticky top-6">
                    <nav className="space-y-5">
                        {CMS_TAB_GROUPS.map((group) => (
                            <div key={group.group}>
                                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-1 px-2">
                                    {group.group}
                                </p>
                                <ul className="space-y-0.5">
                                    {group.tabs.map((tab) => (
                                        <li key={tab.key}>
                                            <button
                                                onClick={() => setActiveTab(tab.key)}
                                                className={`w-full text-left px-2 py-[7px] text-sm transition-colors rounded ${
                                                    activeTab === tab.key
                                                        ? "bg-neutral-100 text-black font-semibold"
                                                        : "text-neutral-500 hover:bg-neutral-50 hover:text-black"
                                                }`}
                                                style={
                                                    activeTab === tab.key
                                                        ? { borderLeft: "2px solid black", borderRadius: "0 6px 6px 0", paddingLeft: "6px" }
                                                        : {}
                                                }
                                            >
                                                {tab.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Tab content */}
                <div className="flex-1 min-w-0">
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
        </div>
    );
}
