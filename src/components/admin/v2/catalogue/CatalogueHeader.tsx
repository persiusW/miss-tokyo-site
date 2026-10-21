"use client";

// The Products area's header and route tabs. Every tab is its own URL
// (/catalogue, /catalogue/inventory, /catalogue/categories,
// /catalogue/gift-cards); the primary action changes with the tab.
import type { ReactNode } from "react";
import { PageHeader, Tabs } from "@/components/admin/ui";
import "./catalogue.css";

export type CatalogueTab = "products" | "inventory" | "categories" | "gift-cards";

const TABS: { v: CatalogueTab; l: string; href: string }[] = [
    { v: "products", l: "Products", href: "/catalogue" },
    { v: "inventory", l: "Inventory", href: "/catalogue/inventory" },
    { v: "categories", l: "Categories", href: "/catalogue/categories" },
    { v: "gift-cards", l: "Gift cards", href: "/catalogue/gift-cards" },
];

export function CatalogueHeader({ tab, actions }: { tab: CatalogueTab; actions?: ReactNode }) {
    return (
        <>
            <PageHeader title="Products" sub="What's in the shop, what it costs you and how much is left." actions={actions} />
            <div className="cat-tabs"><Tabs label="Products sections" value={tab} tabs={TABS} /></div>
        </>
    );
}
