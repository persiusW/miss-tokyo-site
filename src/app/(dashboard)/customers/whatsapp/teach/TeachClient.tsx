"use client";

// Teach the assistant: photo flashcards (upload, the assistant guesses which
// piece each photo shows, staff confirm or correct, each becomes a lesson), a
// note typed by hand, and everything taught so far with Edit and Retire.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/lib/toast";

type Kind = "note" | "correction" | "hint" | "photo";
type Lesson = { id: string; kind: Kind; title: string; body: string; createdByName: string | null; createdAt: string; imageUrl: string | null };
type Product = { id: string; name: string; sku: string | null };
type Card = { id: string; imageUrl: string | null; description: string | null; guess: { id: string; name: string } | null; verdict: "pending" | "correct" | "wrong" | "skipped" | "failed"; answerName: string | null };

const KIND_LABEL: Record<Kind, string> = { note: "Note", correction: "Correction", hint: "Hint", photo: "Photo" };
const CALM = "Something happened. Please try again.";
const MAX_PHOTOS = 10;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const label = (p: Product) => `${p.name}${p.sku ? ` (SKU ${p.sku})` : ""}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function call(url: string, init?: RequestInit): Promise<{ ok: boolean; data: any }> {
    try {
        const res = await fetch(url, { cache: "no-store", ...init });
        return { ok: res.ok, data: await res.json().catch(() => null) };
    } catch {
        return { ok: false, data: null };
    }
}
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function TeachClient() {
    const [lessons, setLessons] = useState<Lesson[] | null>(null);
    const [max, setMax] = useState(40);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        const r = await call("/api/whatsapp/teach/lessons");
        if (r.ok && Array.isArray(r.data?.lessons)) { setLessons(r.data.lessons); setMax(r.data.max ?? 40); setFailed(false); } else setFailed(true);
    }, []);
    useEffect(() => { load(); }, [load]);

    return (
        <div className="teach-grid" data-teach>
            <style>{`
                .teach-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; }
                @media (min-width: 1000px) { .teach-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); } }
            `}</style>
            <div style={{ display: "grid", gap: 16 }}>
                <PhotoCards onSaved={load} />
                <AddNote onSaved={load} full={!!lessons && lessons.length >= max} />
            </div>
            <div className="ac-card" data-teach-lessons>
                <div className="ac-card-head"><div className="ac-card-title">What you have taught the assistant</div>
                    {lessons && <span style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{lessons.length} of {max}</span>}</div>
                {failed && !lessons && <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>We couldn't load this. Please refresh and try again.</div>}
                {!failed && !lessons && <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>Loading…</div>}
                {lessons && lessons.length === 0 && (
                    <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>Nothing yet. Add a note, correct one of its replies in a chat, or teach it with photos.</div>
                )}
                {lessons?.map(l => <LessonRow key={l.id} lesson={l} onChanged={load} />)}
            </div>
        </div>
    );
}

function Chip({ kind }: { kind: Kind }) {
    return <span style={{ fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: "var(--ac-line)", color: "var(--ac-ink-3)" }}>{KIND_LABEL[kind]}</span>;
}

function LessonRow({ lesson, onChanged }: { lesson: Lesson; onChanged: () => void }) {
    const [editing, setEditing] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [title, setTitle] = useState(lesson.title);
    const [body, setBody] = useState(lesson.body);
    const [busy, setBusy] = useState(false);

    const save = async () => {
        setBusy(true);
        const r = await call("/api/whatsapp/teach/lessons", json("PATCH", { id: lesson.id, title, body }));
        setBusy(false);
        if (!r.ok) { toast.error(r.data?.error ?? CALM); return; }
        toast.success("Saved. The assistant uses it from the next message.");
        setEditing(false);
        onChanged();
    };
    const retire = async () => {
        setBusy(true);
        const r = await call("/api/whatsapp/teach/lessons", json("PATCH", { id: lesson.id, retire: true }));
        setBusy(false);
        if (!r.ok) { toast.error(r.data?.error ?? CALM); return; }
        toast.success("Retired. The assistant no longer uses it.");
        onChanged();
    };

    return (
        <div style={{ borderTop: "1px solid var(--ac-line)", padding: "12px 0", display: "flex", gap: 12 }} data-teach-lesson={lesson.kind}>
            {lesson.imageUrl && (
                // A signed, short-lived link: next/image can't optimise it.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lesson.imageUrl} alt="" width={52} height={52} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, flex: "none" }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
                {!editing ? (
                    <>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <Chip kind={lesson.kind} />
                            <span style={{ fontSize: 14, color: "var(--ac-ink)" }}>{lesson.title}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--ac-ink-2, var(--ac-ink))", marginTop: 4, overflowWrap: "anywhere" }}>{lesson.body}</div>
                        <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 4 }}>by {lesson.createdByName ?? "your team"} · {day(lesson.createdAt)}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                            {!confirm ? (
                                <>
                                    <button type="button" className="ac-btn" onClick={() => setEditing(true)} data-teach-edit>Edit</button>
                                    <button type="button" className="ac-btn" onClick={() => setConfirm(true)} data-teach-retire>Retire</button>
                                </>
                            ) : (
                                <>
                                    <span style={{ fontSize: 12, color: "var(--ac-ink-3)", alignSelf: "center" }}>Retire this lesson? The assistant stops using it.</span>
                                    <button type="button" className="ac-btn ac-btn-primary" onClick={retire} disabled={busy} data-teach-retire-yes>{busy ? "Retiring…" : "Retire"}</button>
                                    <button type="button" className="ac-btn" onClick={() => setConfirm(false)} disabled={busy}>Keep</button>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                        <input className="ac-input" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} aria-label="Title" />
                        <textarea className="ac-input" rows={3} maxLength={400} value={body} onChange={e => setBody(e.target.value)} aria-label="Lesson" />
                        <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" className="ac-btn ac-btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                            <button type="button" className="ac-btn" onClick={() => { setEditing(false); setTitle(lesson.title); setBody(lesson.body); }} disabled={busy}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function AddNote({ onSaved, full }: { onSaved: () => void; full: boolean }) {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);
    const save = async () => {
        setBusy(true);
        const r = await call("/api/whatsapp/teach/lessons", json("POST", { title, body }));
        setBusy(false);
        if (!r.ok) { toast.error(r.data?.error ?? CALM); return; }
        toast.success("Saved. The assistant uses it from the next message.");
        setTitle(""); setBody("");
        onSaved();
    };
    return (
        <div className="ac-card" data-teach-note>
            <div className="ac-card-head"><div className="ac-card-title">Add a note</div></div>
            <div style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                Something the assistant should always know about the shop or your pieces, e.g. “Our bodycon dresses run small: suggest one size up.” Prices, stock and opening hours come from your products and settings, so leave them out.
            </div>
            <label style={{ display: "block", marginTop: 10 }}>
                <span className="ac-label">Title</span>
                <input className="ac-input" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="Sizing" data-teach-note-title />
            </label>
            <label style={{ display: "block", marginTop: 10 }}>
                <span className="ac-label">What it should know</span>
                <textarea className="ac-input" rows={3} maxLength={400} value={body} onChange={e => setBody(e.target.value)} data-teach-note-body />
            </label>
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{full ? "The assistant is holding the most lessons it can: retire one first." : `${body.length}/400`}</span>
                <button type="button" className="ac-btn ac-btn-primary" onClick={save} disabled={busy || full || !title.trim() || !body.trim()} data-teach-note-save>{busy ? "Saving…" : "Save note"}</button>
            </div>
        </div>
    );
}

function PhotoCards({ onSaved }: { onSaved: () => void }) {
    const [files, setFiles] = useState<File[]>([]);
    const [roundId, setRoundId] = useState<string | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [guessing, setGuessing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [naming, setNaming] = useState(false);
    const [pick, setPick] = useState("");
    const [why, setWhy] = useState("");
    const input = useRef<HTMLInputElement>(null);
    const byLabel = useMemo(() => new Map(products.map(p => [label(p), p])), [products]);

    const current = cards.find(c => c.verdict === "pending" && c.description !== null) ?? null;
    const waiting = cards.filter(c => c.verdict === "pending" && c.description === null).length;
    const done = roundId && cards.length > 0 && cards.every(c => c.verdict !== "pending");

    const choose = (list: FileList | null) => {
        const all = Array.from(list ?? []);
        const ok = all.filter(f => TYPES.includes(f.type)).slice(0, MAX_PHOTOS);
        if (all.length > ok.length) toast.info(`Up to ${MAX_PHOTOS} photos, JPEG, PNG or WebP. Some were left out.`);
        setFiles(ok);
    };

    // Ask for guesses until none are left (each call guesses a few, inside the server's time budget).
    const guess = useCallback(async (id: string) => {
        setGuessing(true);
        for (let i = 0; i < 12; i++) {
            const r = await call(`/api/whatsapp/teach/photos/${id}`, json("POST", { action: "guess" }));
            if (!r.ok) { toast.error(r.data?.error ?? CALM); break; }
            setCards(r.data.cards);
            if (!r.data.left) break;
            await new Promise(res => setTimeout(res, 1500));
        }
        setGuessing(false);
    }, []);

    const start = async () => {
        if (files.length === 0) { input.current?.click(); return; }
        setBusy(true);
        const form = new FormData();
        for (const f of files) form.append("photos", f);
        const [up, prods] = await Promise.all([call("/api/whatsapp/teach/photos", { method: "POST", body: form }), call("/api/whatsapp/teach/photos")]);
        setBusy(false);
        if (!up.ok) { toast.error(up.data?.error ?? CALM); return; }
        if (up.data.refused) toast.info(`${up.data.refused} photo${up.data.refused === 1 ? " wasn't" : "s weren't"} readable and ${up.data.refused === 1 ? "was" : "were"} left out.`);
        setProducts(prods.data?.products ?? []);
        setRoundId(up.data.roundId);
        setFiles([]);
        const r = await call(`/api/whatsapp/teach/photos/${up.data.roundId}`);
        if (r.ok) setCards(r.data.cards);
        guess(up.data.roundId);
    };

    const answer = async (verdict: "correct" | "wrong" | "skip") => {
        if (!current || !roundId) return;
        let productId: string | null = null;
        if (verdict === "wrong") {
            const p = byLabel.get(pick.trim());
            if (!p) { toast.error("Choose the product from the list."); return; }
            productId = p.id;
        }
        setBusy(true);
        const r = await call(`/api/whatsapp/teach/photos/${roundId}`, json("POST", { action: "answer", cardId: current.id, verdict, productId, why }));
        setBusy(false);
        if (!r.ok) { toast.error(r.data?.error ?? CALM); return; }
        setNaming(false); setPick(""); setWhy("");
        const c = await call(`/api/whatsapp/teach/photos/${roundId}`);
        if (c.ok) setCards(c.data.cards);
        if (verdict !== "skip") onSaved();
    };

    const reset = () => { setRoundId(null); setCards([]); setFiles([]); };
    const tally = (v: Card["verdict"][]) => cards.filter(c => v.includes(c.verdict)).length;

    return (
        <div className="ac-card" data-teach-photos>
            <div className="ac-card-head"><div className="ac-card-title">Photo flashcards</div></div>
            <div style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                Customers often send a screenshot of a post. Show the assistant your photos and tell it which piece each one is, so it recognises them.
            </div>

            {!roundId && (
                <>
                    <button type="button" onClick={() => input.current?.click()} data-teach-choose
                        style={{ display: "block", width: "100%", marginTop: 12, padding: "22px 12px", borderRadius: 10, border: "1px dashed var(--ac-line)", background: "transparent", cursor: "pointer", color: "var(--ac-ink)" }}>
                        <div style={{ fontSize: 14 }}>{files.length ? `${files.length} photo${files.length === 1 ? "" : "s"} chosen` : "Choose photos"}</div>
                        <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 4 }}>Up to {MAX_PHOTOS} photos of your pieces. JPEG, PNG or WebP.</div>
                    </button>
                    <input ref={input} type="file" accept={TYPES.join(",")} multiple hidden onChange={e => choose(e.target.files)} data-teach-file />
                    <button type="button" className="ac-btn ac-btn-primary" style={{ marginTop: 12 }} onClick={start} disabled={busy} data-teach-start>
                        {busy ? "Uploading…" : "Start"}
                    </button>
                </>
            )}

            {roundId && !done && (
                <div style={{ marginTop: 12 }} data-teach-stepper>
                    {current ? (
                        <>
                            <div style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>Photo {cards.indexOf(current) + 1} of {cards.length}</div>
                            {current.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={current.imageUrl} alt="The photo to name" style={{ display: "block", width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 10, marginTop: 8, background: "var(--ac-line)" }} />
                            )}
                            {current.description && <div style={{ fontSize: 13, color: "var(--ac-ink-2, var(--ac-ink))", marginTop: 8 }}>{current.description}</div>}
                            <div style={{ fontSize: 14, marginTop: 8 }} data-teach-guess>
                                {current.guess ? <>Looks like: <strong>{current.guess.name}</strong></> : "The assistant isn't sure which piece this is."}
                            </div>
                            {!naming ? (
                                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                                    {current.guess && <button type="button" className="ac-btn ac-btn-primary" onClick={() => answer("correct")} disabled={busy} data-teach-correct>That's right</button>}
                                    <button type="button" className="ac-btn" onClick={() => setNaming(true)} disabled={busy} data-teach-wrong>{current.guess ? "Wrong" : "Name it"}</button>
                                    <button type="button" className="ac-btn" onClick={() => answer("skip")} disabled={busy} data-teach-skip>Skip</button>
                                </div>
                            ) : (
                                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                                    <label>
                                        <span className="ac-label">What is it?</span>
                                        <input className="ac-input" list="teach-products" value={pick} onChange={e => setPick(e.target.value)} placeholder="Start typing the product name or SKU" data-teach-pick />
                                        <datalist id="teach-products">{products.map(p => <option key={p.id} value={label(p)} />)}</datalist>
                                    </label>
                                    <label>
                                        <span className="ac-label">How to tell (optional)</span>
                                        <input className="ac-input" maxLength={150} value={why} onChange={e => setWhy(e.target.value)} placeholder="e.g. the ruffled hem and halter neck" />
                                    </label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <button type="button" className="ac-btn ac-btn-primary" onClick={() => answer("wrong")} disabled={busy} data-teach-save-name>{busy ? "Saving…" : "Save"}</button>
                                        <button type="button" className="ac-btn" onClick={() => setNaming(false)} disabled={busy}>Back</button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>{guessing || waiting ? `Looking at your photos… (${waiting} left)` : "Getting the photos ready…"}</div>
                    )}
                    {current && waiting > 0 && <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 8 }}>Still looking at {waiting} more…</div>}
                    {!guessing && waiting > 0 && current === null && (
                        <button type="button" className="ac-btn" style={{ marginTop: 8 }} onClick={() => guess(roundId)}>Try again</button>
                    )}
                </div>
            )}

            {done && (
                <div style={{ marginTop: 12 }} data-teach-done>
                    <div style={{ fontSize: 14 }}>
                        {tally(["correct", "wrong"])} lesson{tally(["correct", "wrong"]) === 1 ? "" : "s"} saved, {tally(["skipped"])} skipped{tally(["failed"]) ? `, ${tally(["failed"])} couldn't be read` : ""}.
                    </div>
                    <button type="button" className="ac-btn ac-btn-primary" style={{ marginTop: 10 }} onClick={reset} data-teach-more>Teach more photos</button>
                </div>
            )}
        </div>
    );
}
