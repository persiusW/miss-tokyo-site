"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabaseBrowser";
import imageCompression from "browser-image-compression";
import { toast } from "@/lib/toast";
import { X, Upload, FileVideo, Image as ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  bucket: string;
  folder?: string;
  currentUrls?: string[];
  onUpload: (urls: string[]) => void;
  onRemove?: () => void;
  maxFiles?: number;
  aspectRatio?: "square" | "video" | "banner" | "og";
  label?: string;
}

const ASPECT_CLASSES = {
  square: "aspect-square",
  video: "aspect-video",
  banner: "aspect-[21/9]",
  og: "aspect-[1200/630]",
};

const MAX_SIZE_MB = 20;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"];

export function ImageUploader({
  bucket,
  folder = "",
  currentUrls = [],
  onUpload,
  onRemove,
  maxFiles = 5,
  aspectRatio = "video",
  label,
}: ImageUploaderProps) {
  const supabase = createClient();
  const [previews, setPreviews] = useState<string[]>(currentUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Compression error:", error);
      return file;
    }
  };

  const uploadBatch = async (files: File[]) => {
    if (previews.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed.`);
      return;
    }

    setUploading(true);
    setError(null);

    const uploadPromises = files.map(async (rawFile) => {
      if (!ACCEPTED_TYPES.includes(rawFile.type)) {
        throw new Error(`Invalid file type: ${rawFile.name}`);
      }
      if (rawFile.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`File too large: ${rawFile.name}`);
      }

      let fileToUpload = rawFile;
      if (rawFile.type.startsWith("image/")) {
        fileToUpload = await compressImage(rawFile);
      }

      const extension = rawFile.name.split(".").pop();
      const fileName = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

      const { data, error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileToUpload, { upsert: false });

      if (uploadErr || !data) throw new Error(uploadErr?.message || "Upload failed");

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return publicUrl;
    });

    try {
      const newUrls = await Promise.all(uploadPromises);
      const updatedUrls = [...previews, ...newUrls];
      setPreviews(updatedUrls);
      onUpload(updatedUrls);
      toast.success("Media successfully processed.");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onUpload(updated);
    if (updated.length === 0 && onRemove) {
        onRemove();
    }
  };

  return (
    <div className="space-y-4">
      {label && (
        <label className="block text-xs font-bold text-gray-900 uppercase tracking-widest mb-2">
          {label} ({previews.length}/{maxFiles})
        </label>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {previews.map((url, idx) => (
          <div key={url} className={`relative group ${ASPECT_CLASSES[aspectRatio]} border border-gray-100 bg-gray-50 overflow-hidden`}>
            {url.toLowerCase().endsWith(".mp4") ? (
              <video src={url} className="w-full h-full object-cover" muted />
            ) : (
              <img src={url} alt="" className="w-full h-full object-cover" />
            )}
            <button
              onClick={() => removeMedia(idx)}
              className="absolute top-1 right-1 z-10 bg-white/90 text-black p-1 translate-y-[-4px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all border border-black"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {previews.length < maxFiles && (
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            className={`${ASPECT_CLASSES[aspectRatio]} border border-dashed border-gray-200 bg-gray-50/50 hover:bg-gray-50 hover:border-black transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group`}
          >
            {uploading ? (
              <div className="w-4 h-4 border border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload size={16} className="text-gray-300 group-hover:text-black transition-colors" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-gray-400">Add Specimen</span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadBatch(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}
