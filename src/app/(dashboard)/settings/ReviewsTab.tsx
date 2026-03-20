"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import {
    ChevronDown,
    ChevronUp,
    Trash2,
    ArrowUp,
    ArrowDown,
    Star,
} from "lucide-react";

type Review = {
    id: string;
    position: number;
    enabled: boolean;
    reviewer_name: string;
    reviewer_location: string;
    avatar_initials: string;
    avatar_color: string;
    star_rating: number;
    review_text: string;
};

const AVATAR_COLORS = [
    "#C4896A",
    "#8B5CF6",
    "#059669",
    "#DC2626",
    "#2563EB",
    "#D97706",
    "#EC4899",
    "#6B7280",
];

const INPUT_CLASS =
    "w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors";
const LABEL_CLASS =
    "block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2";

const DEFAULT_REVIEW = (position: number): Omit<Review, "id"> => ({
    position,
    enabled: true,
    reviewer_name: "New Reviewer",
    reviewer_location: "",
    avatar_initials: "MT",
    avatar_color: AVATAR_COLORS[0],
    star_rating: 5,
    review_text: "",
});

export function ReviewsTab() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase
            .from("homepage_reviews")
            .select("*")
            .order("position", { ascending: true })
            .then(({ data }: { data: any }) => {
                setReviews(data ?? []);
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

    const update = (id: string, field: keyof Review, value: string | number | boolean) => {
        setReviews((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );
    };

    const handleSave = async (review: Review) => {
        setSaving((prev) => new Set(prev).add(review.id));
        const { error } = await supabase
            .from("homepage_reviews")
            .upsert(review, { onConflict: "id" });
        setSaving((prev) => {
            const next = new Set(prev);
            next.delete(review.id);
            return next;
        });
        if (error) {
            toast.error("Failed to save review");
        } else {
            toast.success("Review saved");
        }
    };

    const handleAdd = async () => {
        const position = reviews.length > 0
            ? Math.max(...reviews.map((r) => r.position)) + 1
            : 1;
        const newReview: Review = { id: crypto.randomUUID(), ...DEFAULT_REVIEW(position) };
        const { error } = await supabase.from("homepage_reviews").insert(newReview);
        if (error) {
            toast.error("Failed to add review");
            return;
        }
        setReviews((prev) => [...prev, newReview]);
        setExpanded((prev) => new Set(prev).add(newReview.id));
        toast.success("Review added");
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this review?")) return;
        const { error } = await supabase
            .from("homepage_reviews")
            .delete()
            .eq("id", id);
        if (error) {
            toast.error("Failed to delete review");
            return;
        }
        setReviews((prev) => prev.filter((r) => r.id !== id));
        toast.success("Review deleted");
    };

    const handleMove = async (index: number, direction: "up" | "down") => {
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= reviews.length) return;

        const next = [...reviews];
        const posA = next[index].position;
        const posB = next[swapIndex].position;
        next[index] = { ...next[index], position: posB };
        next[swapIndex] = { ...next[swapIndex], position: posA };
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
        setReviews(next);

        await Promise.all([
            supabase
                .from("homepage_reviews")
                .update({ position: posB })
                .eq("id", next[swapIndex].id),
            supabase
                .from("homepage_reviews")
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
                        Homepage Reviews
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1">
                        Manage customer testimonials shown on the homepage.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="px-4 py-2 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                >
                    + Add Review
                </button>
            </div>

            {reviews.length === 0 && (
                <div className="bg-white border border-neutral-200 p-8 text-center">
                    <p className="text-sm text-neutral-400 italic">
                        No reviews yet. Click "Add Review" to get started.
                    </p>
                </div>
            )}

            {reviews.map((review, index) => {
                const isExpanded = expanded.has(review.id);
                const isSaving = saving.has(review.id);

                return (
                    <div
                        key={review.id}
                        className="bg-white border border-neutral-200"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100">
                            {/* Avatar preview */}
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                                style={{ backgroundColor: review.avatar_color }}
                            >
                                {review.avatar_initials || "?"}
                            </div>

                            <span className="flex-1 text-sm font-medium truncate">
                                {review.reviewer_name || "Untitled Review"}
                            </span>

                            {/* Stars preview */}
                            <div className="flex gap-0.5 shrink-0">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        size={10}
                                        className={
                                            s <= review.star_rating
                                                ? "fill-amber-400 text-amber-400"
                                                : "text-neutral-200"
                                        }
                                    />
                                ))}
                            </div>

                            {/* Move */}
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
                                    disabled={index === reviews.length - 1}
                                    className="p-1 text-neutral-400 hover:text-black disabled:opacity-30 transition-colors"
                                >
                                    <ArrowDown size={14} />
                                </button>
                            </div>

                            {/* Enabled toggle */}
                            <button
                                type="button"
                                onClick={() => update(review.id, "enabled", !review.enabled)}
                                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                                    review.enabled ? "bg-black" : "bg-neutral-200"
                                }`}
                                aria-pressed={review.enabled}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                        review.enabled
                                            ? "translate-x-[18px]"
                                            : "translate-x-[3px]"
                                    }`}
                                />
                            </button>

                            <button
                                type="button"
                                onClick={() => toggleExpand(review.id)}
                                className="shrink-0 text-neutral-400 hover:text-black transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronUp size={16} />
                                ) : (
                                    <ChevronDown size={16} />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDelete(review.id)}
                                className="shrink-0 text-neutral-400 hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        {/* Expanded form */}
                        {isExpanded && (
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Reviewer Name
                                        </label>
                                        <input
                                            type="text"
                                            value={review.reviewer_name}
                                            onChange={(e) =>
                                                update(review.id, "reviewer_name", e.target.value)
                                            }
                                            className={INPUT_CLASS}
                                            placeholder="Amara O."
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Location (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={review.reviewer_location}
                                            onChange={(e) =>
                                                update(review.id, "reviewer_location", e.target.value)
                                            }
                                            className={INPUT_CLASS}
                                            placeholder="Lagos, Nigeria"
                                        />
                                    </div>
                                </div>

                                {/* Avatar */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Avatar Initials (max 2)
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={2}
                                            value={review.avatar_initials}
                                            onChange={(e) =>
                                                update(
                                                    review.id,
                                                    "avatar_initials",
                                                    e.target.value.toUpperCase()
                                                )
                                            }
                                            className={INPUT_CLASS}
                                            placeholder="AO"
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_CLASS}>
                                            Avatar Color
                                        </label>
                                        <div className="flex gap-2 flex-wrap pt-1">
                                            {AVATAR_COLORS.map((color) => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() =>
                                                        update(review.id, "avatar_color", color)
                                                    }
                                                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                                                    style={{
                                                        backgroundColor: color,
                                                        borderColor:
                                                            review.avatar_color === color
                                                                ? "#000"
                                                                : "transparent",
                                                    }}
                                                    title={color}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Star rating */}
                                <div>
                                    <label className={LABEL_CLASS}>Star Rating</label>
                                    <div className="flex gap-2 pt-1">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() =>
                                                    update(review.id, "star_rating", s)
                                                }
                                                className="transition-transform hover:scale-110"
                                            >
                                                <Star
                                                    size={20}
                                                    className={
                                                        s <= review.star_rating
                                                            ? "fill-amber-400 text-amber-400"
                                                            : "text-neutral-200"
                                                    }
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Review text */}
                                <div>
                                    <label className={LABEL_CLASS}>Review Text</label>
                                    <textarea
                                        rows={4}
                                        value={review.review_text}
                                        onChange={(e) =>
                                            update(review.id, "review_text", e.target.value)
                                        }
                                        className={INPUT_CLASS + " resize-none"}
                                        placeholder="Write the customer's review here..."
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSave(review)}
                                        disabled={isSaving}
                                        className="px-5 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? "Saving..." : "Save Review"}
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
