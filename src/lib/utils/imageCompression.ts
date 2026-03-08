import imageCompression from "browser-image-compression";

/**
 * Compresses and converts an image File to WebP format.
 * Max dimension: 1920px. Targets ≤1MB output while preserving quality.
 * Returns a new File with a `.webp` extension.
 */
export async function compressToWebP(file: File): Promise<File> {
    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/webp" as const,
        initialQuality: 0.85,
    };

    const compressed = await imageCompression(file, options);

    // Rename to .webp
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([compressed], `${baseName}.webp`, { type: "image/webp" });
}
