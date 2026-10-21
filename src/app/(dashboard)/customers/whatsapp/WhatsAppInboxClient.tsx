"use client";

// WhatsApp inbox: the chat list (tabs: Needs you, Assistant, Notices, Dealt
// with) and one chat's messages, with markers for what happened (handed over,
// handed back, dealt with: by whom) and the customer's orders. Staff reply from
// the main WhatsApp phone (the number here runs through the API, so it has no
// phone app), then mark the chat dealt with or hand it back to the assistant.
//
// Laid out like WhatsApp on desktop and tablet: the inbox fills the space
// under the page header, and the list and the open chat each scroll on their
// own, so a long chat never pushes the list out of view. On a phone it shows
// the list or one chat, with a back button.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { canAnswerWaiting, mediaKind, waitingFor, waitingMessages, type InboxConversation, type InboxTab, type Standing } from "@/lib/whatsapp/inbox";
import type { CustomerPanel } from "@/lib/whatsapp/customerPanel";

/** media: what can be shown of the message's file (see mediaState); the file itself loads through the media route. */
type Message = { id: string; direction: "inbound" | "outbound"; text: string | null; type: string | null; at: string; media?: "ready" | "fetch" | "missing" | null };
type ChatEvent = { id: string; label: string; kind: string; at: string };
/** loadedAt: when it was fetched, the "now" for what is waiting (render stays pure). */
type Thread = { conversation: InboxConversation; messages: Message[]; events?: ChatEvent[]; customer?: CustomerPanel | null; loadedAt: number };
type Counts = Record<InboxTab, number>;

const TAB_LABEL: Record<InboxTab, string> = { all: "All", needs: "Needs you", assistant: "Assistant", notices: "Notices", dealt: "Dealt with" };
const TAB_ORDER: InboxTab[] = ["needs", "all", "assistant", "notices", "dealt"];
const ghs = (n: number) => `GH₵ ${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;

const CALM = "Something happened. Please refresh and try again.";
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
/** "Today", "Yesterday", or "16 Oct" (with the year when it isn't this year): the chip between days. */
export function dayLabel(iso: string, now = new Date()): string {
    const d = new Date(iso);
    const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((start(now) - start(d)) / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}
/** Within this many pixels of the bottom counts as reading the latest messages. */
const NEAR_BOTTOM = 120;
/** Never shorter than this, so a small window still shows a few messages. */
const MIN_HEIGHT = 420;
const local = (intl: string) => (/^233\d{9}$/.test(intl) ? `0${intl.slice(3)}` : `+${intl}`);

async function getJson(url: string, init?: RequestInit): Promise<{ ok: boolean; data: any }> {
    try {
        const res = await fetch(url, { cache: "no-store", ...init });
        return { ok: res.ok, data: await res.json().catch(() => null) };
    } catch {
        return { ok: false, data: null };
    }
}

const STANDING_LABEL: Record<Standing, string> = { needs: "Needs you", dealt: "Dealt with", assistant: "Assistant", notices: "Notices" };

function StandingBadge({ c }: { c: Pick<InboxConversation, "standing"> }) {
    const needs = c.standing === "needs";
    return (
        <span data-wa-standing={c.standing} style={{
            fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap",
            background: needs ? "color-mix(in oklab, var(--ac-warn) 15%, transparent)" : "var(--ac-line)",
            color: needs ? "var(--ac-warn)" : "var(--ac-ink-3)",
        }}>
            {STANDING_LABEL[c.standing]}
        </span>
    );
}

export default function WhatsAppInboxClient() {
    const router = useRouter();
    const params = useSearchParams();
    const selected = params.get("c");
    const [list, setList] = useState<{ chats: InboxConversation[]; counts: Counts; loadedAt: number } | null>(null);
    // null until the first load picks it: Needs you when someone is waiting, else All.
    const [tab, setTab] = useState<InboxTab | null>(null);
    const [listError, setListError] = useState<string | null>(null);
    const [thread, setThread] = useState<Thread | null>(null);
    const [threadError, setThreadError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [answering, setAnswering] = useState<string | null>(null);   // the chat the assistant is replying in
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");   // the search, sent once typing pauses
    const rootRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const shownChat = useRef<string | null>(null);
    const lastCount = useRef(0);

    const loadList = useCallback(async () => {
        const qs = new URLSearchParams({ tab: tab ?? "all", ...(query ? { q: query } : {}) });
        const r = await getJson(`/api/whatsapp/inbox?${qs}`);
        if (r.ok && Array.isArray(r.data?.conversations) && r.data?.counts) {
            setList({ chats: r.data.conversations, counts: r.data.counts, loadedAt: Date.now() });
            setListError(null);
            if (tab === null) setTab(r.data.counts.needs > 0 ? "needs" : "all");
        } else setListError(r.data?.error ?? CALM);
    }, [tab, query]);

    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const loadThread = useCallback(async (id: string) => {
        const r = await getJson(`/api/whatsapp/inbox/${id}`);
        if (r.ok && r.data?.conversation) { setThread({ ...r.data, loadedAt: Date.now() }); setThreadError(null); }
        else { setThread(null); setThreadError(r.data?.error ?? CALM); }
    }, []);

    useEffect(() => {
        loadList();
        const t = setInterval(loadList, 20_000);
        return () => clearInterval(t);
    }, [loadList]);

    useEffect(() => {
        if (!selected) { setThread(null); return; }
        setThread(t => (t?.conversation.id === selected ? t : null));
        loadThread(selected);
        const t = setInterval(() => loadThread(selected), 20_000);
        return () => clearInterval(t);
    }, [selected, loadThread]);

    // Fill the space under the page header: the panes scroll, the page doesn't.
    useLayoutEffect(() => {
        const el = rootRef.current;
        const page = el?.closest(".admin-page") as HTMLElement | null;
        if (!el || !page) return;
        page.classList.add("wa-fit");
        const fit = () => {
            const top = el.getBoundingClientRect().top - page.getBoundingClientRect().top + page.scrollTop;
            const bottom = parseFloat(getComputedStyle(page).paddingBottom) || 0;
            el.style.height = `${Math.max(MIN_HEIGHT, page.clientHeight - top - bottom)}px`;
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(page);
        window.addEventListener("resize", fit);
        return () => { ro.disconnect(); window.removeEventListener("resize", fit); page.classList.remove("wa-fit"); el.style.height = ""; };
    }, []);

    // A newly opened chat starts at its latest message; on a refresh, follow new
    // messages only if the reader was already at the bottom.
    useLayoutEffect(() => {
        const box = scrollRef.current;
        if (!box || !thread) return;
        const opened = shownChat.current !== thread.conversation.id;
        const grew = thread.messages.length > lastCount.current;
        const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_BOTTOM;
        if (opened || (grew && atBottom)) box.scrollTop = box.scrollHeight;
        shownChat.current = thread.conversation.id;
        lastCount.current = thread.messages.length;
    }, [thread]);

    const open = (id: string) => router.replace(`/customers/whatsapp?c=${id}`, { scroll: false });
    const close = () => router.replace("/customers/whatsapp", { scroll: false });

    const dealtWith = async () => {
        if (!thread) return;
        setBusy(true);
        const r = await getJson(`/api/whatsapp/inbox/${thread.conversation.id}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dealt_with" }),
        });
        setBusy(false);
        if (!r.ok) { setThreadError(r.data?.error ?? CALM); return; }
        await Promise.all([loadThread(thread.conversation.id), loadList()]);
    };

    const handBack = async (answer: boolean) => {
        if (!thread) return;
        setBusy(true);
        const r = await getJson(`/api/whatsapp/inbox/${thread.conversation.id}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "hand_back", answer }),
        });
        setBusy(false);
        if (!r.ok) { setThreadError(r.data?.error ?? CALM); return; }
        setAnswering(answer ? thread.conversation.id : null);
        await Promise.all([loadThread(thread.conversation.id), loadList()]);
    };

    // Customer messages after our last one. Staff reply from their own WhatsApp, which we don't see, so they choose.
    const waiting = useMemo(() => (thread ? waitingMessages(thread.messages, thread.loadedAt) : []), [thread]);
    const offerAnswer = !!thread && canAnswerWaiting(thread.conversation.mode, waiting, thread.loadedAt);
    const waitingLabel = `(${waiting.length} waiting)`;
    const wraps = { whiteSpace: "normal", textAlign: "left", maxWidth: "100%" } as const;   // long labels wrap on a phone

    // The server filters by tab and search, and puts chats waiting for a person first.
    const shown = list?.chats ?? null;

    // Messages and markers in time order, with a date chip before the first of each day.
    const rows = useMemo(() => {
        type Row = { kind: "day"; key: string; label: string } | { kind: "msg"; m: Message } | { kind: "event"; e: ChatEvent };
        const items: ({ at: string } & ({ kind: "msg"; m: Message } | { kind: "event"; e: ChatEvent }))[] = [
            ...(thread?.messages ?? []).map(m => ({ kind: "msg" as const, m, at: m.at })),
            ...(thread?.events ?? []).map(e => ({ kind: "event" as const, e, at: e.at })),
        ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
        const out: Row[] = [];
        let day = "";
        for (const it of items) {
            const label = dayLabel(it.at);
            if (label !== day) { out.push({ kind: "day", key: `day-${it.kind === "msg" ? it.m.id : it.e.id}`, label }); day = label; }
            out.push(it.kind === "msg" ? { kind: "msg", m: it.m } : { kind: "event", e: it.e });
        }
        return out;
    }, [thread]);

    const muted = { fontSize: 13, color: "var(--ac-ink-3)" } as const;

    return (
        <div ref={rootRef} className={`wa-inbox${selected ? " has-chat" : ""}`} data-wa-inbox>
            <style>{`
                .admin-page.wa-fit { padding-bottom: 16px; }
                .wa-inbox { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; min-height: ${MIN_HEIGHT}px; }
                .wa-pane { display: flex; flex-direction: column; min-height: 0; padding: 0; overflow: hidden; }
                .wa-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
                .wa-back { display: inline-flex; }
                .wa-inbox.has-chat .wa-list { display: none; }
                .wa-inbox:not(.has-chat) .wa-chat { display: none; }
                @media (min-width: 760px) {
                    .wa-inbox { grid-template-columns: 300px minmax(0, 1fr); }
                    .wa-inbox.has-chat .wa-list, .wa-inbox:not(.has-chat) .wa-chat { display: flex; }
                    .wa-back { display: none; }
                }
                @media (min-width: 1100px) { .wa-inbox { grid-template-columns: 360px minmax(0, 1fr); } }
            `}</style>

            <div className="ac-card wa-pane wa-list" data-wa-list>
                <div style={{ padding: 12, borderBottom: "1px solid var(--ac-line)", flex: "none" }}>
                    <input className="ac-input" type="search" placeholder="Search name, number or message" value={search}
                        onChange={e => setSearch(e.target.value)} aria-label="Search chats" data-wa-search />
                    <div role="tablist" aria-label="Chat filter" style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 2 }} data-wa-tabs>
                        {TAB_ORDER.map(t => {
                            const on = (tab ?? "all") === t;
                            const n = list?.counts[t];
                            return (
                                <button key={t} type="button" role="tab" aria-selected={on} onClick={() => setTab(t)} data-wa-tab={t}
                                    style={{
                                        flex: "none", fontSize: 12, padding: "4px 10px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
                                        border: `1px solid ${on ? "var(--ac-ink)" : "var(--ac-line)"}`,
                                        background: on ? "var(--ac-ink)" : "transparent", color: on ? "var(--ac-bg, #fff)" : "var(--ac-ink-2, var(--ac-ink))",
                                    }}>
                                    {TAB_LABEL[t]}{n !== undefined ? ` ${n}` : ""}
                                    {t === "needs" && !!n && !on && <span aria-hidden style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--ac-warn)", marginLeft: 6, verticalAlign: "middle" }} />}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="wa-scroll" data-wa-list-scroll>
                    {listError && <div style={{ padding: 16, ...muted }}>{listError}</div>}
                    {!listError && !list && <div style={{ padding: 16, ...muted }}>Loading…</div>}
                    {list && list.counts.all === 0 && <div className="ac-empty"><div className="ac-empty-title">No WhatsApp chats yet.</div></div>}
                    {list && list.counts.all > 0 && shown?.length === 0 && (
                        <div style={{ padding: 16, ...muted }}>
                            {query ? "No chats match that." : tab === "needs" ? "Nobody is waiting for a person." : "No chats here."}
                        </div>
                    )}
                    {shown?.map(c => (
                        <button key={c.id} type="button" onClick={() => open(c.id)} data-wa-chat aria-current={c.id === selected ? "true" : undefined}
                            style={{
                                display: "block", width: "100%", textAlign: "left", padding: "12px 16px", border: 0, borderBottom: "1px solid var(--ac-line)",
                                background: c.id === selected ? "var(--ac-line)" : "transparent", cursor: "pointer",
                            }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                                <span style={{ fontSize: 14, color: "var(--ac-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {c.name ?? local(c.phone)}
                                </span>
                                <span style={{ fontSize: 11, color: "var(--ac-ink-4)", whiteSpace: "nowrap" }}>{when(c.lastMessageAt)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginTop: 4 }}>
                                <span style={{ fontSize: 12, color: "var(--ac-ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {c.preview ? `${c.preview.direction === "outbound" ? "You: " : ""}${c.preview.text}` : "No messages yet"}
                                </span>
                                <StandingBadge c={c} />
                            </div>
                            {c.standing === "needs" && (
                                <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, color: "var(--ac-warn)" }} data-wa-waiting>
                                    {c.wroteAgain && <span data-wa-wrote-again>Wrote again</span>}
                                    {list && <span>{waitingFor(c.waitingSince, list.loadedAt)}</span>}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="ac-card wa-pane wa-chat" data-wa-chat-pane>
                {!selected && <div className="ac-empty" style={{ margin: "auto" }}><div className="ac-empty-title">Choose a chat to read it.</div></div>}
                {selected && (
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--ac-line)", flex: "none" }} data-wa-chat-head>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                            <button type="button" className="ac-btn wa-back" onClick={close} aria-label="Back to chats" data-wa-back>← Chats</button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 16, color: "var(--ac-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {thread ? thread.conversation.name ?? local(thread.conversation.phone) : "…"}
                                </div>
                                {thread && (
                                    <div style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                        {local(thread.conversation.phone)}{thread.conversation.reason ? ` · ${thread.conversation.reason}` : ""}
                                    </div>
                                )}
                            </div>
                            {thread && <StandingBadge c={thread.conversation} />}
                        </div>
                        {thread && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                                <a className="ac-btn ac-btn-primary" href={`https://wa.me/${thread.conversation.phone}`} target="_blank" rel="noopener" data-wa-reply>
                                    Reply on WhatsApp
                                </a>
                                {thread.conversation.standing === "needs" && (
                                    <button type="button" className="ac-btn" onClick={dealtWith} disabled={busy} data-wa-dealt>
                                        {busy ? "Saving…" : "Dealt with"}
                                    </button>
                                )}
                                {thread.conversation.mode === "person" && offerAnswer && (
                                    <button type="button" className="ac-btn" style={wraps} onClick={() => handBack(true)} disabled={busy} data-wa-hand-back-answer>
                                        {busy ? "Handing back…" : `Hand back and reply ${waitingLabel}`}
                                    </button>
                                )}
                                {thread.conversation.mode === "person" && (
                                    <button type="button" className="ac-btn" onClick={() => handBack(false)} disabled={busy} data-wa-hand-back>
                                        {busy ? "Handing back…" : offerAnswer ? "Hand back only" : "Hand back to assistant"}
                                    </button>
                                )}
                                {thread.conversation.mode === "assistant" && offerAnswer && answering !== thread.conversation.id && (
                                    <button type="button" className="ac-btn" style={wraps} onClick={() => handBack(true)} disabled={busy} data-wa-answer-waiting>
                                        {busy ? "Asking the assistant…" : `Assistant: reply ${waitingLabel}`}
                                    </button>
                                )}
                            </div>
                        )}
                        {thread && answering === thread.conversation.id && waiting.length > 0 && (
                            <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 8 }} data-wa-answering>
                                The assistant is replying. Its answer shows here within a minute.
                            </div>
                        )}
                        {thread && offerAnswer && answering !== thread.conversation.id && (
                            <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 8 }}>
                                Only ask the assistant to reply if nobody has answered these from their own WhatsApp.
                            </div>
                        )}
                        {thread && !thread.conversation.windowOpen && (
                            <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 8 }}>
                                Their last message was over 24 hours ago, so the assistant can't message them first.
                            </div>
                        )}
                        {thread?.customer && <CustomerSummary c={thread.customer} />}
                    </div>
                )}
                {selected && (
                    // The bottom padding keeps the newest message clear of the floating Miss Tokyo AI button.
                    <div ref={scrollRef} className="wa-scroll" style={{ padding: "16px 16px 72px", background: "var(--ac-bg-2, transparent)" }} data-wa-thread>
                        {threadError && <div style={muted}>{threadError}</div>}
                        {!thread && !threadError && <div style={muted}>Loading…</div>}
                        {thread && thread.messages.length === 0 && <div style={muted}>No messages yet.</div>}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {rows.map(r => r.kind === "day" ? (
                                <div key={r.key} style={{ alignSelf: "center", fontSize: 11, color: "var(--ac-ink-3)", padding: "2px 10px", borderRadius: 999, background: "var(--ac-line)", margin: "6px 0" }}>
                                    {r.label}
                                </div>
                            ) : r.kind === "event" ? (
                                <div key={r.e.id} data-wa-event={r.e.kind} style={{ alignSelf: "center", textAlign: "center", fontSize: 11, color: "var(--ac-ink-3)", padding: "2px 10px", maxWidth: "90%" }}>
                                    {r.e.label} · {clock(r.e.at)}
                                </div>
                            ) : (
                                <div key={r.m.id} style={{ alignSelf: r.m.direction === "outbound" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                                    <div style={{
                                        padding: "8px 12px", borderRadius: 12, fontSize: 14, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                                        background: r.m.direction === "outbound" ? "var(--ac-ink)" : "var(--ac-surface, #fff)",
                                        color: r.m.direction === "outbound" ? "var(--ac-bg, #fff)" : "var(--ac-ink)",
                                        border: r.m.direction === "outbound" ? "none" : "1px solid var(--ac-line)",
                                    }}>
                                        {r.m.media && thread && <MediaView conversationId={thread.conversation.id} m={r.m} />}
                                        {r.m.text?.trim() ? r.m.text : r.m.media ? null : <em>[{r.m.type ?? "message"}]</em>}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 2, textAlign: r.m.direction === "outbound" ? "right" : "left" }}>
                                        {r.m.direction === "outbound" ? "Assistant · " : ""}{clock(r.m.at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const LABEL = { photo: "Photo", audio: "Voice note", video: "Video", file: "File" } as const;

/** A message's photo, voice note, video or file, loaded through the staff-only media route. */
function MediaView({ conversationId, m }: { conversationId: string; m: Message }) {
    const [failed, setFailed] = useState(false);
    const kind = mediaKind(m.type) ?? "file";
    const src = `/api/whatsapp/inbox/${conversationId}/media/${m.id}`;
    const gap = m.text?.trim() ? { marginBottom: 6 } : {};
    if (m.media === "missing" || failed) {
        return <div style={{ ...gap, fontStyle: "italic", opacity: 0.75 }} data-wa-media-missing>[{LABEL[kind]} not available]</div>;
    }
    if (kind === "photo") {
        return (
            <a href={src} target="_blank" rel="noopener" style={{ display: "block", ...gap }} data-wa-media="photo">
                {/* A signed, short-lived link behind our own route: next/image can't optimise it. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${LABEL[kind]} in the chat`} loading="lazy" onError={() => setFailed(true)}
                    style={{ display: "block", maxWidth: "100%", width: 240, maxHeight: 320, objectFit: "cover", borderRadius: 8 }} />
            </a>
        );
    }
    if (kind === "audio") return <audio controls preload="none" src={src} onError={() => setFailed(true)} style={{ display: "block", maxWidth: "100%", ...gap }} data-wa-media="audio" />;
    if (kind === "video") return <video controls preload="metadata" src={src} onError={() => setFailed(true)} style={{ display: "block", maxWidth: "100%", width: 260, borderRadius: 8, ...gap }} data-wa-media="video" />;
    return <a href={src} target="_blank" rel="noopener" style={{ display: "block", color: "inherit", textDecoration: "underline", ...gap }} data-wa-media="file">Open file</a>;
}

/** The customer's orders on this number, folded: a one-line summary that opens to the last five. */
function CustomerSummary({ c }: { c: CustomerPanel }) {
    const line = c.orders === 0
        ? "No orders on this number yet"
        : `${c.orders} order${c.orders === 1 ? "" : "s"} · ${ghs(c.spent)} spent${c.paidOrders !== c.orders ? ` (${c.paidOrders} paid)` : ""}`;
    return (
        <details style={{ marginTop: 10, fontSize: 12, color: "var(--ac-ink-3)" }} data-wa-customer>
            <summary style={{ cursor: c.orders ? "pointer" : "default" }}>
                Customer{c.name ? `: ${c.name}` : ""} · {line}
            </summary>
            {c.orders > 0 && (
                <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                    {c.email && <div>Email: {c.email}</div>}
                    {c.recent.map(o => (
                        <a key={o.id} href={`/sales/orders/${o.id}`} style={{ color: "inherit", display: "flex", justifyContent: "space-between", gap: 8 }} data-wa-customer-order>
                            <span>{o.ref ?? o.id.slice(0, 8).toUpperCase()} · {new Date(o.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}</span>
                            <span>{ghs(o.total)} · {o.payment ?? "?"}{o.fulfilment ? ` · ${o.fulfilment}` : ""}</span>
                        </a>
                    ))}
                </div>
            )}
        </details>
    );
}
