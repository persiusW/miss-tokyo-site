"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import {
    Eye,
    EyeOff,
    ChevronDown,
    ChevronUp,
    Trash2,
    ArrowUp,
    ArrowDown,
    Plus,
} from "lucide-react";
import { ImageUploader } from "@/components/ui/miss-tokyo/ImageUploader";

type HeroSlide = {
    id: string;
    position: number;
    enabled: boolean;
    eyebrow: string;
    headline_line1: string;
    headline_line2: string;
    headline_line3: string;
    body_text: string;
    cta_primary_label: string;
    cta_primary_url: string;
    cta_secondary_label: string;
    cta_secondary_url: string;
    image_url: string;
    overlay_opacity: number;
};

const DEFAULT_SLIDE = (position: number): Omit<HeroSlide, "id"> => ({
    position,
    enabled: true,
    eyebrow: "",
    headline_line1: "New Slide",
    headline_line2: "",
    headline_line3: "",
    body_text: "",
    cta_primary_label: "Shop Now",
    cta_primary_url: "/shop",
    cta_secondary_label: "",
    cta_secondary_url: "",
    image_url: "",
    overlay_opacity: 0.45,
});

const INPUT_CLASS =
    "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors";
const LABEL_CLASS =
    "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2";

export function HeroSlidesTab() {
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase
            .from("hero_slides")
            .select("*")
            .order("position", { ascending: true })
            .then(({ data }: { data: any }) => {
                const STRING_FIELDS: (keyof HeroSlide)[] = [
                    "eyebrow", "headline_line1", "headline_line2", "headline_line3",
                    "body_text", "cta_primary_label", "cta_primary_url",
                    "cta_secondary_label", "cta_secondary_url", "image_url",
                ];
                const normalized = (data ?? []).map((s: any) => {
                    const slide = { ...s };
                    STRING_FIELDS.forEach(f => { if (slide[f] == null) slide[f] = ""; });
                    return slide as HeroSlide;
                });
                setSlides(normalized);
                setLoading(false);
            });
    }, []);

    const toggleExpand = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const updateSlide = (id: string, field: keyof HeroSlide, value: string | number | boolean) => {
        setSlides((prev) =>
            prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
    };

    const handleSaveSlide = async (slide: HeroSlide) => {
        setSaving((prev) => new Set(prev).add(slide.id));
        const { error } = await supabase
            .from("hero_slides")
            .upsert(slide, { onConflict: "id" });
        setSaving((prev) => {
            const next = new Set(prev);
            next.delete(slide.id);
            return next;
        });
        if (error) {
            toast.error("Failed to save slide");
        } else {
            toast.success("Slide saved");
        }
    };

    const handleAddSlide = async () => {
        const position = slides.length > 0
            ? Math.max(...slides.map((s) => s.position)) + 1
            : 1;
        const newSlide = { id: crypto.randomUUID(), ...DEFAULT_SLIDE(position) };
        const { error } = await supabase
            .from("hero_slides")
            .insert(newSlide);
        if (error) {
            toast.error("Failed to create slide");
            return;
        }
        setSlides((prev) => [...prev, newSlide]);
        setExpanded((prev) => new Set(prev).add(newSlide.id));
        toast.success("New slide added");
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this slide? This cannot be undone.")) return;
        const { error } = await supabase
            .from("hero_slides")
            .delete()
            .eq("id", id);
        if (error) {
            toast.error("Failed to delete slide");
            return;
        }
        setSlides((prev) => prev.filter((s) => s.id !== id));
        toast.success("Slide deleted");
    };

    const handleMove = async (index: number, direction: "up" | "down") => {
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= slides.length) return;

        const next = [...slides];
        const posA = next[index].position;
        const posB = next[swapIndex].position;
        next[index] = { ...next[index], position: posB };
        next[swapIndex] = { ...next[swapIndex], position: posA };
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
        setSlides(next);

        await Promise.all([
            supabase
                .from("hero_slides")
                .update({ position: posB })
                .eq("id", next[swapIndex].id),
            supabase
                .from("hero_slides")
                .update({ position: posA })
                .eq("id", next[index].id),
        ]);
    };

    if (loading) {
        return (
            <p className="text-neutral-400 italic font-serif">Loading...</p>
        );
    }

    return (
        <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xs font-semibold uppercase tracking-widest">
                        Hero Slides
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1">
                        Manage the rotating hero banners on the homepage.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleAddSlide}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    <Plus size={12} />
                    Add New Slide
                </button>
            </div>

            {slides.length === 0 && (
                <div className="bg-white border border-neutral-200 p-8 text-center">
                    <p className="text-sm text-neutral-400 italic">
                        No slides yet. Click "Add New Slide" to get started.
                    </p>
                </div>
            )}

            {slides.map((slide, index) => {
                const isExpanded = expanded.has(slide.id);
                const isSaving = saving.has(slide.id);

                return (
                    <div
                        key={slide.id}
                        className="bg-white border border-neutral-200"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 w-5 shrink-0">
                                {index + 1}
                            </span>

                            <span className="flex-1 text-sm font-medium truncate">
                                {slide.headline_line1 || "Untitled Slide"}
                            </span>

                            {/* Move buttons */}
                            <div className="flex gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleMove(index, "up")}
                                    disabled={index === 0}
                                    className="p-1 text-neutral-400 hover:text-black disabled:opacity-30 transition-colors"
                                >
                                    <ArrowUp size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMove(index, "down")}
                                    disabled={index === slides.length - 1}
                                    className="p-1 text-neutral-400 hover:text-black disabled:opacity-30 transition-colors"
                                >
                                    <ArrowDown size={14} />
                                </button>
                            </div>

                            {/* Enabled toggle */}
                            <button
                                type="button"
                                onClick={() =>
                                    updateSlide(slide.id, "enabled", !slide.enabled)
                                }
                                className="shrink-0 text-neutral-400 hover:text-black transition-colors"
                                title={slide.enabled ? "Visible" : "Hidden"}
                            >
                                {slide.enabled ? (
                                    <Eye size={16} />
                                ) : (
                                    <EyeOff size={16} className="text-neutral-300" />
                                )}
                            </button>

                            {/* Expand */}
                            <button
                                type="button"
                                onClick={() => toggleExpand(slide.id)}
                                className="shrink-0 text-neutral-400 hover:text-black transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronUp size={16} />
                                ) : (
                                    <ChevronDown size={16} />
                                )}
                            </button>

                            {/* Delete */}
                            <button
                                type="button"
                                onClick={() => handleDelete(slide.id)}
                                className="shrink-0 text-neutral-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Expanded form */}
                        {isExpanded && (
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className={LABEL_CLASS}>Eyebrow</label>
                                    <input
                                        type="text"
                                        value={slide.eyebrow}
                                        onChange={(e) =>
                                            updateSlide(slide.id, "eyebrow", e.target.value)
                                        }
                                        className={INPUT_CLASS}
                                        placeholder="New Collection"
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Headline Line 1{" "}
                                        <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={slide.headline_line1}
                                        onChange={(e) =>
                                            updateSlide(slide.id, "headline_line1", e.target.value)
                                        }
                                        className={INPUT_CLASS}
                                        placeholder="Crafted for"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Line 2 — italic gold
                                    </label>
                                    <input
                                        type="text"
                                        value={slide.headline_line2}
                                        onChange={(e) =>
                                            updateSlide(slide.id, "headline_line2", e.target.value)
                                        }
                                        className={INPUT_CLASS}
                                        placeholder="the discerning"
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>
                                        Headline Line 3
                                    </label>
                                    <input
                                        type="text"
                                        value={slide.headline_line3}
                                        onChange={(e) =>
                                            updateSlide(slide.id, "headline_line3", e.target.value)
                                        }
                                        className={INPUT_CLASS}
                                        placeholder="woman."
                                    />
                                </div>

                                <div>
                                    <label className={LABEL_CLASS}>Body Text</label>
                                    <textarea
                                        rows={3}
                                        value={slide.body_text}
                                        onChange={(e) =>
                                            updateSlide(slide.id, "body_text", e.target.value)
                                        }
                                        className={INPUT_CLASS + " resize-none"}
                                        placeholder="Handcrafted luxury footwear..."
                                    />
                                </div>

                                {/* CTAs */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Primary CTA Label
                                        </label>
                                        <input
                                            type="text"
                                            value={slide.cta_primary_label}
                                            onChange={(e) =>
                                                updateSlide(
                                                    slide.id,
                                                    "cta_primary_label",
                                                    e.target.value
                                                )
                                            }
                                            className={INPUT_CLASS}
                                            placeholder="Shop Now"
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Primary CTA URL
                                        </label>
                                        <input
                                            type="text"
                                            value={slide.cta_primary_url}
                                            onChange={(e) =>
                                                updateSlide(
                                                    slide.id,
                                                    "cta_primary_url",
                                                    e.target.value
                                                )
                                            }
                                            className={INPUT_CLASS}
                                            placeholder="/shop"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Secondary CTA Label
                                        </label>
                                        <input
                                            type="text"
                                            value={slide.cta_secondary_label}
                                            onChange={(e) =>
                                                updateSlide(
                                                    slide.id,
                                                    "cta_secondary_label",
                                                    e.target.value
                                                )
                                            }
                                            className={INPUT_CLASS}
                                            placeholder="Leave blank to hide"
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Secondary CTA URL
                                        </label>
                                        <input
                                            type="text"
                                            value={slide.cta_secondary_url}
                                            onChange={(e) =>
                                                updateSlide(
                                                    slide.id,
                                                    "cta_secondary_url",
                                                    e.target.value
                                                )
                                            }
                                            className={INPUT_CLASS}
                                            placeholder="/about"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-neutral-400 tracking-wider -mt-3">
                                    Leave secondary blank to hide the secondary button.
                                </p>

                                {/* Overlay opacity */}
                                <div>
                                    <label className={LABEL_CLASS}>
                                        Overlay Opacity —{" "}
                                        <span className="text-black font-normal">
                                            {Math.round(slide.overlay_opacity * 100)}%
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        value={slide.overlay_opacity}
                                        onChange={(e) =>
                                            updateSlide(
                                                slide.id,
                                                "overlay_opacity",
                                                parseFloat(e.target.value)
                                            )
                                        }
                                        className="w-full accent-black"
                                    />
                                </div>

                                {/* Slide Image */}
                                <ImageUploader
                                    bucket="site-assets"
                                    folder="hero-slides"
                                    currentUrl={slide.image_url || null}
                                    onUpload={(url) => updateSlide(slide.id, "image_url", url)}
                                    aspectRatio="video"
                                    label="Slide Image"
                                />

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSaveSlide(slide)}
                                        disabled={isSaving}
                                        className="px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? "Saving..." : "Save Slide"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
