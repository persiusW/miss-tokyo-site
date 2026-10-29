"use client";

// The inbox's teaching and composer pieces (shared WhatsApp agent spec, from
// GlowBook): the stat tiles over the inbox, "Correct" on one of the
// assistant's replies, and the composer with "Reply myself" (staff write from
// the shop's line; the assistant goes quiet in that chat) and "Tell the
// assistant" (a note for this chat; it replies now and can remember it).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "@/lib/toast";

export type InboxStats = { days: number; chats: number; waiting: number; assistantOrders: number; assistantSalesGhs: number; handedOver: number };
export type Can = { teach: boolean; reply: boolean };

const CALM = "Something happened. Please try again.";
const ghs = (n: number) => `GH₵ ${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;

async function post(url: string, body: unknown): Promise<{ ok: boolean; data: any }> {
    try {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        return { ok: res.ok, data: await res.json().catch(() => null) };
    } catch {
        return { ok: false, data: null };
    }
}

export function StatTiles({ stats }: { stats: InboxStats | null | undefined }) {
    const tile = (label: string, value: string, sub: string, warn = false) => (
        <div className="ac-card" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>{label}</div>
            <div style={{ fontSize: 22, color: warn ? "var(--ac-warn)" : "var(--ac-ink)", marginTop: 2 }}>{value}</div>
            <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 2 }}>{sub}</div>
        </div>
    );
    if (!stats) return null;
    const span = `Last ${stats.days} days`;
    return (
        <div className="wa-stats" data-wa-stats>
            {tile("Chats", String(stats.chats), `${span}, customers who wrote`)}
            {tile("Ordered with the assistant", String(stats.assistantOrders), stats.assistantOrders ? `${ghs(stats.assistantSalesGhs)} paid · ${span.toLowerCase()}` : span)}
            {tile("Handed to your team", String(stats.handedOver), span)}
            {tile("Waiting on your team", String(stats.waiting), stats.waiting ? "In Needs you" : "Nobody is waiting", stats.waiting > 0)}
        </div>
    );
}

/** A full-screen sheet, portalled to .admin-shell (a filtered ancestor would trap position: fixed, and body loses the colours). */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    const [host, setHost] = useState<Element | null>(null);
    useEffect(() => { setHost(document.querySelector(".admin-shell") ?? document.body); }, []);
    useEffect(() => {
        const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", esc);
        return () => window.removeEventListener("keydown", esc);
    }, [onClose]);
    if (!host) return null;
    return createPortal(
        <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose} data-wa-sheet
            style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div className="ac-card" onClick={e => e.stopPropagation()} style={{ width: "min(560px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", background: "var(--ac-surface, var(--ac-bg))" }}>
                <div className="ac-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="ac-card-title">{title}</div>
                    <button type="button" className="ac-btn" onClick={onClose} aria-label="Close">Close</button>
                </div>
                {children}
            </div>
        </div>,
        host,
    );
}

const field = { display: "block", marginTop: 12 } as const;
const hint = { display: "block", fontSize: 11, color: "var(--ac-ink-4)", marginTop: 4 } as const;
const quote = { fontSize: 13, background: "var(--ac-line)", borderRadius: 8, padding: "8px 10px", whiteSpace: "pre-wrap" as const, overflowWrap: "anywhere" as const };

/** Correct one of the assistant's replies: what it should have said and why → a lesson staff can edit → saved. */
export function CorrectPanel(p: { conversationId: string; messageId: string; said: string; customerWrote: string | null; onClose: () => void; onSaved: () => void }) {
    const [right, setRight] = useState("");
    const [why, setWhy] = useState("");
    const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
    const [canSend, setCanSend] = useState(false);
    const [sendNow, setSendNow] = useState(true);
    const [busy, setBusy] = useState(false);
    const url = `/api/whatsapp/inbox/${p.conversationId}/correct`;

    const makeDraft = async () => {
        if (!right.trim()) { toast.error("Say what it should have said."); return; }
        setBusy(true);
        const r = await post(url, { step: "draft", messageId: p.messageId, rightAnswer: right, why });
        setBusy(false);
        if (!r.ok) { toast.error(r.data?.error ?? CALM); return; }
        setDraft(r.data.draft);
        setCanSend(!!r.data.canSend);
        setSendNow(!!r.data.canSend);
    };

    const save = async () => {
        if (!draft) return;
        setBusy(true);
        const r = await post(url, { step: "save", messageId: p.messageId, title: draft.title, body: draft.body, rightAnswer: right, sendNow: canSend && sendNow });
        setBusy(false);
        if (!r.ok) { toast.error(r.data?.error ?? CALM); return; }
        toast.success(r.data?.sent === false ? "Lesson saved. The message to the customer didn't send; reply from your WhatsApp." : r.data?.sent ? "Lesson saved and the right answer sent." : "Lesson saved. The assistant uses it from the next message.");
        p.onSaved();
        p.onClose();
    };

    return (
        <Sheet title="Correct this reply" onClose={p.onClose}>
            {p.customerWrote && (<><div style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>The customer wrote</div><div style={quote}>{p.customerWrote}</div></>)}
            <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 10 }}>The assistant replied</div>
            <div style={quote}>{p.said}</div>
            {!draft ? (
                <>
                    <label style={field}>
                        <span className="ac-label">What should it have said?</span>
                        <textarea className="ac-input" rows={3} maxLength={600} value={right} onChange={e => setRight(e.target.value)} data-wa-correct-right />
                    </label>
                    <label style={field}>
                        <span className="ac-label">Why? The rule the assistant should remember</span>
                        <textarea className="ac-input" rows={2} maxLength={400} value={why} onChange={e => setWhy(e.target.value)} data-wa-correct-why />
                        <span style={hint}>Keep prices and times out: those come from your products and hours.</span>
                    </label>
                    <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                        <button type="button" className="ac-btn ac-btn-primary" onClick={makeDraft} disabled={busy} data-wa-correct-draft>{busy ? "Thinking…" : "Next"}</button>
                    </div>
                </>
            ) : (
                <>
                    <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 14 }}>The lesson it will remember for every customer. Edit it if you like.</div>
                    <label style={field}>
                        <span className="ac-label">Title</span>
                        <input className="ac-input" maxLength={80} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} data-wa-correct-title />
                    </label>
                    <label style={field}>
                        <span className="ac-label">Lesson</span>
                        <textarea className="ac-input" rows={3} maxLength={400} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} data-wa-correct-body />
                    </label>
                    <label style={{ ...field, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <input type="checkbox" checked={canSend && sendNow} disabled={!canSend} onChange={e => setSendNow(e.target.checked)} style={{ marginTop: 3 }} />
                        <span style={{ fontSize: 13 }}>
                            Also send the right answer to this customer now
                            {!canSend && <span style={hint}>Their last message was over 24 hours ago, so WhatsApp won't deliver it from here.</span>}
                        </span>
                    </label>
                    <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button type="button" className="ac-btn" onClick={() => setDraft(null)} disabled={busy}>Back</button>
                        <button type="button" className="ac-btn ac-btn-primary" onClick={save} disabled={busy} data-wa-correct-save>{busy ? "Saving…" : "Save lesson"}</button>
                    </div>
                </>
            )}
        </Sheet>
    );
}

/** Under the chat: Reply myself (from the shop's line) or Tell the assistant (a note for this chat). */
export function Composer(p: { conversationId: string; can: Can; windowOpen: boolean; onDone: () => void }) {
    const modes = [...(p.can.reply ? ["reply"] as const : []), ...(p.can.teach ? ["tell"] as const : [])];
    const [mode, setMode] = useState<"reply" | "tell">(modes[0] ?? "reply");
    const [text, setText] = useState("");
    const [remember, setRemember] = useState(true);
    const [busy, setBusy] = useState(false);
    if (modes.length === 0) return null;

    const send = async () => {
        const t = text.trim();
        if (!t) return;
        setBusy(true);
        const r = await post(`/api/whatsapp/inbox/${p.conversationId}/${mode}`, mode === "reply" ? { text: t } : { text: t, remember });
        setBusy(false);
        if (!r.ok) { toast.error(r.data?.error ?? CALM); return; }
        setText("");
        toast.success(mode === "tell" ? "The assistant is replying with your note. Its answer shows here within a minute."
            : r.data?.waiting ? (r.data.asked ? "Saved. We've asked them on WhatsApp to reply, and your message goes the moment they do." : "Saved with your earlier message. Both go the moment they reply.")
            : "Sent. The assistant stays quiet in this chat until you hand it back.");
        p.onDone();
    };

    const seg = (m: "reply" | "tell", label: string) => (
        <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} data-wa-mode={m}
            style={{ fontSize: 12, padding: "6px 12px", borderRadius: 999, border: 0, cursor: "pointer", background: mode === m ? "var(--ac-ink)" : "transparent", color: mode === m ? "var(--ac-bg, #fff)" : "var(--ac-ink-2, var(--ac-ink))" }}>
            {label}
        </button>
    );

    return (
        <div style={{ borderTop: "1px solid var(--ac-line)", padding: "10px 12px", flex: "none" }} data-wa-composer>
            {modes.length > 1 && (
                <div role="tablist" aria-label="Who writes" style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 999, border: "1px solid var(--ac-line)", marginBottom: 8 }}>
                    {seg("reply", "Reply myself")}{seg("tell", "Tell the assistant")}
                </div>
            )}
            {!p.windowOpen && mode === "tell" ? (
                <div style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>Their last message was over 24 hours ago, so the assistant can't message them first. Use Reply myself instead.</div>
            ) : (
                <>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                        <textarea className="ac-input" rows={2} maxLength={1000} value={text} onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
                            placeholder={mode === "reply" ? "Write to the customer…" : "Tell the assistant what to say or know, e.g. “She can collect at Osu tomorrow.”"}
                            style={{ flex: 1, resize: "vertical", minHeight: 44 }} data-wa-composer-text />
                        <button type="button" className="ac-btn ac-btn-primary" onClick={send} disabled={busy || !text.trim()} data-wa-composer-send>
                            {busy ? "Sending…" : "Send"}
                        </button>
                    </div>
                    {!p.windowOpen && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--ac-ink-3)" }} data-wa-late-hint>
                            Their last message was over 24 hours ago. We&apos;ll send them a WhatsApp asking them to reply, and your message goes the moment they do.
                        </div>
                    )}
                    {mode === "tell" && (
                        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, fontSize: 12, color: "var(--ac-ink-3)" }}>
                            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} data-wa-remember />
                            Remember this for next time (saved as a lesson)
                        </label>
                    )}
                </>
            )}
        </div>
    );
}
