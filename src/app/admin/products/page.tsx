"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Edit2, Trash2, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";
import { ConfirmationModal } from "@/components/ui/miss-tokyo/ConfirmationModal";

type Product = {
  id: string;
  name: string;
  slug: string;
  category_type: string;
  price_ghs: number;
  inventory_count: number;
  is_active: boolean;
  image_urls: string[] | null;
  sizes: string[] | null;
  colors: string[] | null;
  compare_price_ghs: number | null;
};

export default function AdminProducts() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        toast.error("Failed to load products.");
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      console.error("Fetch products error:", err);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (id: string) => {
    const deletePromise = async () => {
        const { error } = await supabase.from("products").delete().eq("id", id);
        if (error) throw error;
    };

    toast.promise(deletePromise(), {
      loading: 'Purging specimen from records...',
      success: 'Specimen successfully removed.',
      error: (err) => `Purge failed: ${err.message}`,
    }).then(() => {
      setProducts(prev => prev.filter(p => p.id !== id));
    });
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category_type || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Products</h1>
          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Arial, sans-serif" }}>
            {loading ? "Loading collection..." : `${products.length} products total`}
          </p>
        </div>
        <Link href="/admin/products/new" className="flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-widest px-5 py-2.5 hover:bg-gray-900 transition-colors"
          style={{ fontFamily: "Arial, sans-serif" }}>
          <Plus size={13} strokeWidth={2} /> Add Product
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
        <input 
          type="text" 
          placeholder="Search products…" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 pl-8 pr-3 py-2 text-xs text-gray-700 outline-none focus:border-black transition-colors"
          style={{ fontFamily: "Arial, sans-serif" }} 
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Product", "Category", "Price", "Stock", "Sizes", "Colors", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-gray-400"
                  style={{ fontFamily: "Arial, sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-20 text-center text-xs text-gray-400 italic">
                  Retrieving your collection...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-20 text-center text-xs text-gray-400 italic">
                  No products found matching your search.
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                        {p.image_urls?.[0] ? (
                          <img src={p.image_urls[0]} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-50 items-center justify-center flex text-[8px] text-gray-300 uppercase">No Img</div>
                        )}
                      </div>
                      <span className="text-xs text-gray-900 font-medium" style={{ fontFamily: "Arial, sans-serif" }}>{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500" style={{ fontFamily: "Arial, sans-serif" }}>{p.category_type || "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-900" style={{ fontFamily: "Arial, sans-serif" }}>
                    GH₵{p.price_ghs}
                    {p.compare_price_ghs && <span className="ml-1 line-through text-gray-400">GH₵{p.compare_price_ghs}</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium ${p.inventory_count === 0 ? "text-red-600" : p.inventory_count < 5 ? "text-amber-600" : "text-gray-900"}`}
                      style={{ fontFamily: "Arial, sans-serif" }}>
                      {p.inventory_count === 0 ? "Out of Stock" : p.inventory_count}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[10px] text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{p.sizes?.join(", ") || "—"}</td>
                  <td className="px-5 py-3.5 text-[10px] text-gray-400" style={{ fontFamily: "Arial, sans-serif" }}>{p.colors?.join(", ") || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${p.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
                      style={{ fontFamily: "Arial, sans-serif" }}>
                      {p.is_active ? "Active" : "Draft"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/products/${p.id}/edit`} className="text-gray-400 hover:text-black transition-colors">
                        <Edit2 size={13} strokeWidth={1.5} />
                      </Link>
                      <button onClick={() => setDeleteId(p.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Purge Specimen"
        message="This action will permanently remove this item from the Miss Tokyo archives. This cannot be undone."
        confirmLabel="Permanent Purge"
      />
    </div>
  );
}
