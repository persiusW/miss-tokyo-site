"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { compressToWebP } from "@/lib/utils/imageCompression";

interface ImageUploaderProps {
    bucket: string;
    folder?: string;
    currentUrl?: string | null;
    onUpload: (url: string) => void;
    onRemove?: () => void;
    aspectRatio?: "square" | "video" | "banner" | "og";
    label?: string;
    acceptVideo?: boolean;
    onBeforeUpload?: (file: File) => boolean;
}

const ASPECT_CLASSES = {
    square: "aspect-square",
    video: "aspect-video",
    banner: "aspect-[21/9]",
    og: "aspect-[1200/630]",
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/avi"];
const IMAGE_MAX_MB = 10;
const VIDEO_MAX_MB = 200;

function isVideoUrl(url: string | null | undefined): boolean {
    return !!url && /\.(mp4|webm|mov|avi)(\?|$)/i.test(url);
}

export function ImageUploader({
    bucket,
    folder = "",
    currentUrl,
    onUpload,
    onRemove,
    aspectRatio = "video",
    label,
    acceptVideo = false,
    onBeforeUpload,
}: ImageUploaderProps) {
    const [preview, setPreview] = useState<string | null>(currentUrl || null);
    const [isVideo, setIsVideo] = useState(isVideoUrl(currentUrl));
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const upload = async (rawFile: File) => {
        setError(null);

        // Run parent validation first (e.g. max 10 files, max 1 video)
        if (onBeforeUpload && !onBeforeUpload(rawFile)) return;

        const isVideoFile = rawFile.type.startsWith("video/");

        // MIME type check
        if (isVideoFile) {
            if (!acceptVideo) {
                setError("Video upload is not enabled for this field.");
                return;
            }
            if (!VIDEO_TYPES.includes(rawFile.type)) {
                setError("Please upload MP4, WebM, or QuickTime video.");
                return;
            }
            if (rawFile.size > VIDEO_MAX_MB * 1024 * 1024) {
                setError(`Video must be under ${VIDEO_MAX_MB}MB.`);
                return;
            }
        } else {
            if (!IMAGE_TYPES.includes(rawFile.type)) {
                setError("Please upload a JPEG, PNG, WebP, or GIF image.");
                return;
            }
            if (rawFile.size > IMAGE_MAX_MB * 1024 * 1024) {
                setError(`File must be under ${IMAGE_MAX_MB}MB.`);
                return;
            }
        }

        setIsVideo(isVideoFile);
        setPreview(URL.createObjectURL(rawFile));
        setUploading(true);

        if (isVideoFile) {
            // Upload video directly — no WebP conversion
            const ext = rawFile.name.split(".").pop()?.toLowerCase() || "mp4";
            const name = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const { data, error: uploadErr } = await supabase.storage
                .from(bucket)
                .upload(name, rawFile, { contentType: rawFile.type, upsert: false });

            if (uploadErr || !data) {
                setError(uploadErr?.message || "Upload failed.");
                setPreview(currentUrl || null);
                setIsVideo(isVideoUrl(currentUrl));
            } else {
                const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
                setPreview(publicUrl);
                onUpload(publicUrl);
            }
        } else {
            // Compress + convert to WebP
            let file: File;
            try {
                file = await compressToWebP(rawFile);
            } catch {
                file = rawFile;
            }

            const name = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
            const { data, error: uploadErr } = await supabase.storage
                .from(bucket)
                .upload(name, file, { contentType: "image/webp", upsert: false });

            if (uploadErr || !data) {
                setError(uploadErr?.message || "Upload failed.");
                setPreview(currentUrl || null);
                setIsVideo(isVideoUrl(currentUrl));
            } else {
                const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
                setPreview(publicUrl);
                onUpload(publicUrl);
            }
        }

        setUploading(false);
    };

    const handleFiles = (files: FileList | null) => {
        if (files?.[0]) upload(files[0]);
    };

    const accepted = [
        ...IMAGE_TYPES,
        ...(acceptVideo ? VIDEO_TYPES : []),
    ].join(",");

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
                                setIsVideo(false);
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
                        {isVideo ? (
                            <video
                                src={preview}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                playsInline
                                autoPlay
                            />
                        ) : (
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-center">
                                <svg className="w-6 h-6 text-white mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-white text-[10px] uppercase tracking-widest font-semibold">
                                    {uploading ? "Uploading..." : isVideo ? "Replace Video" : "Replace Image"}
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
                            <p className="text-[10px] text-neutral-400 mt-1">
                                {acceptVideo
                                    ? "JPEG · PNG · WebP · MP4 · WebM — max 10MB image / 200MB video"
                                    : "JPEG · PNG · WebP — auto-converted to WebP · max 10MB"}
                            </p>
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
                accept={accepted}
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />
        </div>
    );
}
