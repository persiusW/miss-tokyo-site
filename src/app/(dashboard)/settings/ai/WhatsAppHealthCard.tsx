"use client";
// WhatsApp inbound health: when a message last arrived, how many are waiting,
// and what was given up. The provider never resends, so this is where staff
// notice a problem.
import { useCallback, useEffect, useState } from "react";
import type { Health, InboundCounts } from "@/lib/whatsapp/health";

type Data = InboundCounts & { health: Health };

const LEVEL_COLOUR: Record<Health["level"], string> = { ok: "var(--ac-ink-3)", warning: "var(--ac-warn)", problem: "var(--ac-danger)" };

function since(iso: string | null): string {
    if (!iso) return "Never";
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 48) return `${hours} h ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function WhatsAppHealthCard() {
    const [data, setData] = useState<Data | null>(null);
    const [failed, setFailed] = useState(false);

    const load = useCallback(() => {
        fetch("/api/ai/whatsapp-health", { cache: "no-store" })
            .then(r => (r.ok ? r.json() : Promise.reject()))
            .then(d => { setData(d); setFailed(false); })
            .catch(() => setFailed(true));
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, 60_000);
        return () => clearInterval(t);
    }, [load]);

    const tile = (label: string, value: string) => (
        <div><div style={{ fontSize: 11, color: "var(--ac-ink-3)" }}>{label}</div><div style={{ fontSize: 18, color: "var(--ac-ink)" }}>{value}</div></div>
    );

    return (
        <div className="ac-card" data-whatsapp-health>
            <div className="ac-card-head"><div className="ac-card-title">WhatsApp messages</div></div>
            {failed && !data && <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>We couldn't load this. Please refresh and try again.</div>}
            {!failed && !data && <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>Loading…</div>}
            {data && (
                <>
                    <div style={{ fontSize: 13, color: LEVEL_COLOUR[data.health.level], fontWeight: data.health.level === "ok" ? 400 : 600 }}>
                        {data.health.summary}
                    </div>
                    {data.health.notes.map(n => <div key={n} style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 4 }}>{n}</div>)}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginTop: 14 }}>
                        {tile("Last message received", since(data.lastReceivedAt))}
                        {tile("Waiting", String(data.waiting))}
                        {tile("Being retried", String(data.retrying))}
                        {tile("Given up (7 days)", String(data.gaveUp7d))}
                    </div>
                </>
            )}
        </div>
    );
}
