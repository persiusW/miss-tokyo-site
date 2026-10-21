"use client";

// Inbox › Teach the assistant: the notes the shop assistant uses (typed notes,
// corrections from chats, hints from Tell the assistant, photo lessons) with a
// panel to add, edit or retire one; photo flashcards (upload, the assistant
// guesses which piece each photo shows, staff confirm or name it, each becomes
// a lesson) with how many active products don't have one yet; and, for the
// admin, the answers Miss Tokyo AI gives staff. All through the existing
// /api/whatsapp/teach/* and /api/ai/saved-answers routes, which check the role.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Badge, Banner, Btn, Card, Empty, ErrorState, Field, Panel, SkeletonRows, Switch, Thumb, toast, when, plural,
} from "@/components/admin/ui";
import { KIND_LABEL, MAX_ACTIVE_LESSONS } from "@/lib/ai/teach/lessonRules";
import { call, send } from "./api";
import { InboxHeader } from "./InboxPage";
import { NotePanel, type Lesson } from "./NotePanel";
import "./inbox.css";

type Product = { id: string; name: string; sku: string | null };
type PhotoCard = { id: string; imageUrl: string | null; description: string | null; guess: { id: string; name: string } | null; verdict: "pending" | "correct" | "wrong" | "skipped" | "failed"; answerName: string | null };
type Saved = { id: string; title: string; body: string; roles: string[]; active: boolean; updated_at: string };

const MAX_PHOTOS = 10;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const productLabel = (p: Product) => `${p.name}${p.sku ? ` (SKU ${p.sku})` : ""}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" });

export function TeachPage({ canTeach, isAdmin }: { canTeach: boolean; isAdmin: boolean }) {
    const [lessons, setLessons] = useState<Lesson[] | null>(null);
    const [max, setMax] = useState(MAX_ACTIVE_LESSONS);
    const [failed, setFailed] = useState(false);
    const [open, setOpen] = useState<Lesson | "new" | null>(null);
    const [needs, setNeeds] = useState<number | null>(null);

    const load = useCallback(async () => {
        if (!canTeach) return;
        const r = await call("/api/whatsapp/teach/lessons");
        if (r.ok && Array.isArray(r.data?.lessons)) { setLessons(r.data.lessons); setMax(r.data.max ?? MAX_ACTIVE_LESSONS); setFailed(false); }
        else setFailed(true);
    }, [canTeach]);
    useEffect(() => { void load(); }, [load]);
    useEffect(() => { call("/api/admin/v2/nav-counts").then(r => setNeeds(r.ok ? r.data?.inbox ?? null : null)); }, []);

    const full = !!lessons && lessons.length >= max;
    return (
        <div className="inbox">
            <InboxHeader tab="teach" needs={needs} canTeachTab
                action={canTeach ? <Btn kind="primary" icon="plus" onClick={() => setOpen("new")}>Add a note</Btn> : undefined} />
            {!canTeach && <Banner tone="neutral" title="Teaching the assistant is switched off">Notes and photo flashcards come back when it is switched on again.</Banner>}
            {canTeach && (
                <div className="teach-cols">
                    <Card title="Notes the assistant uses" action={lessons && <span className="sm muted">{lessons.length} of {max}</span>}>
                        {failed && !lessons ? <ErrorState what="the notes" onRetry={() => void load()} />
                            : !lessons ? <SkeletonRows n={4} cols={2} />
                            : lessons.length === 0 ? <div className="card-body"><Empty icon="edit" title="Nothing taught yet" body="Add a note, correct one of its replies in a chat, or teach it your pieces with photos." /></div>
                            : (
                                <div className="rows">
                                    {lessons.map(l => (
                                        <button type="button" key={l.id} className="row click" style={{ alignItems: "flex-start" }} onClick={() => setOpen(l)}>
                                            {l.imageUrl && <Thumb src={l.imageUrl} />}
                                            <span className="row-main">
                                                <span className="hrow-sm wrap"><span className="row-title">{l.title}</span><Badge plain>{KIND_LABEL[l.kind]}</Badge></span>
                                                <span className="row-sub" style={{ display: "block", overflowWrap: "anywhere" }}>{l.body}</span>
                                                <span className="xs muted" style={{ display: "block", marginTop: 4 }}>Added by {l.createdByName ?? "your team"} · {day(l.createdAt)}</span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        {full && <div className="card-body"><p className="help">The assistant is holding the most notes it can. Retire one to add another.</p></div>}
                    </Card>
                    <div className="stack">
                        <PhotoCards onSaved={load} />
                        {isAdmin && <SavedAnswers />}
                    </div>
                </div>
            )}
            {!canTeach && isAdmin && <SavedAnswers />}
            {open && <NotePanel lesson={open === "new" ? null : open} full={full} onClose={() => setOpen(null)} onSaved={() => void load()} />}
        </div>
    );
}

function PhotoCards({ onSaved }: { onSaved: () => void }) {
    const [files, setFiles] = useState<File[]>([]);
    const [roundId, setRoundId] = useState<string | null>(null);
    const [cards, setCards] = useState<PhotoCard[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [guessing, setGuessing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [naming, setNaming] = useState(false);
    const [pick, setPick] = useState("");
    const [why, setWhy] = useState("");
    const [coverage, setCoverage] = useState<{ withCard: number; withoutCard: number } | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const byLabel = useMemo(() => new Map(products.map(p => [productLabel(p), p])), [products]);

    const loadCoverage = useCallback(() => { call("/api/admin/v2/inbox/flashcards").then(r => setCoverage(r.ok ? r.data : null)); }, []);
    useEffect(() => { loadCoverage(); }, [loadCoverage]);

    const current = cards.find(c => c.verdict === "pending" && c.description !== null) ?? null;
    const waiting = cards.filter(c => c.verdict === "pending" && c.description === null).length;
    const done = !!roundId && cards.length > 0 && cards.every(c => c.verdict !== "pending");

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
            const r = await call(`/api/whatsapp/teach/photos/${id}`, send("POST", { action: "guess" }));
            if (!r.ok) { toast.fromResponse(r.data, { audience: "staff" }); break; }
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
        if (!up.ok) { toast.fromResponse(up.data, { audience: "staff" }); return; }
        if (up.data.refused) toast.info(`${plural(up.data.refused, "photo")} couldn't be read and ${up.data.refused === 1 ? "was" : "were"} left out.`);
        setProducts(prods.data?.products ?? []);
        setRoundId(up.data.roundId);
        setFiles([]);
        const r = await call(`/api/whatsapp/teach/photos/${up.data.roundId}`);
        if (r.ok) setCards(r.data.cards);
        void guess(up.data.roundId);
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
        const r = await call(`/api/whatsapp/teach/photos/${roundId}`, send("POST", { action: "answer", cardId: current.id, verdict, productId, why }));
        setBusy(false);
        if (!r.ok) { toast.fromResponse(r.data, { audience: "staff" }); return; }
        setNaming(false); setPick(""); setWhy("");
        const c = await call(`/api/whatsapp/teach/photos/${roundId}`);
        if (c.ok) setCards(c.data.cards);
        if (verdict !== "skip") { onSaved(); loadCoverage(); }
    };

    const reset = () => { setRoundId(null); setCards([]); setFiles([]); };
    const tally = (v: PhotoCard["verdict"][]) => cards.filter(c => v.includes(c.verdict)).length;

    return (
        <Card title="Photo flashcards" action={!roundId && <Btn sm icon="upload" onClick={() => input.current?.click()}>Add photos</Btn>}>
            <div className="card-body stack-sm">
                <p className="sm ink2">Customers often send a screenshot of a post. Show the assistant your photos and tell it which piece each one is, so it recognises them.</p>
                {coverage && (
                    <p className="help" style={{ margin: 0 }}>
                        {coverage.withCard ? `${plural(coverage.withCard, "piece has", "pieces have")} flashcards. ` : ""}
                        {coverage.withoutCard ? `${plural(coverage.withoutCard, "active product")} ${coverage.withoutCard === 1 ? "doesn't" : "don't"} have one yet.` : "Every active product has one."}
                    </p>
                )}
                <input ref={input} type="file" accept={TYPES.join(",")} multiple hidden onChange={e => choose(e.target.files)} />

                {!roundId && (
                    <>
                        <button type="button" className="teach-pick" onClick={() => input.current?.click()}>
                            <div className="strong">{files.length ? `${plural(files.length, "photo")} chosen` : "Choose photos"}</div>
                            <div className="sm muted">Up to {MAX_PHOTOS} photos of your pieces. JPEG, PNG or WebP.</div>
                        </button>
                        {files.length > 0 && <div className="hrow end"><Btn kind="primary" onClick={() => void start()} disabled={busy}>{busy ? "Uploading…" : "Start"}</Btn></div>}
                    </>
                )}

                {roundId && !done && (
                    current ? (
                        <div className="stack-sm">
                            <div className="sm muted">Photo {cards.indexOf(current) + 1} of {cards.length}</div>
                            {/* A signed, short-lived link: next/image can't optimise it. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {current.imageUrl && <img className="teach-photo" src={current.imageUrl} alt="The photo to name" />}
                            {current.description && <p className="sm ink2" style={{ margin: 0 }}>{current.description}</p>}
                            <div>{current.guess ? <>Looks like: <strong>{current.guess.name}</strong></> : "The assistant isn't sure which piece this is."}</div>
                            {!naming ? (
                                <div className="hrow-sm wrap">
                                    {current.guess && <Btn kind="primary" onClick={() => void answer("correct")} disabled={busy}>That&apos;s right</Btn>}
                                    <Btn onClick={() => setNaming(true)} disabled={busy}>{current.guess ? "Wrong" : "Name it"}</Btn>
                                    <Btn kind="ghost" onClick={() => void answer("skip")} disabled={busy}>Skip</Btn>
                                </div>
                            ) : (
                                <div className="stack-sm">
                                    <Field label="What is it?" htmlFor="teach-pick">
                                        <input id="teach-pick" className="input" list="teach-products" value={pick} onChange={e => setPick(e.target.value)} placeholder="Start typing the product name or SKU" />
                                        <datalist id="teach-products">{products.map(p => <option key={p.id} value={productLabel(p)} />)}</datalist>
                                    </Field>
                                    <Field label="How to tell (optional)" htmlFor="teach-why">
                                        <input id="teach-why" className="input" maxLength={150} value={why} onChange={e => setWhy(e.target.value)} placeholder="e.g. the ruffled hem and halter neck" />
                                    </Field>
                                    <div className="hrow-sm">
                                        <Btn kind="primary" onClick={() => void answer("wrong")} disabled={busy}>{busy ? "Saving…" : "Save"}</Btn>
                                        <Btn kind="ghost" onClick={() => setNaming(false)} disabled={busy}>Back</Btn>
                                    </div>
                                </div>
                            )}
                            {waiting > 0 && <p className="help" style={{ margin: 0 }}>Still looking at {waiting} more…</p>}
                        </div>
                    ) : (
                        <div className="stack-sm">
                            <p className="sm muted" role="status">{guessing || waiting ? `Looking at your photos… (${waiting} left)` : "Getting the photos ready…"}</p>
                            {!guessing && waiting > 0 && <div><Btn onClick={() => void guess(roundId)}>Try again</Btn></div>}
                        </div>
                    )
                )}

                {done && (
                    <div className="stack-sm">
                        <p role="status" style={{ margin: 0 }}>
                            {plural(tally(["correct", "wrong"]), "lesson")} saved, {tally(["skipped"])} skipped{tally(["failed"]) ? `, ${tally(["failed"])} couldn't be read` : ""}.
                        </p>
                        <div><Btn kind="primary" onClick={reset}>Teach more photos</Btn></div>
                    </div>
                )}
            </div>
        </Card>
    );
}

const ROLES = [{ v: "admin", l: "Admin" }, { v: "owner", l: "Owner" }, { v: "sales_staff", l: "Sales staff" }] as const;

/** Answers Miss Tokyo AI gives staff (admin only): add, edit, choose who sees each, switch off. Nothing is deleted. */
function SavedAnswers() {
    const [list, setList] = useState<Saved[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [open, setOpen] = useState<Saved | "new" | null>(null);
    const load = useCallback(async () => {
        const r = await call("/api/ai/saved-answers");
        if (r.ok && Array.isArray(r.data?.saved)) { setList(r.data.saved); setFailed(false); } else setFailed(true);
    }, []);
    useEffect(() => { void load(); }, [load]);
    return (
        <Card title="Answers Miss Tokyo AI gives staff" action={<Btn sm icon="plus" onClick={() => setOpen("new")}>Add an answer</Btn>}>
            {failed && !list ? <ErrorState what="the saved answers" onRetry={() => void load()} />
                : !list ? <SkeletonRows n={3} cols={2} />
                : list.length === 0 ? <div className="card-body"><Empty icon="chat" title="No saved answers yet" body="When you answer a question for admin with Save switched on, or add one here, Miss Tokyo AI gives that answer to the next person who asks." /></div>
                : (
                    <div className="rows">
                        {list.map(s => (
                            <button type="button" key={s.id} className="row click" style={{ alignItems: "flex-start" }} onClick={() => setOpen(s)}>
                                <span className="row-main">
                                    <span className="hrow-sm wrap"><span className="row-title">{s.title}</span>{!s.active && <Badge plain>Off</Badge>}</span>
                                    <span className="row-sub" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.body}</span>
                                    <span className="xs muted" style={{ display: "block", marginTop: 4 }}>
                                        For {s.roles.map(r => ROLES.find(x => x.v === r)?.l ?? r).join(", ")} · updated {when(s.updated_at).replace(/^\w/, x => x.toLowerCase())}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            {open && <SavedPanel saved={open === "new" ? null : open} onClose={() => setOpen(null)} onSaved={() => void load()} />}
        </Card>
    );
}

function SavedPanel({ saved, onClose, onSaved }: { saved: Saved | null; onClose: () => void; onSaved: () => void }) {
    const [title, setTitle] = useState(saved?.title ?? "");
    const [body, setBody] = useState(saved?.body ?? "");
    const [roles, setRoles] = useState<string[]>(saved?.roles ?? ROLES.map(r => r.v));
    const [active, setActive] = useState(saved?.active ?? true);
    const [busy, setBusy] = useState(false);
    const save = async () => {
        setBusy(true);
        const r = saved
            ? await call("/api/ai/saved-answers", send("PATCH", { id: saved.id, title, body, roles, active }))
            : await call("/api/ai/saved-answers", send("POST", { title, body, roles }));
        setBusy(false);
        if (!r.ok || !r.data?.saved) { toast.fromResponse(r.data, { audience: "staff" }); return; }
        toast.success(saved ? "Saved answer updated" : "Saved answer added");
        onSaved();
        onClose();
    };
    const toggle = (role: string, on: boolean) => setRoles(rs => (on ? [...new Set([...rs, role])] : rs.filter(x => x !== role)));
    return (
        <Panel open onClose={onClose} title={saved ? "Edit saved answer" : "Add a saved answer"} sub="Miss Tokyo AI gives this answer to staff who ask the same thing."
            footer={<>
                <Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
                <Btn kind="primary" onClick={() => void save()} disabled={busy || !title.trim() || !body.trim() || roles.length === 0}>{busy ? "Saving…" : "Save"}</Btn>
            </>}>
            <div className="stack">
                <Field label="Title" htmlFor="sa-title" help="The question staff ask.">
                    <input id="sa-title" data-autofocus className="input" maxLength={160} value={title} onChange={e => setTitle(e.target.value)} />
                </Field>
                <Field label="Answer" htmlFor="sa-body">
                    <textarea id="sa-body" className="textarea" maxLength={4000} value={body} onChange={e => setBody(e.target.value)} />
                </Field>
                <div>
                    <div className="section-t">Who gets this answer</div>
                    {ROLES.map(r => (
                        <div key={r.v} className="hrow between" style={{ minHeight: 44 }}>
                            <span className="sm">{r.l}</span>
                            <Switch label={`${r.l} get this answer`} checked={roles.includes(r.v)} onChange={on => toggle(r.v, on)} />
                        </div>
                    ))}
                    {roles.length === 0 && <p className="err-text" role="alert">Choose at least one.</p>}
                </div>
                {saved && (
                    <div className="hrow between">
                        <div><div className="sm strong">In use</div><div className="help">Switch it off to stop Miss Tokyo AI giving it. It is kept, never deleted.</div></div>
                        <Switch label="In use" checked={active} onChange={setActive} />
                    </div>
                )}
            </div>
        </Panel>
    );
}
