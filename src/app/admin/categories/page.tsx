"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";
import { Pencil, Trash2, X, Check, Search, Plus } from "lucide-react";
import { toast } from "@/lib/toast";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};

export default function AdminCategories() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", description: "", image_url: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setCategories(data);
    } catch (err: any) {
      toast.error("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleNameChange = (name: string) => {
    setForm(prev => ({ ...prev, name, slug: slugify(name) }));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);

    const { error } = await supabase.from("categories").insert([{
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || null,
      image_url: newImageUrl || null,
      is_active: true,
    }]);

    if (error) {
      toast.error("Failed to add category.");
    } else {
      toast.success("Category added.");
      setForm({ name: "", slug: "", description: "" });
      setNewImageUrl(null);
      setIsAdding(false);
      await fetchCategories();
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: !is_active } : c));
    await supabase.from("categories").update({ is_active: !is_active }).eq("id", id);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete category.");
    } else {
      toast.success("Category deleted.");
      setCategories(prev => prev.filter(c => c.id !== id));
    }
    setConfirmDeleteId(null);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image_url: cat.image_url || "",
    });
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    const { error } = await supabase.from("categories").update({
      name: editForm.name,
      slug: editForm.slug,
      description: editForm.description || null,
      image_url: editForm.image_url || null,
    }).eq("id", id);

    if (error) {
      toast.error("Failed to update category.");
    } else {
      toast.success("Category updated.");
      setEditingId(null);
      await fetchCategories();
    }
    setSaving(false);
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>Categories</h1>
          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "Arial, sans-serif" }}>
            {loading ? "Loading categories..." : `${categories.length} segments total`}
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-black text-white text-[11px] uppercase tracking-widest px-5 py-2.5 hover:bg-gray-900 transition-colors"
          style={{ fontFamily: "Arial, sans-serif" }}>
          {isAdding ? <X size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
          {isAdding ? "Cancel" : "New Category"}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white border border-gray-200 p-8 mb-8 space-y-6">
          <h2 className="text-[11px] uppercase tracking-widest font-semibold text-black mb-4">Add New Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                  placeholder="e.g. Dresses"
                  className="w-full border-b border-gray-200 bg-transparent py-2 text-xs outline-none focus:border-black transition-colors"
                  style={{ fontFamily: "Arial, sans-serif" }}
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                  required
                  className="w-full border-b border-gray-200 bg-transparent py-2 text-xs font-mono outline-none focus:border-black transition-colors text-gray-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-semibold text-gray-400 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional brief description"
                  className="w-full border-b border-gray-200 bg-transparent py-2 text-xs outline-none focus:border-black transition-colors"
                  style={{ fontFamily: "Arial, sans-serif" }}
                />
              </div>
            </div>
            <div>
              <ImageUploader
                bucket="product-images"
                folder="categories"
                currentUrl={null}
                onUpload={setNewImageUrl}
                aspectRatio="video"
                label="Category Featured Image"
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {saving ? "Saving..." : "Create Category"}
            </button>
          </div>
        </form>
      )}

      {/* Filter / Search */}
      <div className="relative mb-5 max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={1.5} />
        <input 
          type="text" 
          placeholder="Search categories…" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 pl-8 pr-3 py-2 text-xs text-gray-700 outline-none focus:border-black transition-colors"
          style={{ fontFamily: "Arial, sans-serif" }} 
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Image", "Name", "Slug", "Description", "Status", "Actions"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-gray-400"
                  style={{ fontFamily: "Arial, sans-serif" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-20 text-center text-xs text-gray-400 italic">
                  Fetching atelier segments...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-20 text-center text-xs text-gray-400 italic">
                  No categories found.
                </td>
              </tr>
            ) : (
              filtered.map(cat => (
                <tr key={cat.id} className={`hover:bg-gray-50 transition-colors ${editingId === cat.id ? 'bg-gray-50' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="w-16 h-10 bg-gray-50 border border-gray-100 overflow-hidden">
                      {editingId === cat.id ? (
                        <ImageUploader
                          bucket="product-images"
                          folder="categories"
                          currentUrl={editForm.image_url}
                          onUpload={url => setEditForm(prev => ({ ...prev, image_url: url }))}
                          aspectRatio="video"
                          label=""
                        />
                      ) : cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-300 uppercase">No Img</div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === cat.id ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full border-b border-black bg-transparent py-1 text-xs outline-none"
                      />
                    ) : (
                      <span className="text-xs text-gray-900 font-medium" style={{ fontFamily: "Arial, sans-serif" }}>{cat.name}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === cat.id ? (
                      <input
                        type="text"
                        value={editForm.slug}
                        onChange={e => setEditForm(prev => ({ ...prev, slug: e.target.value }))}
                        className="w-full border-b border-black bg-transparent py-1 text-[10px] font-mono outline-none"
                      />
                    ) : (
                      <span className="text-[10px] font-mono text-gray-500">{cat.slug}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500" style={{ fontFamily: "Arial, sans-serif" }}>
                    {editingId === cat.id ? (
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border-b border-black bg-transparent py-1 text-xs outline-none"
                      />
                    ) : (
                      <div className="max-w-xs truncate">{cat.description || "—"}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === cat.id ? (
                      <span className="text-[10px] uppercase font-bold text-gray-400">Editing</span>
                    ) : (
                      <button 
                        onClick={() => toggleActive(cat.id, cat.is_active)}
                        className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-full ${cat.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
                        style={{ fontFamily: "Arial, sans-serif" }}>
                        {cat.is_active ? "Active" : "Disabled"}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                       {editingId === cat.id ? (
                         <>
                           <button onClick={() => handleSaveEdit(cat.id)} disabled={saving} className="text-black hover:text-green-600">
                             <Check size={14} />
                           </button>
                           <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-red-600">
                             <X size={14} />
                           </button>
                         </>
                       ) : (
                         <>
                           <button onClick={() => startEdit(cat)} className="text-gray-400 hover:text-black">
                             <Pencil size={13} strokeWidth={1.5} />
                           </button>
                           {confirmDeleteId === cat.id ? (
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleDelete(cat.id)} className="text-[9px] uppercase font-bold text-red-600">Confirm</button>
                                <button onClick={() => setConfirmDeleteId(null)} className="text-[9px] uppercase font-bold text-gray-400">Exit</button>
                              </div>
                           ) : (
                              <button onClick={() => setConfirmDeleteId(cat.id)} className="text-gray-400 hover:text-red-600">
                                <Trash2 size={13} strokeWidth={1.5} />
                              </button>
                           )}
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
