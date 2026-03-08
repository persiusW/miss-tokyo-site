"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ImageUploader } from "@/components/ui/badu/ImageUploader";
import { toast } from "@/lib/toast";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from "lucide-react";

type Category = { id: string; name: string; slug: string };

function SortableImageItem({ id, url, index, onUpload }: { id: string, url: string | null, index: number, onUpload: (id: string, url: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        position: (isDragging ? "relative" : "static") as any,
    };

    return (
        <div ref={setNodeRef} style={style} className={`relative bg-neutral-50 border border-neutral-200 transition-shadow ${isDragging ? "shadow-2xl opacity-90 scale-105" : ""}`}>
            <div className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing p-2 bg-white border border-neutral-200 shadow-sm rounded-md" {...attributes} {...listeners}>
                <GripVertical size={16} className="text-neutral-500 hover:text-black transition-colors" />
            </div>
            <div className="p-4 pt-12">
                <ImageUploader
                    bucket="product-images"
                    folder="products"
                    currentUrl={url}
                    onUpload={(newUrl) => onUpload(id, newUrl)}
                    aspectRatio="video"
                    label={index === 0 ? "Primary Image" : `Image ${index + 1}`}
                />
            </div>
        </div>
    );
}

export default function EditProductPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [imageSlots, setImageSlots] = useState<{ id: string, url: string | null }[]>([
        { id: 'slot-0', url: null },
        { id: 'slot-1', url: null },
        { id: 'slot-2', url: null },
        { id: 'slot-3', url: null },
    ]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [globalSizes, setGlobalSizes] = useState<string[]>([]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        price_ghs: 0,
        inventory_count: 0,
        description: "",
        category_type: "",
        is_active: true,
    });

    const fetchProduct = useCallback(async () => {
        const [{ data: product }, { data: cats }, { data: storeData }] = await Promise.all([
            supabase.from("products").select("*").eq("id", id).single(),
            supabase.from("categories").select("id, name, slug").eq("is_active", true).order("name"),
            supabase.from("store_settings").select("global_sizes").eq("id", "default").single()
        ]);

        if (!product) {
            toast.error("Product not found.");
            router.push("/catalog/products");
            return;
        }

        if (cats) setCategories(cats);

        setFormData({
            name: product.name || "",
            slug: product.slug || "",
            price_ghs: product.price_ghs || 0,
            inventory_count: product.inventory_count || 0,
            description: product.description || "",
            category_type: product.category_type || "",
            is_active: product.is_active ?? true,
        });

        const slots = [
            { id: 'slot-0', url: null as string | null },
            { id: 'slot-1', url: null as string | null },
            { id: 'slot-2', url: null as string | null },
            { id: 'slot-3', url: null as string | null },
        ];
        if (product.image_urls) {
            product.image_urls.forEach((url: string, i: number) => {
                if (i < 4) slots[i].url = url;
            });
        }
        setImageSlots(slots);

        if (storeData && storeData.global_sizes) {
            setGlobalSizes(storeData.global_sizes);
            // If product has available_sizes, use them. Otherwise, default to all global sizes or none.
            setSelectedSizes(product.available_sizes || storeData.global_sizes);
        }

        setLoading(false);
    }, [id, router]);

    useEffect(() => { fetchProduct(); }, [fetchProduct]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id: fieldId, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [fieldId]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleImageUpload = (id: string, url: string) => {
        setImageSlots(prev => prev.map(slot => slot.id === id ? { ...slot, url } : slot));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id && over) {
            setImageSlots((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const toggleSize = (size: string) => {
        setSelectedSizes(prev =>
            prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const uploadedUrls = imageSlots.map(s => s.url).filter((u): u is string => !!u);
            const { error } = await supabase.from("products").update({
                name: formData.name,
                slug: formData.slug,
                price_ghs: Number(formData.price_ghs),
                inventory_count: Number(formData.inventory_count),
                description: formData.description,
                category_type: formData.category_type,
                image_urls: uploadedUrls,
                available_sizes: selectedSizes,
                is_active: formData.is_active,
            }).eq("id", id);

            if (error) throw error;
            toast.success("Product updated.");
            router.push("/catalog/products");
            router.refresh();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update product.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-neutral-500 italic font-serif">Loading product...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 max-w-3xl">
            <header>
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
                    <Link href="/catalog/products" className="hover:text-black">Products</Link>
                    <span>/</span>
                    <span className="text-black">Edit</span>
                </div>
                <h1 className="font-serif text-3xl tracking-widest uppercase mb-2">Edit Product</h1>
                <p className="text-neutral-500">{formData.name}</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <div className="bg-white p-8 border border-neutral-200 space-y-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Basic Information</h2>

                    <div>
                        <label htmlFor="name" className="block text-xs uppercase tracking-widest font-semibold mb-3">Product Name</label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label htmlFor="slug" className="block text-xs uppercase tracking-widest font-semibold mb-3">URL Slug</label>
                            <input
                                type="text"
                                id="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                required
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="category_type" className="block text-xs uppercase tracking-widest font-semibold mb-3">Category</label>
                            {categories.length === 0 ? (
                                <div className="border-b border-neutral-200 py-2">
                                    <span className="text-sm text-neutral-400 italic">No categories — </span>
                                    <Link href="/catalog/categories" className="text-sm text-black underline">add one first</Link>
                                </div>
                            ) : (
                                <select
                                    id="category_type"
                                    value={formData.category_type}
                                    onChange={handleChange}
                                    className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none appearance-none"
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.slug}>{cat.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-xs uppercase tracking-widest font-semibold mb-3">Description</label>
                        <textarea
                            id="description"
                            rows={4}
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full border border-neutral-200 p-4 bg-transparent outline-none focus:border-black transition-colors resize-y"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="w-4 h-4 accent-black"
                        />
                        <label htmlFor="is_active" className="text-xs uppercase tracking-widest font-semibold">Active (visible in shop)</label>
                    </div>

                    <div className="pt-8 border-t border-neutral-100">
                        <label className="block text-xs uppercase tracking-widest font-semibold mb-3">Available Sizes</label>
                        {globalSizes.length === 0 ? (
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400">Loading sizes from store settings...</p>
                        ) : (
                            <div className="flex flex-wrap gap-4">
                                {globalSizes.map(size => (
                                    <label key={size} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedSizes.includes(size)}
                                            onChange={() => toggleSize(size)}
                                            className="w-4 h-4 accent-black"
                                        />
                                        <span className="text-sm font-medium">{size}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-neutral-400 mt-2 tracking-wider uppercase">Select the sizes available for this specific product.</p>
                    </div>
                </div>

                {/* Pricing & Inventory */}
                <div className="bg-white p-8 border border-neutral-200 space-y-8">
                    <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Pricing & Inventory</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label htmlFor="price_ghs" className="block text-xs uppercase tracking-widest font-semibold mb-3">Price (GHS)</label>
                            <input
                                type="number"
                                id="price_ghs"
                                value={formData.price_ghs}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                required
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                            />
                        </div>
                        <div>
                            <label htmlFor="inventory_count" className="block text-xs uppercase tracking-widest font-semibold mb-3">Inventory Count</label>
                            <input
                                type="number"
                                id="inventory_count"
                                value={formData.inventory_count}
                                onChange={handleChange}
                                min="0"
                                required
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black transition-colors rounded-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Media — up to 4 images */}
                <div className="bg-white p-8 border border-neutral-200 space-y-6">
                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-widest border-b border-neutral-200 pb-4">Product Images</h2>
                        <p className="text-[10px] text-neutral-400 tracking-wider uppercase mt-4 block">Upload up to 4 images. The first image is the primary display photo. Drag by the icon to reorder.</p>
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={imageSlots.map(s => s.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid grid-cols-2 gap-6">
                                {imageSlots.map((slot, index) => (
                                    <SortableImageItem
                                        key={slot.id}
                                        id={slot.id}
                                        url={slot.url}
                                        index={index}
                                        onUpload={handleImageUpload}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="pt-4 flex justify-end gap-4">
                    <Link
                        href="/catalog/products"
                        className="px-6 py-4 text-xs uppercase tracking-widest hover:bg-neutral-100 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-4 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Update Product"}
                    </button>
                </div>
            </form>
        </div>
    );
}
