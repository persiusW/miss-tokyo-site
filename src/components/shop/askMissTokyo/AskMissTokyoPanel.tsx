"use client";
// The chat panel: a 380×560 card on desktop, a full-screen sheet on phones.
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCart } from "@/store/useCart";
import { LINES } from "@/lib/ai/shopAssistant/lines";
import type { ShopButton } from "@/lib/ai/shopAssistant/types";
import { bubbleText, useAskStore, type Bubble } from "./chatStore";

const STARTERS = ["Find a dress in my size", "Delivery fees", "Track my order"];
const id = () => Math.random().toString(36).slice(2);

export default function AskMissTokyoPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { bubbles, push, reset, sending, setSending } = useAskStore();
    const addItem = useCart(s => s.addItem);
    const [text, setText] = useState("");
    const [whatsappHref, setWhatsappHref] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        fetch("/api/shop-assistant").then(r => r.json()).then(j => setWhatsappHref(j?.whatsappHref ?? null)).catch(() => {});
    }, []);
    useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
    useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [bubbles.length, sending]);
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    async function send(message: string) {
        const t = message.trim();
        if (!t || sending) return;
        push({ id: id(), who: "customer", text: t });
        setText("");
        setSending(true);
        try {
            const res = await fetch("/api/shop-assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) });
            const json = await res.json().catch(() => null);
            push({ id: id(), who: "assistant", text: bubbleText(json?.reply), buttons: Array.isArray(json?.buttons) ? json.buttons : [] });
        } catch {
            push({ id: id(), who: "assistant", text: LINES.generic, retryText: t });
        } finally {
            setSending(false);
        }
    }

    async function newChat() {
        await fetch("/api/shop-assistant", { method: "DELETE" }).catch(() => {});
        reset();
    }

    function onButton(b: ShopButton) {
        if (b.kind === "add_to_cart") {
            addItem(b.item, true);
            onClose();
            return;
        }
        if (b.kind === "pay_now") { window.location.href = b.href; return; }
        if (b.kind === "talk_to_us") { window.open(b.href, "_blank", "noopener"); return; }
        window.location.href = b.href;
    }

    if (!open) return null;
    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-label="Ask Miss Tokyo"
            data-ask-mt="panel"
            className="fixed z-[150] inset-0 md:inset-auto md:bottom-6 md:right-6 md:w-[380px] md:h-[560px] bg-[#f5f0e8] text-black flex flex-col md:rounded-2xl md:shadow-2xl border border-black/10"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
                <p className="font-serif text-sm uppercase tracking-[0.25em]">Ask Miss Tokyo</p>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={newChat} className="text-[10px] uppercase tracking-[0.2em] underline-offset-4 hover:underline">New chat</button>
                    <button type="button" onClick={onClose} aria-label="Close chat"><X size={18} /></button>
                </div>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                <Assistant text={LINES.greeting} />
                {bubbles.length === 0 && (
                    <div className="flex flex-wrap gap-2">
                        {STARTERS.map(s => (
                            <button key={s} type="button" onClick={() => send(s)} className="text-[10px] uppercase tracking-[0.15em] border border-black/30 rounded-full px-3 py-2 hover:bg-black hover:text-[#f5f0e8]">{s}</button>
                        ))}
                    </div>
                )}
                {bubbles.map((b: Bubble) => b.who === "customer"
                    ? <div key={b.id} className="ml-auto max-w-[85%] bg-black text-[#f5f0e8] rounded-2xl rounded-br-sm px-4 py-2 text-sm whitespace-pre-wrap">{b.text}</div>
                    : (
                        <div key={b.id} className="space-y-2">
                            <Assistant text={b.text} />
                            {!!b.buttons?.length && (
                                <div className="flex flex-wrap gap-2">
                                    {b.buttons.map((btn, i) => (
                                        <button key={i} type="button" onClick={() => onButton(btn)}
                                            className={`text-[10px] uppercase tracking-[0.15em] rounded-full px-3 py-2 ${btn.kind === "pay_now" ? "bg-black text-[#f5f0e8]" : "border border-black/30 hover:bg-black hover:text-[#f5f0e8]"}`}>
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {b.retryText && <button type="button" onClick={() => send(b.retryText!)} className="text-[10px] uppercase tracking-[0.15em] underline">Retry</button>}
                        </div>
                    ))}
                {sending && <div className="text-xs text-neutral-500" aria-hidden="true">Ask Miss Tokyo is typing…</div>}
            </div>

            <div aria-live="polite" className="sr-only">{bubbles.filter(b => b.who === "assistant").slice(-1)[0]?.text ?? ""}</div>

            <form className="border-t border-black/10 px-4 py-3" onSubmit={e => { e.preventDefault(); send(text); }}>
                <div className="flex items-end gap-2">
                    <label htmlFor="ask-mt-input" className="sr-only">Your message</label>
                    <textarea
                        id="ask-mt-input" ref={inputRef} rows={1} maxLength={1000} value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
                        placeholder="Ask about sizes, delivery or your order"
                        className="flex-1 resize-none bg-white border border-black/15 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-black"
                    />
                    <button type="submit" disabled={sending || !text.trim()} className="h-10 px-4 rounded-xl bg-black text-[#f5f0e8] text-[10px] uppercase tracking-[0.2em] disabled:opacity-40">Send</button>
                </div>
                <p className="mt-2 text-[10px] text-neutral-500">
                    AI assistant · can make mistakes · {whatsappHref
                        ? <a href={whatsappHref} target="_blank" rel="noopener" className="underline">Talk to us on WhatsApp</a>
                        : "Talk to us on WhatsApp"}
                </p>
            </form>
        </div>
    );
}

function Assistant({ text }: { text: string }) {
    return <div className="max-w-[85%] bg-white border border-black/10 rounded-2xl rounded-bl-sm px-4 py-2 text-sm whitespace-pre-wrap">{text}</div>;
}
