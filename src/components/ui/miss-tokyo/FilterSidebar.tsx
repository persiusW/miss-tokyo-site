"use client";

import { useState } from "react";
import { Plus, Minus, SlidersHorizontal, X } from "lucide-react";

const FILTERS = [
  {
    label: "Category",
    options: ["Tops", "Dresses", "Leggings", "Pants", "Accessories"],
  },
  { label: "Price", options: ["Under GH₵50", "GH₵50–100", "GH₵100–200", "GH₵200+"] },
  { label: "Color", options: ["Black", "White", "Pink", "Red", "Blue", "Beige"] },
  { label: "Size", options: ["XS", "S", "M", "L", "XL", "XXL"] },
  { label: "Choices", options: ["New Arrivals", "Sale", "Best Sellers"] },
];

function AccordionItem({ label, options }: { label: string; options: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-[11px] uppercase tracking-widest text-gray-700 hover:text-black transition-colors"
      >
        {label}
        {open ? <Minus size={14} strokeWidth={1.5} /> : <Plus size={14} strokeWidth={1.5} />}
      </button>
      {open && (
        <ul className="mt-3 flex flex-col gap-2">
          {options.map((opt) => (
            <li key={opt}>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  className="accent-black w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-xs text-gray-600 group-hover:text-black transition-colors tracking-wide">
                  {opt}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface FilterSidebarProps {
  /** Controls the mobile drawer open state from parent */
  open?: boolean;
  onClose?: () => void;
}

export function FilterSidebar({ open = false, onClose }: FilterSidebarProps) {
  const content = (
    <>
      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-4">
        Filter By
      </p>
      {FILTERS.map((f) => (
        <AccordionItem key={f.label} label={f.label} options={f.options} />
      ))}
    </>
  );

  return (
    <>
      {/* DESKTOP — sticky sidebar */}
      <aside className="hidden md:block w-52 shrink-0 sticky top-20 self-start">
        {content}
      </aside>

      {/* MOBILE — slide-in drawer */}
      {open && (
        <div className="fixed inset-0 z-[100] flex md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-full bg-white h-full overflow-y-auto shadow-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] uppercase tracking-widest text-gray-700 font-semibold">
                Filter By
              </span>
              <button onClick={onClose} className="text-gray-600 hover:text-black">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            {FILTERS.map((f) => (
              <AccordionItem key={f.label} label={f.label} options={f.options} />
            ))}
            <button
              onClick={onClose}
              className="mt-8 w-full bg-black text-white text-[11px] uppercase tracking-widest py-3 hover:bg-gray-900 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Trigger button for the mobile filter drawer */
export function FilterToggleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden flex items-center gap-2 border border-gray-300 text-[11px] uppercase tracking-widest px-4 py-2 text-gray-700 hover:text-black hover:border-black transition-colors"
    >
      <SlidersHorizontal size={14} strokeWidth={1.5} />
      Filters
    </button>
  );
}
