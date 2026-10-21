"use client";

// Tab buttons over the New Arrivals carousel, shown only when Content ›
// Home page › New arrivals has more than one tab with products in it.
import { useState, type ComponentProps } from "react";
import { NewArrivalsCarousel } from "./NewArrivalsCarousel";

type Products = ComponentProps<typeof NewArrivalsCarousel>["products"];

export function NewArrivalsTabs({ tabs }: { tabs: { label: string; products: Products }[] }) {
    const [active, setActive] = useState(0);
    const tab = tabs[Math.min(active, tabs.length - 1)];
    return (
        <>
            <div role="tablist" aria-label="New arrivals" className="flex flex-wrap gap-x-6 gap-y-2 mb-8">
                {tabs.map((t, i) => (
                    <button
                        key={`${i}-${t.label}`}
                        type="button"
                        role="tab"
                        id={`na-tab-${i}`}
                        aria-selected={i === active}
                        aria-controls="na-panel"
                        onClick={() => setActive(i)}
                        className={`min-h-[44px] text-[10px] md:text-xs tracking-[0.2em] font-medium uppercase transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 ${
                            i === active ? "text-black underline underline-offset-8 decoration-1" : "text-neutral-400 hover:text-black"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div role="tabpanel" id="na-panel" aria-labelledby={`na-tab-${active}`}>
                {/* key: each tab starts at its first page */}
                <NewArrivalsCarousel key={active} products={tab.products} />
            </div>
        </>
    );
}
