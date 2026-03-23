"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { compressToWebP } from "@/lib/utils/imageCompression";
import { convertToMp4 } from "@/lib/utils/videoConversion";
import { Trash2, GripVertical } from "lucide-react";
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    arrayMove,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Single-URL mode: currentUrl + onUpload(url: string)
interface SingleUploaderProps {
    bucket: string;
    folder?: string;
    currentUrl?: string | null;
    onUpload: (url: string) => void;
    onRemove?: () => void;
    onUploading?: (isUploading: boolean) => void;
    maxFiles?: never;
    currentUrls?: never;
    aspectRatio?: "square" | "video" | "banner" | "og";
    label?: string;
}

// Multi-URL mode: currentUrls + onUpload(urls: string[])
interface MultiUploaderProps {
    bucket: string;
    folder?: string;
    currentUrls: string[];
    onUpload: (urls: string[]) => void;
    onRemove?: () => void;
    onUploading?: (isUploading: boolean) => void;
    maxFiles?: number;
    currentUrl?: never;
    aspectRatio?: "square" | "video" | "banner" | "og";
    label?: string;
}

type ImageUploaderProps = SingleUploaderProps | MultiUploaderProps;

const ASPECT_CLASSES = {
    square: "aspect-square",
    video: "aspect-video",
    banner: "aspect-[21/9]",
    og: "aspect-[1200/630]",
};

const MAX_SIZE_MB = 100; // Increased to 100MB for video transcoding
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/x-msvideo", "video/mpeg"];
const ACCEPTED_ATTR = "image/*,video/mp4,video/quicktime,video/x-msvideo,video/mpeg";

function isMultiMode(props: ImageUploaderProps): props is MultiUploaderProps {
    return "currentUrls" in props && props.currentUrls !== undefined;
}

// ── Sortable image tile ────────────────────────────────────────────────────────
interface SortableImageProps {
    url: string;
    index: number;
    isPrimary: boolean;
    onRemove: () => void;
}

function SortableImage({ url, index, isPrimary, onRemove }: SortableImageProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: url });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const isVideo = url.endsWith(".mp4");

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to remove this image?")) {
            onRemove();
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative group aspect-square min-h-[8rem] overflow-hidden bg-neutral-100 border border-neutral-200 touch-none"
        >
            {isVideo ? (
                <video src={url} className="w-full h-full object-cover" muted />
            ) : (
                <img src={url} alt="" className="w-full h-full object-cover" />
            )}

            {isPrimary && (
                <span className="absolute top-2 left-2 z-20 bg-black/70 text-white text-[8px] uppercase tracking-widest px-1.5 py-0.5 pointer-events-none">
                    Primary
                </span>
            )}

            {/* Trash button — top-right, isolated from drag */}
            <button
                type="button"
                onClick={handleRemove}
                aria-label="Remove image"
                className="absolute top-2 right-2 z-30 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
                <Trash2 size={13} strokeWidth={2} />
            </button>

            {/* Drag handle — bottom-right, separate from delete */}
            <div
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder"
                className="absolute bottom-2 right-2 z-30 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            >
                <GripVertical size={13} strokeWidth={2} />
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ImageUploader(props: ImageUploaderProps) {
    const { bucket, folder = "", aspectRatio = "video", label } = props;

    const multiMode = isMultiMode(props);

    const initialUrls: string[] = multiMode
        ? props.currentUrls
        : props.currentUrl
        ? [props.currentUrl]
        : [];

    const [previews, setPreviews] = useState<string[]>(initialUrls);
    const [uploading, setUploading] = useState(false);
    const [uploadCount, setUploadCount] = useState(0);
    const [isConverting, setIsConverting] = useState(false);
    const [conversionProgress, setConversionProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [activeUrl, setActiveUrl] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const maxFiles = multiMode ? (props.maxFiles ?? 1) : 1;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    // ── Upload helpers ─────────────────────────────────────────────────────────
    const uploadFile = async (rawFile: File): Promise<string | null> => {
        const isVideo = rawFile.type.startsWith("video/");

        if (!ACCEPTED.includes(rawFile.type)) {
            setError("Please upload a JPEG, PNG, WebP, GIF image, or MP4 video.");
            return null;
        }
        if (rawFile.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`File must be under ${MAX_SIZE_MB}MB.`);
            return null;
        }

        let file: File = rawFile;
        if (!isVideo) {
            try {
                file = await compressToWebP(rawFile);
            } catch {
                file = rawFile;
            }
        } else if (rawFile.type !== "video/mp4") {
            // Transcode non-mp4 videos
            try {
                setIsConverting(true);
                setConversionProgress(0);
                file = await convertToMp4(rawFile, (p) => setConversionProgress(p));
            } catch (err: any) {
                setError(err.message || "Video optimization failed.");
                setIsConverting(false);
                return null;
            } finally {
                setIsConverting(false);
            }
        }

        const ext = isVideo ? "mp4" : "webp";
        const name = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const contentType = isVideo ? "video/mp4" : "image/webp";

        const { data, error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(name, file, { contentType, upsert: false });

        if (uploadErr || !data) {
            setError(uploadErr?.message || "Upload failed.");
            return null;
        }

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
        return publicUrl;
    };

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError(null);

        const remaining = maxFiles - previews.length;
        const toUpload = Array.from(files).slice(0, remaining);
        if (toUpload.length === 0) return;

        setUploading(true);
        setUploadCount(toUpload.length);
        props.onUploading?.(true);

        const results = await Promise.all(toUpload.map(uploadFile));
        const newUrls = results.filter((u): u is string => u !== null);

        if (newUrls.length > 0) {
            const updated = [...previews, ...newUrls].slice(0, maxFiles);
            setPreviews(updated);
            if (multiMode) {
                (props as MultiUploaderProps).onUpload(updated);
            } else {
                (props as SingleUploaderProps).onUpload(updated[0]);
            }
        }

        setUploading(false);
        setUploadCount(0);
        props.onUploading?.(false);
    };

    const handleRemove = (index: number) => {
        const updated = previews.filter((_, i) => i !== index);
        setPreviews(updated);
        if (multiMode) {
            (props as MultiUploaderProps).onUpload(updated);
        } else {
            (props as SingleUploaderProps).onUpload("");
            props.onRemove?.();
        }
    };

    // ── Drag handlers ──────────────────────────────────────────────────────────
    const handleDragStart = (event: DragStartEvent) => {
        setActiveUrl(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveUrl(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = previews.indexOf(active.id as string);
        const newIndex = previews.indexOf(over.id as string);
        if (oldIndex === -1 || newIndex === -1) return;

        const updated = arrayMove(previews, oldIndex, newIndex);
        setPreviews(updated);
        if (multiMode) {
            (props as MultiUploaderProps).onUpload(updated);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    const showDropzone = previews.length < maxFiles;
    const loadingLabel = uploadCount > 1 ? `Uploading ${uploadCount} files...` : "Uploading...";

    // Active drag preview tile
    const activeIsVideo = activeUrl?.endsWith(".mp4");

    return (
        <div className="space-y-2">
            {label && (
                <div className="flex items-center justify-between">
                    <label className="block text-xs uppercase tracking-widest font-semibold text-neutral-700">
                        {label}
                    </label>
                    {previews.length > 0 && props.onRemove && (
                        <button
                            type="button"
                            onClick={() => {
                                setPreviews([]);
                                props.onRemove?.();
                            }}
                            className="text-[10px] text-red-500 hover:text-red-700 tracking-widest uppercase font-semibold transition-colors"
                        >
                            Remove All
                        </button>
                    )}
                </div>
            )}

            {/* Preview grid — sortable in multi mode */}
            {previews.length > 0 && (
                multiMode ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={previews} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-3 gap-2">
                                {previews.map((url, idx) => (
                                    <SortableImage
                                        key={url}
                                        url={url}
                                        index={idx}
                                        isPrimary={idx === 0}
                                        onRemove={() => handleRemove(idx)}
                                    />
                                ))}
                            </div>
                        </SortableContext>

                        <DragOverlay>
                            {activeUrl && (
                                <div className="aspect-square overflow-hidden border-2 border-black shadow-2xl opacity-90">
                                    {activeIsVideo ? (
                                        <video src={activeUrl} className="w-full h-full object-cover" muted />
                                    ) : (
                                        <img src={activeUrl} alt="" className="w-full h-full object-cover" />
                                    )}
                                </div>
                            )}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    // Single mode — plain preview, no DnD
                    <div className={`relative group overflow-hidden bg-neutral-100 border border-neutral-200 ${ASPECT_CLASSES[aspectRatio]}`}>
                        {previews[0].endsWith(".mp4") ? (
                            <video src={previews[0]} className="w-full h-full object-cover" muted />
                        ) : (
                            <img src={previews[0]} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Are you sure you want to remove this image?")) {
                                    handleRemove(0);
                                }
                            }}
                            aria-label="Remove image"
                            className="absolute top-2 right-2 z-20 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                            <Trash2 size={13} strokeWidth={2} />
                        </button>
                    </div>
                )
            )}

            {/* Dropzone */}
            {showDropzone && (
                <div
                    className={`${maxFiles === 1 && previews.length === 0 ? ASPECT_CLASSES[aspectRatio] : "h-24"} relative bg-neutral-100 border-2 border-dashed border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer group overflow-hidden`}
                    onClick={() => !uploading && inputRef.current?.click()}
                    onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-black"); }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-black"); }}
                >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400 px-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500 text-center">
                            {uploading ? loadingLabel : maxFiles > 1 ? "Click or drag to upload (multiple)" : "Click or drag to upload"}
                        </p>
                    </div>

                    {isConverting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 z-50">
                            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <div className="text-center space-y-1">
                                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-black">Optimizing Video...</p>
                                <p className="text-[9px] text-neutral-400 uppercase tracking-widest font-bold font-mono italic">
                                    {conversionProgress}% Complete — Please wait
                                </p>
                            </div>
                        </div>
                    )}

                    {uploading && !isConverting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 z-40">
                            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-700">{loadingLabel}</p>
                        </div>
                    )}
                </div>
            )}

            {error && <p className="text-xs text-red-600 tracking-wide">{error}</p>}

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_ATTR}
                multiple={maxFiles > 1}
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />
        </div>
    );
}
