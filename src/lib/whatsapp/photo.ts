// A customer's photo, ready for the model: a JPEG no larger than 1568 px on
// its longest side (the size the model reads at full detail), or null when the
// bytes are not an image. Server-only (sharp).
import sharp from "sharp";

export type ModelPhoto = { data: string; mediaType: "image/jpeg" };

const LONGEST_SIDE = 1568;

export async function toModelPhoto(bytes: Uint8Array): Promise<ModelPhoto | null> {
    try {
        const jpeg = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate()
            .resize({ width: LONGEST_SIDE, height: LONGEST_SIDE, fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer();
        return { data: jpeg.toString("base64"), mediaType: "image/jpeg" };
    } catch {
        return null;
    }
}
