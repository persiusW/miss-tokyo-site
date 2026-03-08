"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ImageUploaderProps {
    bucket: string;
    folder?: string;
    currentUrl?: string | null;
    onUpload: (url: string) => void;
    onRemove?: () => void;
    aspectRatio?: "square" | "video" | "banner" | "og";
    label?: string;
}

const ASPECT_CLASSES = {
    square: "aspect-square",
    video: "aspect-video",
    banner: "aspect-[21/9]",
    og: "aspect-[1200/630]",
};

const MAX_SIZE_MB = 5;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({
    bucket,
    folder = "",
    currentUrl,
    onUpload,
    onRemove,
    aspectRatio = "video",
    label,
}: ImageUploaderProps) {
    const [preview, setPreview] = useState<string | null>(currentUrl || null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const upload = async (file: File) => {
        setError(null);

        if (!ACCEPTED.includes(file.type)) {
            setError("Please upload a JPEG, PNG, or WebP image.");
            return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setError(`File must be under ${MAX_SIZE_MB}MB.`);
            return;
        }

        // Instant local preview
        setPreview(URL.createObjectURL(file));
        setUploading(true);

        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const name = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { data, error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(name, file, { contentType: file.type, upsert: false });

        if (uploadErr || !data) {
            setError(uploadErr?.message || "Upload failed.");
            setPreview(currentUrl || null);
        } else {
            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
            setPreview(publicUrl);
            onUpload(publicUrl);
        }

        setUploading(false);
    };

    const handleFiles = (files: FileList | null) => {
        if (files?.[0]) upload(files[0]);
    };

    return (
        <div className="space-y-2">
            {label && (
                <div className="flex items-center justify-between">
                    <label className="block text-xs uppercase tracking-widest font-semibold text-neutral-700">
                        {label}
                    </label>
                    {preview && onRemove && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setPreview(null);
                                onRemove();
                            }}
                            className="text-[10px] text-red-500 hover:text-red-700 tracking-widest uppercase font-semibold transition-colors"
                        >
                            Remove
                        </button>
                    )}
                </div>
            )}

            <div
                className={`${ASPECT_CLASSES[aspectRatio]} relative bg-neutral-100 border-2 border-dashed border-neutral-200 hover:border-neutral-400 transition-colors cursor-pointer group overflow-hidden`}
                onClick={() => !uploading && inputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-black"); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-black"); }}
            >
                {preview ? (
                    <>
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center">
                                <svg className="w-6 h-6 text-white mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-white text-[10px] uppercase tracking-widest font-semibold">
                                    {uploading ? "Uploading..." : "Replace Image"}
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-400 px-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="text-center">
                            <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-500">
                                {uploading ? "Uploading..." : "Click or drag to upload"}
                            </p>
                            <p className="text-[10px] text-neutral-400 mt-1">JPEG · PNG · WebP — max {MAX_SIZE_MB}MB</p>
                        </div>
                    </div>
                )}

                {/* Upload spinner */}
                {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                        <div className="w-7 h-7 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {error && <p className="text-xs text-red-600 tracking-wide">{error}</p>}

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(",")}
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />
        </div>
    );
}
