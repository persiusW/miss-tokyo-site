"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      document.body.style.overflow = "hidden";
    } else {
      setQuery("");
      setResults([]);
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (query.trim().length <= 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, image_url")
        .ilike("name", `%${query}%`)
        .limit(6);
      
      setResults(data || []);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-black border-b border-gray-900 w-full px-6 py-8 shadow-2xl">
        {/* Search bar */}
        <div className="max-w-3xl mx-auto flex items-center gap-6 border-b border-gray-800 pb-5">
          <Search size={22} strokeWidth={1.5} className="text-gray-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search collection..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white text-xl md:text-2xl outline-none placeholder:text-gray-800 font-serif tracking-tight"
          />
          {loading ? <Loader2 size={18} className="animate-spin text-gray-500" /> : (
             <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
               <X size={24} strokeWidth={1.5} />
             </button>
          )}
        </div>

        {/* Results Container */}
        <div className="max-w-3xl mx-auto">
          {results.length > 0 && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {results.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-between p-3 border border-gray-900 bg-neutral-950 hover:bg-neutral-900 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-16 bg-gray-900 shrink-0 overflow-hidden">
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white mb-1">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">GHS {p.price}</p>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-gray-800 group-hover:text-white transition-colors translate-x-0 group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          )}

          {query.trim().length > 1 && results.length === 0 && !loading && (
            <div className="mt-12 text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-700 italic">No matches found in the current collection.</p>
            </div>
          )}

          {query.trim().length <= 1 && (
            <div className="mt-12 text-center opacity-20">
              <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-bold">Awaiting Input Parameters...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
