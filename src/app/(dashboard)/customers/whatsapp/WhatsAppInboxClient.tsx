"use client";

// WhatsApp inbox: the chat list and one chat's messages. Staff reply from the
// main WhatsApp phone (the number here runs through the API, so it has no
// phone app), then hand the chat back to the assistant.
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { InboxConversation } from "@/lib/whatsapp/inbox";

type Message = { id: string; direction: "inbound" | "outbound"; text: string | null; type: string | null; at: string };
type Thread = { conversation: InboxConversation; messages: Message[] };

const CALM = "Something happened. Please refresh and try again.";
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const local = (intl: string) => (/^233\d{9}$/.test(intl) ? `0${intl.slice(3)}` : `+${intl}`);

async function getJson(url: string, init?: RequestInit): Promise<{ ok: boolean; data: any }> {
    try {
        const res = await fetch(url, { cache: "no-store", ...init });
        return { ok: res.ok, data: await res.json().catch(() => null) };
    } catch {
        return { ok: false, data: null };
    }
}

function ModeBadge({ c }: { c: InboxConversation }) {
    const person = c.mode === "person";
    return (
        <span style={{
            fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap",
            background: person ? "color-mix(in oklab, var(--ac-warn) 15%, transparent)" : "var(--ac-line)",
            color: person ? "var(--ac-warn)" : "var(--ac-ink-3)",
        }}>
            {person ? "Needs a person" : "Assistant"}
        </span>
    );
}

export default function WhatsAppInboxClient() {
    const router = useRouter();
    const params = useSearchParams();
    const selected = params.get("c");
    const [list, setList] = useState<InboxConversation[] | null>(null);
    const [listError, setListError] = useState<string | null>(null);
    const [thread, setThread] = useState<Thread | null>(null);
    const [threadError, setThreadError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const loadList = useCallback(async () => {
        const r = await getJson("/api/whatsapp/inbox");
        if (r.ok && Array.isArray(r.data?.conversations)) { setList(r.data.conversations); setListError(null); }
        else setListError(r.data?.error ?? CALM);
    }, []);

    const loadThread = useCallback(async (id: string) => {
        const r = await getJson(`/api/whatsapp/inbox/${id}`);
        if (r.ok && r.data?.conversation) { setThread(r.data); setThreadError(null); }
        else { setThread(null); setThreadError(r.data?.error ?? CALM); }
    }, []);

    useEffect(() => {
        loadList();
        const t = setInterval(loadList, 20_000);
        return () => clearInterval(t);
    }, [loadList]);

    useEffect(() => {
        if (!selected) { setThread(null); return; }
        loadThread(selected);
        const t = setInterval(() => loadThread(selected), 20_000);
        return () => clearInterval(t);
    }, [selected, loadThread]);

    const open = (id: string) => router.replace(`/customers/whatsapp?c=${id}`, { scroll: false });

    const handBack = async () => {
        if (!thread) return;
        setBusy(true);
        const r = await getJson(`/api/whatsapp/inbox/${thread.conversation.id}`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "hand_back" }),
        });
        setBusy(false);
        if (!r.ok) { setThreadError(r.data?.error ?? CALM); return; }
        await Promise.all([loadThread(thread.conversation.id), loadList()]);
    };

    return (
        <div className="wa-inbox" style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr)" }} data-wa-inbox>
            <style>{`@media (min-width: 900px) { .wa-inbox { grid-template-columns: 340px minmax(0, 1fr) !important; } }`}</style>

            <div className="ac-card" style={{ padding: 0, overflow: "hidden" }}>
                {listError && <div style={{ padding: 16, fontSize: 13, color: "var(--ac-ink-3)" }}>{listError}</div>}
                {!listError && !list && <div style={{ padding: 16, fontSize: 13, color: "var(--ac-ink-3)" }}>Loading…</div>}
                {list && list.length === 0 && (
                    <div className="ac-empty"><div className="ac-empty-title">No WhatsApp chats yet.</div></div>
                )}
                {list?.map(c => (
                    <button key={c.id} type="button" onClick={() => open(c.id)} data-wa-chat
                        style={{
                            display: "block", width: "100%", textAlign: "left", padding: "12px 16px", border: 0, borderBottom: "1px solid var(--ac-line)",
                            background: c.id === selected ? "var(--ac-line)" : "transparent", cursor: "pointer",
                        }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 14, color: "var(--ac-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {c.name ?? local(c.phone)}
                            </span>
                            <ModeBadge c={c} />
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.preview ? `${c.preview.direction === "outbound" ? "You: " : ""}${c.preview.text}` : "No messages yet"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 2 }}>{when(c.lastMessageAt)}</div>
                    </button>
                ))}
            </div>

            <div className="ac-card" style={{ minHeight: 320 }}>
                {!selected && <div className="ac-empty"><div className="ac-empty-title">Choose a chat to read it.</div></div>}
                {selected && threadError && <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>{threadError}</div>}
                {selected && !thread && !threadError && <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>Loading…</div>}
                {thread && (
                    <>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div>
                                <div style={{ fontSize: 16, color: "var(--ac-ink)" }}>{thread.conversation.name ?? local(thread.conversation.phone)}</div>
                                <div style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                    {local(thread.conversation.phone)}{thread.conversation.reason ? ` · ${thread.conversation.reason}` : ""}
                                </div>
                            </div>
                            <ModeBadge c={thread.conversation} />
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                            <a className="ac-btn ac-btn-primary" href={`https://wa.me/${thread.conversation.phone}`} target="_blank" rel="noopener" data-wa-reply>
                                Reply on WhatsApp
                            </a>
                            {thread.conversation.mode === "person" && (
                                <button type="button" className="ac-btn" onClick={handBack} disabled={busy} data-wa-hand-back>
                                    {busy ? "Handing back…" : "Hand back to assistant"}
                                </button>
                            )}
                        </div>
                        {!thread.conversation.windowOpen && (
                            <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginBottom: 12 }}>
                                Their last message was over 24 hours ago, so the assistant can't message them first.
                            </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} data-wa-thread>
                            {thread.messages.length === 0 && <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>No messages yet.</div>}
                            {thread.messages.map(m => {
                                const out = m.direction === "outbound";
                                return (
                                    <div key={m.id} style={{ alignSelf: out ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                                        <div style={{
                                            padding: "8px 12px", borderRadius: 12, fontSize: 14, whiteSpace: "pre-wrap", overflowWrap: "anywhere",
                                            background: out ? "var(--ac-ink)" : "var(--ac-surface, #fff)", color: out ? "var(--ac-bg, #fff)" : "var(--ac-ink)",
                                            border: out ? "none" : "1px solid var(--ac-line)",
                                        }}>
                                            {m.text?.trim() ? m.text : <em>[{m.type ?? "message"}]</em>}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 2, textAlign: out ? "right" : "left" }}>
                                            {out ? "Assistant · " : ""}{when(m.at)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
