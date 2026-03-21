import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;

/**
 * Initializes and loads the FFmpeg instance.
 * Uses the v0.12+ API.
 */
async function loadFFmpeg() {
    if (ffmpeg) return ffmpeg;

    ffmpeg = new FFmpeg();
    
    // Using unpkg for core files to avoid local setup overhead
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    
    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    return ffmpeg;
}

/**
 * Transcodes a video file to web-optimized .mp4 using FFmpeg.wasm.
 * Skips conversion if the file is already an MP4 or an image.
 */
export async function convertToMp4(file: File, onProgress?: (pct: number) => void): Promise<File> {
    // Only transcode non-mp4 videos
    if (!file.type.startsWith("video/") || file.type === "video/mp4") {
        return file;
    }

    const instance = await loadFFmpeg();
    const inputName = "input_" + file.name;
    const outputName = "output_" + file.name.replace(/\.[^.]+$/, "") + ".mp4";

    try {
        // Log progress
        instance.on("log", ({ message }) => {
            console.log("[FFMPEG]", message);
        });

        instance.on("progress", ({ progress }) => {
            onProgress?.(Math.round(progress * 100));
        });

        // Write input file to FFmpeg's in-memory FS
        await instance.writeFile(inputName, await fetchFile(file));

        // Execute transcoding
        // -c:v libx264: codec
        // -preset ultrafast: fastest conversion
        // -crf 28: baseline quality/compression ratio
        // -c:a aac: audio codec
        await instance.exec([
            "-i", inputName,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-c:a", "aac",
            outputName
        ]);

        // Read output from FS
        const data = await instance.readFile(outputName);
        const uint8Data = new Uint8Array(data as unknown as ArrayBuffer);
        
        // Cleanup FS
        await instance.deleteFile(inputName);
        await instance.deleteFile(outputName);

        // Return new File object
        return new File([uint8Data], outputName, { type: "video/mp4" });
    } catch (err) {
        console.error("Transcoding failure:", err);
        throw new Error("Video optimization failed. Please try a standard MP4 file.");
    }
}
