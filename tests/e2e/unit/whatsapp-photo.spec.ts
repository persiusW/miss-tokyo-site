import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { photoAsNote } from "../../../src/lib/ai/shopAssistant/limits";
import { toModelPhoto } from "../../../src/lib/whatsapp/photo";

test("a customer photo becomes a JPEG the model reads at full detail; junk is refused", async () => {
    const png = await sharp({ create: { width: 3000, height: 2000, channels: 4, background: { r: 250, g: 180, b: 150, alpha: 1 } } }).png().toBuffer();
    const photo = await toModelPhoto(new Uint8Array(png));
    expect(photo?.mediaType).toBe("image/jpeg");
    const meta = await sharp(Buffer.from(photo!.data, "base64")).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(["jpeg", 1568, 1045]);
    expect(await toModelPhoto(new Uint8Array([1, 2, 3, 4]))).toBe(null);
});

test("the stored chat keeps a note of the photo, not the image", () => {
    const stored = photoAsNote([
        { role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: "BASE64" } }, { type: "text", text: "Do you have this in M?" }] },
        { role: "assistant", content: [{ type: "text", text: "Yes, the Balloon-Sleeve Mini Dress (D7)." }] },
        { role: "user", content: "thanks" },
    ]);
    expect(stored[0]).toEqual({ role: "user", content: "[The customer sent a photo] Do you have this in M?" });
    expect(stored[1]).toEqual({ role: "assistant", content: [{ type: "text", text: "Yes, the Balloon-Sleeve Mini Dress (D7)." }] });
    expect(stored[2]).toEqual({ role: "user", content: "thanks" });
    expect(JSON.stringify(stored)).not.toContain("BASE64");
});
