"use client";

// One WhatsApp chat in the admin v2 Inbox: every message in and out with its
// photo, voice note, video or file, markers for what happened (handed over,
// handed back, dealt with, alerted again, back after 24 hours: by whom), the
// customer's orders, and what staff can do: reply from the shop's line or tell
// the assistant what to say, correct one of its replies, hand the chat back
// (and have the assistant answer what waited), or mark it done. Everything
// goes through the existing /api/whatsapp/inbox routes.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    Badge, Banner, Btn, BtnLink, ErrorState, IconBtn, Menu, Seg, SkeletonRows, Switch, toast, when, ghs, plural,
    type MenuItem,
} from "@/components/admin/ui";
import { canAnswerWaiting, mediaKind, waitingFor, waitingMessages, type InboxConversation } from "@/lib/whatsapp/inbox";
import type { CustomerPanel as Panelled } from "@/lib/whatsapp/customerPanel";
import { localPhone, windowLeft } from "@/lib/admin/v2/inbox";
import { useAdminV2 } from "@/components/admin/shell/AdminV2Context";
import { call, send } from "./api";
import { CorrectPanel, CustomerPanel } from "./ChatPanels";
import { NotePanel } from "./NotePanel";

export type ChatMessage = {
    id: string; direction: "inbound" | "outbound"; text: string | null; type: string | null; at: string;
    media?: "ready" | "fetch" | "missing" | null; byStaff?: string | null; correctable?: boolean;
};
type ChatEvent = { id: string; label: string; kind: string; at: string };
type Can = { teach: boolean; reply: boolean };
type Thread = { conversation: InboxConversation; messages: ChatMessage[]; events?: ChatEvent[]; customer?: Panelled | null; can?: Can; loadedAt: number };

const TZ = "Africa/Accra";
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
function dayLabel(iso: string, now = new Date()): string {
    const key = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
    const d = new Date(iso);
    if (key(d) === key(now)) return "Today";
    if (key(d) === key(new Date(now.getTime() - 86_400_000))) return "Yesterday";
    const sameYear = d.toLocaleDateString("en-GB", { year: "numeric", timeZone: TZ }) === now.toLocaleDateString("en-GB", { year: "numeric", timeZone: TZ });
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone: TZ });
}
const NEAR_BOTTOM = 120;
const AUTO_RESUME_MS = 24 * 3600_000;

const STANDING: Record<InboxConversation["standing"], [string, "warn" | undefined]> = {
    needs: ["Needs a person", "warn"], dealt: ["Done", undefined], assistant: ["With the assistant", undefined], notices: ["Order updates only", undefined],
};

export function ChatView({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
    const { refreshCounts } = useAdminV2();
    const [thread, setThread] = useState<Thread | null>(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [answering, setAnswering] = useState(false);
    const [correcting, setCorrecting] = useState<ChatMessage | null>(null);
    const [noting, setNoting] = useState(false);
    const [customerOpen, setCustomerOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const shown = useRef<string | null>(null);
    const lastCount = useRef(0);

    const load = useCallback(async (quiet = false) => {
        const r = await call(`/api/whatsapp/inbox/${id}`);
        if (r.ok && r.data?.conversation) { setThread({ ...r.data, loadedAt: Date.now() }); setFailed(false); }
        else if (!quiet) { setThread(null); setFailed(true); }
    }, [id]);

    useEffect(() => {
        setThread(null); setFailed(false); setAnswering(false);
        void load();
        const t = setInterval(() => { if (document.visibilityState === "visible") void load(true); }, 20_000);
        return () => clearInterval(t);
    }, [load]);

    // A newly opened chat starts at its latest message; later refreshes follow
    // new messages only when the reader was already at the bottom.
    useLayoutEffect(() => {
        const box = scrollRef.current;
        if (!box || !thread) return;
        const opened = shown.current !== thread.conversation.id;
        const grew = thread.messages.length > lastCount.current;
        const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < NEAR_BOTTOM;
        if (opened || (grew && atBottom)) box.scrollTop = box.scrollHeight;
        shown.current = thread.conversation.id;
        lastCount.current = thread.messages.length;
    }, [thread]);

    const refresh = useCallback(() => { void load(true); onChanged(); refreshCounts(); }, [load, onChanged, refreshCounts]);

    const act = async (body: Record<string, unknown>, done: string) => {
        setBusy(true);
        const r = await call(`/api/whatsapp/inbox/${id}`, send("POST", body));
        setBusy(false);
        if (!r.ok) { toast.fromResponse(r.data, { audience: "staff" }); return false; }
        toast.success(done);
        refresh();
        return true;
    };

    const rows = useMemo(() => {
        type Row = { kind: "day"; key: string; label: string } | { kind: "msg"; m: ChatMessage } | { kind: "event"; e: ChatEvent };
        const items = [
            ...(thread?.messages ?? []).map(m => ({ kind: "msg" as const, m, at: m.at, key: m.id })),
            ...(thread?.events ?? []).map(e => ({ kind: "event" as const, e, at: e.at, key: e.id })),
        ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
        const out: Row[] = [];
        let day = "";
        for (const it of items) {
            const label = dayLabel(it.at);
            if (label !== day) { out.push({ kind: "day", key: `day-${it.key}`, label }); day = label; }
            out.push(it.kind === "msg" ? { kind: "msg", m: it.m } : { kind: "event", e: it.e });
        }
        return out;
    }, [thread]);

    if (failed) return <div className="card"><div className="card-h"><span className="pane-back"><IconBtn label="Back to list" icon="back" onClick={onBack} /></span><h2>WhatsApp chat</h2></div><ErrorState what="this chat" onRetry={() => load()} /></div>;
    if (!thread) return <div className="card"><div className="card-h"><span className="pane-back"><IconBtn label="Back to list" icon="back" onClick={onBack} /></span><h2>Loading…</h2></div><SkeletonRows n={5} cols={2} /></div>;

    const c = thread.conversation;
    const can = thread.can ?? { teach: false, reply: false };
    const waiting = waitingMessages(thread.messages, thread.loadedAt);
    const offer = canAnswerWaiting(c.mode, waiting, thread.loadedAt);
    const left = windowLeft(c.lastInboundAt, thread.loadedAt);
    const name = c.name ?? localPhone(c.phone);
    const [standing, tone] = STANDING[c.standing];
    const correctable = thread.messages.filter(m => m.correctable);
    const askedBefore = (m: ChatMessage) => {
        const msgs = thread.messages;
        for (let i = msgs.indexOf(m) - 1; i >= 0; i--) if (msgs[i].direction === "inbound") return msgs[i].text;
        return null;
    };
    const handBack = (answer: boolean) => act({ action: "hand_back", answer }, answer
        ? "Handed back. The assistant is replying to what waited; its answer shows here within a minute."
        : "Handed back. The assistant answers from now on.").then(ok => { if (ok && answer) setAnswering(true); });
    const waitingLabel = `(${waiting.length} waiting)`;
    const teachFromChat = () => {
        const last = correctable[correctable.length - 1];
        if (last) setCorrecting(last); else setNoting(true);
    };

    const menu: MenuItem[] = [
        ...(c.mode === "person" ? [{ l: "Hand back to the assistant", icon: "spark" as const, onClick: () => void handBack(false), disabled: busy }] : []),
        ...(offer && c.mode === "person" ? [{ l: `Hand back and reply ${waitingLabel}`, icon: "spark" as const, onClick: () => void handBack(true), disabled: busy }] : []),
        ...(offer && c.mode === "assistant" && !answering ? [{ l: `Assistant: reply ${waitingLabel}`, icon: "spark" as const, onClick: () => void handBack(true), disabled: busy }] : []),
        ...(can.teach ? [{ l: "Teach the assistant from this chat", icon: "edit" as const, onClick: teachFromChat }] : []),
        ...(c.standing === "needs" ? [{ l: "Mark as done", icon: "check" as const, onClick: () => void act({ action: "dealt_with" }, "Marked as done"), disabled: busy }] : []),
        "-",
        { l: "Open in WhatsApp", icon: "wa", onClick: () => window.open(`https://wa.me/${c.phone}`, "_blank", "noopener") },
    ];

    const cust = thread.customer;
    const custLine = cust && (cust.orders > 0 || cust.basket.length > 0)
        ? [cust.orders ? `${plural(cust.orders, "order")} · ${ghs(cust.spent)} spent${cust.paidOrders !== cust.orders ? ` (${cust.paidOrders} paid)` : ""}` : "No orders on this number yet",
            cust.basket.length ? `${cust.basket.length} in the assistant's basket` : null].filter(Boolean).join(" · ")
        : cust ? "No orders on this number yet" : null;

    return (
        <section className="card inbox-conv" aria-label={`Chat with ${name}`}>
            <div className="card-h inbox-conv-h">
                <span className="pane-back"><IconBtn label="Back to list" icon="back" onClick={onBack} /></span>
                <div className="grow" style={{ minWidth: 0 }}>
                    <h2 className="inbox-ellipsis">{name}</h2>
                    <div className="sm muted">
                        WhatsApp · {localPhone(c.phone)}{c.reason ? ` · Handed over: ${c.reason.toLowerCase()}` : ""}
                    </div>
                </div>
                <Badge tone={tone} plain={!tone}>{standing}</Badge>
                {cust?.email && <BtnLink sm kind="ghost" href={`/customers/${encodeURIComponent(cust.email)}`}>Customer</BtnLink>}
                <Menu label="Chat actions" items={menu} />
            </div>

            <div className="inbox-notes">
                {custLine && (
                    <button type="button" className="link-btn sm" onClick={() => setCustomerOpen(true)}>
                        {cust?.name ? `${cust.name} · ` : ""}{custLine}
                    </button>
                )}
                {c.standing === "needs" && (
                    <div className="xs inbox-warn">{c.wroteAgain ? "Wrote again after it was marked done · " : ""}{waitingFor(c.waitingSince, thread.loadedAt)}</div>
                )}
                {c.mode === "person" && c.handedOffAt && (
                    <div className="xs muted">Goes back to the assistant by itself {when(new Date(Date.parse(c.handedOffAt) + AUTO_RESUME_MS)).replace(/^\w/, x => x.toLowerCase())} if nobody hands it back first.</div>
                )}
                {offer && !answering && (
                    <Banner tone="info" title={`${plural(waiting.length, "message")} waiting for a reply`}
                        action={<Btn sm onClick={() => void handBack(true)} disabled={busy}>{c.mode === "person" ? `Hand back and reply ${waitingLabel}` : `Assistant: reply ${waitingLabel}`}</Btn>}>
                        Only ask the assistant to reply if nobody has answered these from their own WhatsApp.
                    </Banner>
                )}
                {answering && waiting.length > 0 && <div className="xs muted" role="status">The assistant is replying. Its answer shows here within a minute.</div>}
            </div>

            <div ref={scrollRef} className="inbox-thread" aria-label="Messages">
                {thread.messages.length === 0 && <p className="sm muted">No messages yet.</p>}
                {rows.map(r => r.kind === "day" ? (
                    <div key={r.key} className="inbox-day">{r.label}</div>
                ) : r.kind === "event" ? (
                    <div key={r.e.id} className="inbox-event">{r.e.label} · {clock(r.e.at)}</div>
                ) : (
                    <div key={r.m.id} className={`msg${r.m.direction === "outbound" ? " out" : ""}${r.m.direction === "outbound" && !r.m.byStaff ? " bot" : ""}`}>
                        {r.m.media && <MediaView conversationId={c.id} m={r.m} />}
                        {r.m.text?.trim() ? <div className="inbox-text">{r.m.text}</div> : r.m.media ? null : <em>[{r.m.type ?? "message"}]</em>}
                        <div className="msg-meta">
                            {r.m.direction === "inbound" ? (c.name?.split(" ")[0] ?? "Customer") : r.m.byStaff ?? "Assistant"} · {clock(r.m.at)}
                            {r.m.correctable && can.teach && (
                                <button type="button" className="link-btn inbox-correct" onClick={() => setCorrecting(r.m)}>Correct</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Composer key={c.id} conversationId={c.id} can={can} windowLeft={left} onDone={refresh} />

            {correcting && (
                <CorrectPanel conversationId={c.id} messageId={correcting.id} said={correcting.text ?? ""} customerWrote={askedBefore(correcting)}
                    name={name} onClose={() => setCorrecting(null)} onSaved={refresh} />
            )}
            {noting && <NotePanel lesson={null} fromChat={name} onClose={() => setNoting(false)} onSaved={() => setNoting(false)} />}
            {customerOpen && cust && <CustomerPanel c={cust} phone={localPhone(c.phone)} onClose={() => setCustomerOpen(false)} />}
        </section>
    );
}

/** Under the chat: Reply myself (from the shop's line) or Tell the assistant (a note for this chat). */
function Composer(p: { conversationId: string; can: Can; windowLeft: string | null; onDone: () => void }) {
    const modes = [...(p.can.reply ? ["reply" as const] : []), ...(p.can.teach ? ["tell" as const] : [])];
    const [mode, setMode] = useState<"reply" | "tell">(modes[0] ?? "reply");
    const [text, setText] = useState("");
    const [remember, setRemember] = useState(true);
    const [busy, setBusy] = useState(false);

    const go = async () => {
        const t = text.trim();
        if (!t || busy) return;
        setBusy(true);
        const r = await call(`/api/whatsapp/inbox/${p.conversationId}/${mode}`, send("POST", mode === "reply" ? { text: t } : { text: t, remember }));
        setBusy(false);
        if (!r.ok) { toast.fromResponse(r.data, { audience: "staff" }); return; }
        setText("");
        toast.success(mode === "reply" ? "Sent on WhatsApp. The assistant stays quiet in this chat until you hand it back." : "The assistant is replying with your note. Its answer shows here within a minute.");
        p.onDone();
    };

    if (modes.length === 0) {
        return (
            <div className="card-body inbox-compose">
                <p className="help">Reply to this customer from the shop&apos;s WhatsApp phone. {p.windowLeft ? `WhatsApp lets us reply for ${p.windowLeft}.` : ""}</p>
            </div>
        );
    }
    return (
        <div className="card-body inbox-compose stack-sm">
            {modes.length > 1 && (
                <Seg label="Who writes" value={mode} onChange={setMode} options={[{ v: "reply", l: "Reply myself" }, { v: "tell", l: "Tell the assistant" }]} />
            )}
            {!p.windowLeft ? (
                <Banner tone="neutral" title="WhatsApp won't deliver a message from here">
                    Their last message was over 24 hours ago. Reply from the shop&apos;s WhatsApp phone.
                </Banner>
            ) : (
                <>
                    <label className="sr" htmlFor={`wa-compose-${p.conversationId}`}>{mode === "reply" ? "Reply on WhatsApp" : "Tell the assistant"}</label>
                    <textarea id={`wa-compose-${p.conversationId}`} className="textarea" maxLength={1000} value={text} onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void go(); }}
                        placeholder={mode === "reply" ? "Reply on WhatsApp" : "Tell the assistant what to say or know, e.g. “She can collect at Osu tomorrow.”"} />
                    {mode === "tell" && (
                        <div className="hrow between">
                            <span className="sm">Remember this for next time (saved as a lesson)</span>
                            <Switch label="Remember this for next time" checked={remember} onChange={setRemember} />
                        </div>
                    )}
                    <div className="hrow between wrap">
                        <p className="help" style={{ margin: 0 }}>WhatsApp only lets you reply within 24 hours of their last message. This chat is open for {p.windowLeft}.</p>
                        <Btn kind="primary" onClick={() => void go()} disabled={busy || !text.trim()}>{busy ? "Sending…" : "Send"}</Btn>
                    </div>
                </>
            )}
        </div>
    );
}

const LABEL = { photo: "Photo", audio: "Voice note", video: "Video", file: "File" } as const;

/** A message's photo, voice note, video or file, loaded through the staff-only media route. */
function MediaView({ conversationId, m }: { conversationId: string; m: ChatMessage }) {
    const [failed, setFailed] = useState(false);
    const kind = mediaKind(m.type) ?? "file";
    const src = `/api/whatsapp/inbox/${conversationId}/media/${m.id}`;
    if (m.media === "missing" || failed) return <div className="inbox-media-missing">[{LABEL[kind]} not available]</div>;
    if (kind === "photo") {
        return (
            <a href={src} target="_blank" rel="noopener" className="inbox-media">
                {/* A signed, short-lived link behind our own route: next/image can't optimise it. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${LABEL[kind]} in the chat`} loading="lazy" onError={() => setFailed(true)} />
            </a>
        );
    }
    if (kind === "audio") return <audio className="inbox-media" controls preload="none" src={src} onError={() => setFailed(true)} />;
    if (kind === "video") return <video className="inbox-media" controls preload="metadata" src={src} onError={() => setFailed(true)} />;
    return <a href={src} target="_blank" rel="noopener" className="inbox-media inbox-file">Open file</a>;
}
