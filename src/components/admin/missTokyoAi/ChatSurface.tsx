"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TRANSCRIPT_SOFT_LIMIT, useMissTokyoAi, type Bubble } from "@/lib/ai/missTokyoAi/client/store";
import type { ButtonEffect, Effect } from "@/lib/ai/missTokyoAi/effects";
import { Spark } from "./icons";

export type ChatUser = { firstName: string | null; role: string };

const SAMPLES: { text: string; kind: "live" | "how"; icon: string }[] = [
    { text: "Which products are running out of stock?", kind: "live", icon: "▦" },
    { text: "What sold best this week?", kind: "live", icon: "★" },
    { text: "How do I send a pay link from the till?", kind: "how", icon: "▭" },
    { text: "How much did we take today?", kind: "live", icon: "₵" },
    { text: "How do I refund an order?", kind: "how", icon: "?" },
];

const URL_RE = /(https?:\/\/[^\s]+)/g;

function Linkified({ text }: { text: string }) {
    // split() with a capturing group puts every URL at an odd index.
    return (
        <>
            {text.split(URL_RE).map((part, i) => {
                if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
                const href = part.replace(/[.,!?;:)]+$/, "");
                return (
                    <Fragment key={i}>
                        <a href={href} target="_blank" rel="noopener noreferrer">{href}</a>
                        {part.slice(href.length)}
                    </Fragment>
                );
            })}
        </>
    );
}

/** Plain text; a run of 2+ "1. …" lines becomes a numbered list. Never HTML from the model. */
function ReplyText({ text }: { text: string }) {
    const lines = text.split("\n");
    const out: ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
        if (/^\s*\d+[.)]\s+/.test(lines[i])) {
            const items: string[] = [];
            while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
                i++;
            }
            if (items.length >= 2) {
                out.push(<ol key={`ol${i}`} className="mtai-steps">{items.map((t, k) => <li key={k}><Linkified text={t} /></li>)}</ol>);
            } else {
                out.push(<Fragment key={`l${i}`}><Linkified text={`1. ${items[0]}`} />{"\n"}</Fragment>);
            }
            continue;
        }
        out.push(<Fragment key={`t${i}`}><Linkified text={lines[i]} />{i < lines.length - 1 ? "\n" : ""}</Fragment>);
        i++;
    }
    return <>{out}</>;
}

const isButton = (e: Effect): e is ButtonEffect => e.kind === "navigate" || e.kind === "show_me";
const isQuery = (e: Effect): e is Extract<Effect, { kind: "query" }> =>
    e.kind === "query" && typeof e.sql === "string";

function greeting(): string {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function ChatSurface({
    user,
    variant,
    onClose,
    onEffect,
    focusKey,
    headProps,
}: {
    user: ChatUser;
    variant: "panel" | "page";
    onClose?: () => void;
    /** Called after an effect button is used, e.g. to close the floating panel. */
    onEffect?: () => void;
    /** Changes when the panel opens, to move focus into the message box. */
    focusKey?: unknown;
    headProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
    const { bubbles, loading, availability, transcript, send, newChat, setSpotlight } = useMissTokyoAi();
    const router = useRouter();
    const [input, setInput] = useState("");
    const [online, setOnline] = useState(true);
    const bodyRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const update = () => setOnline(navigator.onLine);
        update();
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
    }, []);

    useEffect(() => {
        bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
    }, [bubbles, loading]);

    useEffect(() => {
        if (focusKey) setTimeout(() => inputRef.current?.focus(), 60);
    }, [focusKey]);

    // Grow the box with its text, up to the CSS max-height.
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
    }, [input]);

    const unavailable = availability === "off" || availability === "not_set_up";
    const tooLong = transcript.length >= TRANSCRIPT_SOFT_LIMIT;
    const canSend = online && !unavailable && !loading && !tooLong;

    const submit = (text: string) => {
        const t = text.trim();
        if (!t || !canSend) return;
        setInput("");
        void send(t);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit(input);
        }
    };

    const runEffect = (effect: ButtonEffect) => {
        if (effect.kind === "show_me") {
            setSpotlight({ anchor: effect.anchor, label: effect.label, startedAt: Date.now() });
        }
        onEffect?.();
        router.push(effect.href);
    };

    const status = !online ? "Offline" : unavailable ? "Not available" : loading ? "Thinking…" : "Here to help";
    const dot = !online ? "var(--ac-ink-4)" : unavailable ? "var(--ac-warn)" : "var(--ac-accent)";
    const isFullAccess = user.role === "admin" || user.role === "owner";

    return (
        <>
            <div className="mtai-head" {...headProps}>
                <div className="mtai-avatar" style={{ ["--mtai-dot" as string]: dot }}><Spark size={18} /></div>
                <div>
                    <div className="mtai-title" id={variant === "panel" ? "mtai-title" : undefined}>Miss Tokyo AI</div>
                    <div className="mtai-status" aria-live="polite">{status}</div>
                </div>
                <div className="mtai-head-actions">
                    <button type="button" className="mtai-icon-btn" onClick={newChat} disabled={loading || bubbles.length === 0} aria-label="New chat" title="New chat">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    </button>
                    {onClose && (
                        <button type="button" className="mtai-icon-btn" onClick={onClose} aria-label="Close Miss Tokyo AI" title="Close">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>

            {!online && (
                <div className="mtai-banner" role="status"><b>You're offline</b>Your chat is saved. You can ask again once you're back online.</div>
            )}
            {online && tooLong && (
                <div className="mtai-banner" role="status"><b>This chat is getting long</b>Start a new chat (✎ above) to keep answers quick.</div>
            )}

            <div className="mtai-body" ref={bodyRef} aria-live="polite">
                {unavailable ? (
                    <div className="mtai-locked">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                        <strong>{availability === "off" ? "Miss Tokyo AI is switched off" : "Miss Tokyo AI isn't set up yet"}</strong>
                        <span>{isFullAccess ? "You can turn it on in AI Settings." : "An admin or owner can turn it on."}</span>
                        {isFullAccess && availability === "off" && (
                            <button type="button" className="mtai-action go" onClick={() => { onEffect?.(); router.push("/settings/ai"); }}>Open AI Settings</button>
                        )}
                    </div>
                ) : bubbles.length === 0 ? (
                    <>
                        <div className="mtai-greet">
                            {greeting()}{user.firstName ? <>, <em>{user.firstName}</em></> : null}
                        </div>
                        <p className="mtai-intro">Ask about stock, sales and orders, or how to do something in the dashboard. Miss Tokyo AI can also take an order and send the payment link.</p>
                        <div className="mtai-try">Try asking</div>
                        {SAMPLES.map(s => (
                            <button key={s.text} type="button" className="mtai-chip" disabled={!canSend} onClick={() => submit(s.text)}>
                                <i className={s.kind} aria-hidden="true">{s.icon}</i>{s.text}
                            </button>
                        ))}
                    </>
                ) : (
                    bubbles.map((b: Bubble) => (
                        <div key={b.id} className={`mtai-msg ${b.role}`}>
                            <div className={`mtai-bubble${b.error ? " error" : ""}`}>
                                {b.role === "assistant" ? <ReplyText text={b.text} /> : b.text}
                            </div>
                            {b.role === "assistant" && b.effects && b.effects.some(isButton) && (
                                <div className="mtai-actions">
                                    {b.effects.filter(isButton).map((e, k) => (
                                        <button key={k} type="button" className={`mtai-action ${e.kind === "show_me" ? "show" : "go"}`} onClick={() => runEffect(e)}>
                                            {e.kind === "navigate" ? `${e.label} →` : "Show me"}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {b.role === "assistant" && b.effects?.filter(isQuery).map((q, k) => (
                                <details key={`q${k}`} className="mtai-query">
                                    <summary>View query · {q.rows} {q.rows === 1 ? "row" : "rows"}</summary>
                                    <pre>{q.sql}</pre>
                                </details>
                            ))}
                        </div>
                    ))
                )}
                {loading && (
                    <div className="mtai-dots" role="status">
                        <span /><span /><span />
                        <span className="mtai-sr">Miss Tokyo AI is thinking</span>
                    </div>
                )}
            </div>

            <div className="mtai-composer">
                <div className="mtai-composer-box">
                    <textarea
                        ref={inputRef}
                        rows={1}
                        value={input}
                        onChange={e => setInput(e.target.value.slice(0, 1000))}
                        onKeyDown={onKeyDown}
                        placeholder={!online ? "Reconnect to ask a question" : unavailable ? "Miss Tokyo AI is off" : "Ask Miss Tokyo AI…"}
                        disabled={!online || unavailable || tooLong}
                        maxLength={1000}
                        aria-label="Message Miss Tokyo AI"
                    />
                    <button
                        type="button"
                        className={`mtai-send${input.trim() && canSend ? " ready" : ""}`}
                        onClick={() => submit(input)}
                        disabled={!input.trim() || !canSend}
                        aria-label="Send"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                    </button>
                </div>
                {variant === "page" && <div className="mtai-hint">Enter to send · Shift+Enter for a new line</div>}
            </div>
        </>
    );
}
