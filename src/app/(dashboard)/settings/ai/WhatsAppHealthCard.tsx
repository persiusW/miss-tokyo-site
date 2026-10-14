"use client";
// WhatsApp inbound health: when a message last arrived, how many are waiting,
// and what was given up. The provider never resends, so this is where staff
// notice a problem. Also where chats that need a person are forwarded.
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { normaliseWaNumber } from "@/lib/ai/shopAssistant/settingsRules";
import type { Health, InboundCounts } from "@/lib/whatsapp/health";

type Wallet = { state: "ok" | "not_configured" | "rejected" | "network"; balance: number | null };
type Data = InboundCounts & { health: Health; wallet?: Wallet };

const WALLET_TEXT: Record<Wallet["state"], string> = {
    ok: "", not_configured: "Not set up", rejected: "Key not accepted", network: "Couldn't check",
};
const walletText = (w?: Wallet) => !w ? "…" : w.state === "ok" ? (w.balance === null ? "Connected" : `GHS ${w.balance.toFixed(2)}`) : WALLET_TEXT[w.state];

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

export default function WhatsAppHealthCard({ settings, onSaved }: { settings: { key: string; value: unknown }[]; onSaved: () => void }) {
    const [data, setData] = useState<Data | null>(null);
    const [failed, setFailed] = useState(false);
    const saved = settings.find(s => s.key === "whatsapp_handoff_number");
    const [handoff, setHandoff] = useState(String(saved?.value ?? ""));
    const [saving, setSaving] = useState(false);

    async function saveHandoff() {
        const number = handoff.trim() === "" ? "" : normaliseWaNumber(handoff);
        if (number === null) { toast.error("Enter a Ghana WhatsApp number, or leave it blank to use the shop's WhatsApp number."); return; }
        if (number === (saved?.value ?? "")) { toast.info("Nothing to save."); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/ai/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "whatsapp_handoff_number", value: number }) });
            if (!res.ok) { const j = await res.json().catch(() => null); toast.error(j?.error ?? "We couldn't save that. Please try again."); return; }
            setHandoff(number);
            toast.success("Saved. Chats that need a person now go to that number.");
        } catch {
            toast.error("We couldn't save that. Please check your connection and try again.");
        } finally { setSaving(false); onSaved(); }
    }

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
                        {tile("Chatbots Africa wallet", walletText(data.wallet))}
                    </div>
                </>
            )}
            <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                <label style={{ flex: "1 1 240px" }}>
                    <span className="ac-label">Send chats that need a person to</span>
                    <input className="ac-input" inputMode="tel" placeholder="Blank = the shop's WhatsApp number"
                        value={handoff} onChange={e => setHandoff(e.target.value)} disabled={!saved} data-wa-handoff />
                    <span style={{ display: "block", fontSize: 11, color: "var(--ac-ink-4)", marginTop: 4 }}>
                        {saved ? "They get the customer, the reason, recent messages and a link to reply, by WhatsApp and SMS." : "Available once the WhatsApp settings update is applied."}
                    </span>
                </label>
                <button type="button" className="ac-btn ac-btn-primary" onClick={saveHandoff} disabled={saving || !saved}>
                    {saving ? "Saving…" : "Save"}
                </button>
            </div>
        </div>
    );
}
