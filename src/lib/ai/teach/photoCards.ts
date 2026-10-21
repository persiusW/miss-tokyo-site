// Photo flashcards: staff upload up to 10 photos of pieces (often social posts
// of a model wearing one); the model describes each and guesses which product
// it is; staff confirm, correct or skip; each answer becomes a photo lesson
// ("<what it looks like> → <product> (SKU …)"), so the assistant recognises
// the piece when a customer sends a similar photo. Images live in the private
// whatsapp-media bucket under teach/. Server-only.
import { randomUUID } from "crypto";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MEDIA_BUCKET, mediaLink } from "@/lib/whatsapp/media";
import { STORED_MEDIA } from "@/lib/whatsapp/inbox";
import { photoLesson, productLabel, type Product } from "./lessonRules";
import { createLesson } from "./lessons";
import { describePhoto, TeachLimit } from "./teachModel";

const db = supabaseAdmin as any;

export const MAX_PHOTOS = 10;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
/** A guess claimed this long ago and never finished is tried again. */
const CLAIM_STALE_MS = 90_000;

export type { Product };
export type Card = {
    id: string; imageUrl: string | null; description: string | null; guess: Product | null;
    verdict: "pending" | "correct" | "wrong" | "skipped" | "failed"; answerName: string | null;
};

export async function productOptions(): Promise<Product[]> {
    const { data, error } = await supabaseAdmin.from("products").select("id, name, sku")
        .eq("is_active", true).eq("is_published", true).order("name").limit(500);
    if (error) throw error;
    return (data ?? []).map(p => ({ id: p.id, name: String(p.name ?? "").trim(), sku: p.sku?.trim() || null }));
}

/** Stores the photos (as JPEG, at most 1568 px) and opens a round of cards. Files that aren't images are refused. */
export async function createRound(files: File[], staffId: string): Promise<{ roundId: string; refused: number }> {
    const roundId = randomUUID();
    let refused = 0;
    for (const f of files.slice(0, MAX_PHOTOS)) {
        if (!PHOTO_TYPES.includes(f.type) || f.size > MAX_UPLOAD_BYTES) { refused++; continue; }
        let jpeg: Buffer;
        try {
            jpeg = await sharp(Buffer.from(await f.arrayBuffer()), { limitInputPixels: 40_000_000 }).rotate()
                .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
                .flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toBuffer();
        } catch { refused++; continue; }
        const path = `teach/${roundId}/${randomUUID()}.jpg`;
        const up = await supabaseAdmin.storage.from(MEDIA_BUCKET).upload(path, jpeg, { contentType: "image/jpeg" });
        if (up.error) throw new Error(`store photo: ${up.error.message}`);
        const { error } = await db.from("assistant_photo_cards").insert({ round_id: roundId, image_path: path, created_by: staffId });
        if (error) throw error;
    }
    return { roundId, refused };
}

export async function roundCards(roundId: string): Promise<Card[]> {
    const { data, error } = await db.from("assistant_photo_cards")
        .select("id, image_path, description, guess_product_id, guess_name, verdict, answer_name").eq("round_id", roundId).order("created_at");
    if (error) throw error;
    return Promise.all((data ?? []).map(async (c: any) => ({
        id: c.id, imageUrl: await mediaLink(`${STORED_MEDIA}${c.image_path}`), description: c.description ?? null,
        guess: c.guess_product_id ? { id: c.guess_product_id, name: c.guess_name ?? "", sku: null } : null,
        verdict: c.verdict, answerName: c.answer_name ?? null,
    })));
}

/** Guesses the round's cards not guessed yet, a few at a time, inside a time budget. Returns how many are still waiting. */
export async function guessRound(roundId: string, staffId: string, budgetMs = 40_000): Promise<number> {
    const started = Date.now();
    const products = await productOptions();
    for (;;) {
        if (Date.now() - started > budgetMs - 15_000) break;
        const stale = new Date(Date.now() - CLAIM_STALE_MS).toISOString();
        const { data: todo, error } = await db.from("assistant_photo_cards").select("id, image_path")
            .eq("round_id", roundId).eq("verdict", "pending").is("description", null)
            .or(`claimed_at.is.null,claimed_at.lt.${stale}`).order("created_at").limit(3);
        if (error) throw error;
        if (!todo || todo.length === 0) break;
        await Promise.all(todo.map((c: { id: string; image_path: string }) => guessOne(c, products, staffId)));
    }
    const { count } = await db.from("assistant_photo_cards").select("id", { count: "exact", head: true })
        .eq("round_id", roundId).eq("verdict", "pending").is("description", null);
    return count ?? 0;
}

async function guessOne(c: { id: string; image_path: string }, products: Product[], staffId: string): Promise<void> {
    // Claim it, so a second poll doesn't guess the same card.
    const { data: mine } = await db.from("assistant_photo_cards").update({ claimed_at: new Date().toISOString() })
        .eq("id", c.id).is("description", null).select("id");
    if (!mine || mine.length === 0) return;
    try {
        const file = await supabaseAdmin.storage.from(MEDIA_BUCKET).download(c.image_path);
        if (file.error || !file.data) throw new Error("photo missing");
        const b64 = Buffer.from(await file.data.arrayBuffer()).toString("base64");
        const g = await describePhoto(staffId, b64, products);
        if (!g) throw new Error("no guess");
        const p = g.productIndex > 0 ? products[g.productIndex - 1] : null;
        await db.from("assistant_photo_cards").update({
            description: g.description, guess_product_id: p?.id ?? null, guess_name: p ? productLabel(p) : null,
        }).eq("id", c.id);
    } catch (e) {
        // Over the hourly limit or today's budget: leave it for later, and say so.
        if (e instanceof TeachLimit) { await db.from("assistant_photo_cards").update({ claimed_at: null }).eq("id", c.id); throw e; }
        console.error("[teach] photo not guessed", { err: String(e) });
        await db.from("assistant_photo_cards").update({ verdict: "failed", description: "" }).eq("id", c.id);
    }
}

export type AnswerResult = { ok: true; lessonId: string | null } | { ok: false; error: string };

export async function answerCard(a: {
    cardId: string; verdict: "correct" | "wrong" | "skip"; productId?: string | null; why?: string | null;
    staffId: string; staffName: string | null;
}): Promise<AnswerResult> {
    const { data: c, error } = await db.from("assistant_photo_cards")
        .select("id, image_path, description, guess_product_id, verdict").eq("id", a.cardId).maybeSingle();
    if (error) throw error;
    if (!c || c.verdict !== "pending") return { ok: false, error: "That photo was already answered. Please refresh." };
    if (a.verdict === "skip") {
        await db.from("assistant_photo_cards").update({ verdict: "skipped" }).eq("id", a.cardId);
        return { ok: true, lessonId: null };
    }
    const productId = a.verdict === "correct" ? c.guess_product_id : a.productId;
    const p = (await productOptions()).find(x => x.id === productId);
    if (!p) return { ok: false, error: "Choose the product this photo shows." };
    const why = (a.why ?? "").trim().slice(0, 150);
    const lesson = photoLesson(c.description || "A photo of the piece", p, why);
    const saved = await createLesson({ kind: "photo", ...lesson, imagePath: c.image_path, staffId: a.staffId, staffName: a.staffName });
    if (!saved.ok) return saved;
    await db.from("assistant_photo_cards").update({
        verdict: a.verdict === "correct" ? "correct" : "wrong", answer_product_id: p.id, answer_name: productLabel(p), why_text: why || null, lesson_id: saved.lesson.id,
    }).eq("id", a.cardId);
    return { ok: true, lessonId: saved.lesson.id };
}
