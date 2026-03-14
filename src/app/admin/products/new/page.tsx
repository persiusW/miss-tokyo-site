"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseBrowser";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { ChevronLeft, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

type Category = {
  id: string;
  name: string;
};

type GlobalSettings = {
  global_sizes: string[];
  global_colors: string[];
};

export default function NewProductPage() {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    global_sizes: [],
    global_colors: [],
  });
  
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    compare_price: "",
    inventory: "0",
    category_type: "",
    is_active: true,
    is_sale: false,
  });

  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: cats }, { data: settings }] = await Promise.all([
        supabase.from("categories").select("id, name"),
        supabase.from("store_settings").select("global_sizes, global_colors").eq("id", 1).single()
      ]);
      if (cats) setCategories(cats);
      if (settings) {
        setGlobalSettings({
          global_sizes: settings.global_sizes || [],
          global_colors: settings.global_colors || [],
        });
      }
    };
    fetchData();
  }, [supabase]);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w ]+/g, "")
      .replace(/ +/g, "-");
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: slugify(name)
    }));
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.category_type) {
      toast.error("Please fill in required fields.");
      return;
    }

    setLoading(true);
    const savePromise = async () => {
        const { data, error } = await supabase
          .from("products")
          .insert([{
            name: form.name,
            slug: form.slug,
            description: form.description || null,
            price_ghs: parseFloat(form.price),
            compare_price_ghs: form.compare_price ? parseFloat(form.compare_price) : null,
            inventory_count: parseInt(form.inventory),
            category_type: form.category_type,
            media: mediaUrls,
            sizes: selectedSizes,
            colors: selectedColors,
            is_active: form.is_active,
            is_sale: form.is_sale,
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
    };

    toast.promise(savePromise(), {
      loading: 'Architecting specimen data...',
      success: 'Product successfully added to collection.',
      error: (err) => `Failed to save: ${err.message}`,
    }).then(() => {
      router.push("/admin/products");
      router.refresh();
    }).finally(() => {
      setLoading(false);
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/admin/products" className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 hover:text-black transition-colors mb-8 group">
        <ChevronLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Back to Collection
      </Link>

      <form onSubmit={handleSubmit} className="space-y-12">
        <header className="flex items-end justify-between border-b border-gray-100 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-black" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>New Specimen</h1>
            <p className="text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-widest">Atelier Catalog Input — v2.5</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white text-[11px] uppercase tracking-[0.2em] px-10 py-4 hover:bg-neutral-800 transition-all font-bold disabled:opacity-50"
          >
            {loading ? "Persisting..." : "Save Product"}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-12">
               <ImageUploader 
                bucket="product-images"
                folder="catalog"
                currentUrls={mediaUrls}
                onUpload={setMediaUrls}
                maxFiles={5}
                aspectRatio="video"
                label="Product Visual Media (Images or MP4 — Max 5)"
              />
          </div>

          <div className="lg:col-span-7 space-y-12">
            <section className="space-y-8">
              <h2 className="text-[11px] uppercase tracking-[0.3em] font-bold text-gray-900 border-b border-gray-100 pb-2">Core Identity</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Name *</label>
                  <input
                    type="text" required value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-white border border-gray-300 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3"
                    placeholder="e.g. Noir Silk Slip"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Slug</label>
                  <input
                    type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Description</label>
                  <textarea
                    rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3"
                    placeholder="Technical details..."
                  />
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <h2 className="text-[11px] uppercase tracking-[0.3em] font-bold text-gray-900 border-b border-gray-100 pb-2">Variant Curation</h2>
              <div className="space-y-8">
                <div>
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Available Sizes</label>
                  <div className="flex flex-wrap gap-2">
                    {globalSettings.global_sizes.map(size => (
                      <button
                        key={size} type="button" onClick={() => toggleSize(size)}
                        className={`px-4 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all ${
                          selectedSizes.includes(size) ? "bg-black text-white border-black" : "bg-white text-gray-400 border-gray-200 hover:border-black"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Core Colors</label>
                  <div className="flex flex-wrap gap-2">
                    {globalSettings.global_colors.map(color => (
                        <button
                          key={color} type="button" onClick={() => toggleColor(color)}
                          className={`px-4 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all ${
                            selectedColors.includes(color) ? "bg-black text-white border-black" : "bg-white text-gray-400 border-gray-200 hover:border-black"
                          }`}
                        >
                          {color}
                        </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-5 space-y-12">
            <section className="space-y-8">
              <h2 className="text-[11px] uppercase tracking-[0.3em] font-bold text-gray-900 border-b border-gray-100 pb-2">Financials</h2>
              <div className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Price (GH₵) *</label>
                    <input
                      type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full bg-white border border-gray-300 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3"
                      placeholder="0.00"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Compare At (GH₵)</label>
                    <input
                      type="number" step="0.01" value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: e.target.value })}
                      className="w-full bg-white border border-gray-300 text-black placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3"
                      placeholder="0.00"
                    />
                </div>
              </div>
            </section>

            <section className="space-y-8">
              <h2 className="text-[11px] uppercase tracking-[0.3em] font-bold text-gray-900 border-b border-gray-100 pb-2">Status & Classification</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">Category Segment *</label>
                  <select
                    required value={form.category_type} onChange={(e) => setForm({ ...form, category_type: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-black text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black block p-3"
                  >
                    <option value="">Unclassified</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-6 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-black border-gray-200" />
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest font-bold text-gray-900 group-hover:text-black transition-colors">Visible in Storefront</span>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={form.is_sale} onChange={(e) => setForm({ ...form, is_sale: e.target.checked })} className="w-4 h-4 accent-black border-gray-200" />
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest font-bold text-gray-900 group-hover:text-black transition-colors">Apply Sale Status</span>
                      <span className="block text-[9px] text-gray-600 mt-1 uppercase tracking-widest">Enabling this adds the 'SALE' ribbon on storefront</span>
                    </div>
                  </label>
                </div>
              </div>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
