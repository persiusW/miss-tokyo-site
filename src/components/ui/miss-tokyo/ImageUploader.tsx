"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { compressToWebP } from "@/lib/utils/imageCompression";

// Single-URL mode: currentUrl + onUpload(url: string)
interface SingleUploaderProps {
    bucket: string;
    folder?: string;
    currentUrl?: string | null;
    onUpload: (url: string) => void;
    onRemove?: () => void;
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

const MAX_SIZE_MB = 10;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"];
const ACCEPTED_ATTR = "image/jpeg,image/png,image/webp,image/gif,video/mp4";

function isMultiMode(props: ImageUploaderProps): props is MultiUploaderProps {
    return "currentUrls" in props && props.currentUrls !== undefined;
}

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
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const maxFiles = multiMode ? (props.maxFiles ?? 1) : 1;

    const uploadFile = async (rawFile: File): Promise<string | null> => {
        const isVideo = rawFile.type === "video/mp4";

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
        setUploading(true);

        const remaining = maxFiles - previews.length;
        const toUpload = Array.from(files).slice(0, remaining);

        const newUrls: string[] = [];
        for (const file of toUpload) {
            const url = await uploadFile(file);
            if (url) {
                newUrls.push(url);
            }
        }

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

    const showDropzone = previews.length < maxFiles;

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

            {/* Preview grid */}
            {previews.length > 0 && (
                <div className={`grid gap-2 ${maxFiles > 1 ? "grid-cols-3" : ""}`}>
                    {previews.map((url, idx) => {
                        const isVideo = url.endsWith(".mp4");
                        return (
                            <div
                                key={idx}
                                className={`relative group overflow-hidden bg-neutral-100 border border-neutral-200 ${maxFiles === 1 ? ASPECT_CLASSES[aspectRatio] : "aspect-square"}`}
                            >
                                {isVideo ? (
                                    <video src={url} className="w-full h-full object-cover" muted />
                                ) : (
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(idx)}
                                        className="opacity-0 group-hover:opacity-100 text-white text-[9px] uppercase tracking-widest font-bold border border-white px-2 py-1"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
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
                            {uploading ? "Uploading..." : "Click or drag to upload"}
                        </p>
                    </div>

                    {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
