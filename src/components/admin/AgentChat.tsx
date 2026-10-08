"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";

// Staff chat with the Store Assistant. The transcript is opaque Anthropic
// message history: it is sent back exactly as the server returned it (the
// server rejects edited history), and only the text parts are shown.

type Bubble = { role: "user" | "assistant"; text: string; error?: boolean };
type Saved = { transcript: unknown[]; bubbles: Bubble[] };

const STORAGE_KEY = "mt-store-assistant";
const URL_RE = /(https?:\/\/[^\s]+)/g;

function load(): Saved {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed?.transcript) && Array.isArray(parsed?.bubbles)) return parsed;
        }
    } catch { /* storage unavailable — start fresh */ }
    return { transcript: [], bubbles: [] };
}

function save(state: Saved) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* non-essential */ }
}

/** Plain text with links made clickable. Never renders HTML from the model. */
function Linkified({ text }: { text: string }) {
    // split() with a capturing group puts every URL at an odd index.
    return (
        <>
            {text.split(URL_RE).map((part, i) => {
                if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
                const href = part.replace(/[.,!?;:)]+$/, "");
                const trailing = part.slice(href.length);
                return (
                    <Fragment key={i}>
                        <a href={href} target="_blank" rel="noopener noreferrer"
                            style={{ color: "inherit", textDecoration: "underline", wordBreak: "break-all" }}>
                            {href}
                        </a>
                        {trailing}
                    </Fragment>
                );
            })}
        </>
    );
}

export default function AgentChat() {
    const [transcript, setTranscript] = useState<unknown[]>([]);
    const [bubbles, setBubbles] = useState<Bubble[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const s = load();
        setTranscript(s.transcript);
        setBubbles(s.bubbles);
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [bubbles, loading]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;
        const nextTranscript = [...transcript, { role: "user", content: text }];
        const withUser = [...bubbles, { role: "user" as const, text }];
        setBubbles(withUser);
        setInput("");
        setLoading(true);
        try {
            const res = await fetch("/api/ai/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: nextTranscript }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && Array.isArray(data?.messages)) {
                const next = { transcript: data.messages, bubbles: [...withUser, { role: "assistant" as const, text: String(data.reply ?? "") }] };
                setTranscript(next.transcript);
                setBubbles(next.bubbles);
                save(next);
            } else {
                // The message was not taken: keep the history as it was and
                // give the text back so it can be sent again.
                setBubbles([...withUser, { role: "assistant", text: data?.error ?? "Something happened. Please try again shortly.", error: true }]);
                setInput(text);
            }
        } catch {
            setBubbles([...withUser, { role: "assistant", text: "We couldn't reach the assistant. Check your connection and try again.", error: true }]);
            setInput(text);
        } finally {
            setLoading(false);
        }
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
        }
    };

    const newChat = () => {
        setTranscript([]);
        setBubbles([]);
        setInput("");
        save({ transcript: [], bubbles: [] });
    };

    return (
        <div className="ac-card flush" style={{ display: "flex", flexDirection: "column", height: 600 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--ac-line)" }}>
                <span style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>Live stock and orders. Payment links hold stock for 15 minutes.</span>
                <button type="button" className="ac-btn ac-btn-ghost ac-btn-sm" onClick={newChat} disabled={loading || bubbles.length === 0}>
                    New chat
                </button>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }} aria-live="polite">
                {bubbles.length === 0 && !loading && (
                    <div className="ac-empty" style={{ margin: "auto", textAlign: "center" }}>
                        <div className="ac-empty-title">Ask about a product, stock or an order</div>
                        <div className="ac-empty-sub">For example: “Do we have the Lisa Heels in 38?” or “Take an order for…”</div>
                    </div>
                )}
                {bubbles.map((b, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: b.role === "user" ? "flex-end" : "flex-start" }}>
                        <div
                            style={{
                                maxWidth: "78%",
                                padding: "9px 13px",
                                borderRadius: 12,
                                fontSize: 13,
                                lineHeight: 1.5,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                ...(b.role === "user"
                                    ? { background: "var(--ac-accent)", color: "var(--ac-acc-ink)", borderBottomRightRadius: 4 }
                                    : {
                                        background: "var(--ac-bg-2)",
                                        color: b.error ? "var(--ac-danger)" : "var(--ac-ink)",
                                        border: "1px solid var(--ac-line)",
                                        borderBottomLeftRadius: 4,
                                    }),
                            }}
                        >
                            <Linkified text={b.text} />
                        </div>
                    </div>
                ))}
                {loading && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                        <div style={{ padding: "9px 13px", borderRadius: 12, fontSize: 13, color: "var(--ac-ink-3)", background: "var(--ac-bg-2)", border: "1px solid var(--ac-line)" }}>
                            Thinking…
                        </div>
                    </div>
                )}
            </div>

            <div style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--ac-line)", alignItems: "flex-end" }}>
                <textarea
                    className="ac-input"
                    rows={2}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Type a message. Enter to send, Shift+Enter for a new line."
                    maxLength={4000}
                    style={{ resize: "none", flex: 1 }}
                    disabled={loading}
                    aria-label="Message the Store Assistant"
                />
                <button type="button" className="ac-btn ac-btn-primary" onClick={send} disabled={loading || !input.trim()}>
                    Send
                </button>
            </div>
        </div>
    );
}
