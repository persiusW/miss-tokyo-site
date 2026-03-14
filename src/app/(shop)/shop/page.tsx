"use client";

import { useState } from "react";
import { FilterSidebar, FilterToggleButton } from "@/components/ui/miss-tokyo/FilterSidebar";
import { ProductGrid, latestProducts } from "@/components/ui/miss-tokyo/ProductGrid";

const SORT_OPTIONS = [
  "Featured",
  "Price: Low to High",
  "Price: High to Low",
  "Newest Arrivals",
  "Best Selling",
];

export default function ShopPage() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState("Featured");

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 md:px-10 pt-6 pb-20">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3 gap-4">
        <FilterToggleButton onClick={() => setFilterOpen(true)} />
        <div className="flex items-center gap-2">
          <label
            htmlFor="sort"
            className="text-[10px] uppercase tracking-widest text-gray-500 hidden sm:block"
          >
            Sort By
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-gray-300 text-[11px] uppercase tracking-wider text-gray-700 px-3 py-2 bg-white outline-none hover:border-black transition-colors cursor-pointer rounded-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex gap-10 items-start">
        <FilterSidebar
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
        />
        <div className="flex-1 min-w-0">
          <ProductGrid
            products={latestProducts}
            showTitle={false}
            className="py-0"
          />
        </div>
      </div>
    </div>
  );
}
