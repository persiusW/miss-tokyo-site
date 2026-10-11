"use client";
// Ask Miss Tokyo on the shop: switch, limits, WhatsApp number, usage, recent chats.
import { Fragment, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { normaliseWaNumber } from "@/lib/ai/shopAssistant/settingsRules";

type Usage = { chats: number; messages: number; cost_ghs: number; orders: number; paid_orders: number };
type ChatRow = { id: string; first_question: string; turns: number; order_refs: string[]; last_message_at: string };
type Line = { who: "customer" | "assistant"; text: string };

export default function ShopAssistantCard({ settings, onSaved }: { settings: { key: string; value: unknown }[]; onSaved: () => void }) {
    const v = (k: string) => settings.find(s => s.key === k)?.value;
    const [enabled, setEnabled] = useState(v("shop_assistant_enabled") === true);
    const [perDay, setPerDay] = useState(String(v("shop_assistant_daily_messages_per_visitor") ?? "20"));
    const [share, setShare] = useState(String(v("shop_assistant_cap_share_pct") ?? "40"));
    const [wa, setWa] = useState(String(v("shop_whatsapp_number") ?? ""));
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<{ usage: { today: Usage; week: Usage }; chats: ChatRow[]; truncated: boolean } | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [lines, setLines] = useState<Line[] | null>(null);

    useEffect(() => {
        fetch("/api/ai/shop-chats", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(setData).catch(() => setData(null));
    }, []);

    async function openChat(id: string) {
        if (openId === id) { setOpenId(null); return; }
        setOpenId(id); setLines(null);
        const res = await fetch(`/api/ai/shop-chats/${id}`, { cache: "no-store" }).catch(() => null);
        const json = res ? await res.json().catch(() => null) : null;
        setLines(Array.isArray(json?.lines) ? json.lines : []);
    }

    async function save() {
        const day = Number(perDay), pct = Number(share);
        const number = wa.trim() === "" ? "" : normaliseWaNumber(wa);
        if (!Number.isInteger(day) || day < 1 || day > 200) { toast.error("Messages per visitor must be between 1 and 200."); return; }
        if (!Number.isInteger(pct) || pct < 0 || pct > 100) { toast.error("The share of the daily cap must be between 0 and 100%."); return; }
        if (number === null) { toast.error("Enter a Ghana WhatsApp number, or leave it blank to use the store phone."); return; }
        const changes = [
            { key: "shop_assistant_enabled", value: enabled, was: v("shop_assistant_enabled") === true },
            { key: "shop_assistant_daily_messages_per_visitor", value: day, was: v("shop_assistant_daily_messages_per_visitor") },
            { key: "shop_assistant_cap_share_pct", value: pct, was: v("shop_assistant_cap_share_pct") },
            { key: "shop_whatsapp_number", value: number, was: v("shop_whatsapp_number") ?? "" },
        ].filter(c => c.value !== c.was);
        if (changes.length === 0) { toast.info("Nothing to save."); return; }
        setSaving(true);
        try {
            for (const c of changes) {
                const res = await fetch("/api/ai/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: c.key, value: c.value }) });
                if (!res.ok) { const j = await res.json().catch(() => null); toast.error(j?.error ?? "We couldn't save that. Please try again."); return; }
            }
            toast.success("Shop assistant settings saved. The shop updates within a minute.");
        } catch {
            toast.error("We couldn't save that. Please check your connection and try again.");
        } finally { setSaving(false); onSaved(); }
    }

    const tile = (label: string, value: string) => (
        <div><div style={{ fontSize: 11, color: "var(--ac-ink-3)" }}>{label}</div><div style={{ fontSize: 18, color: "var(--ac-ink)" }}>{value}</div></div>
    );

    return (
        <div className="ac-card">
            <div className="ac-card-head"><div className="ac-card-title">Ask Miss Tokyo (shop)</div></div>
            <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 4 }}>The chat customers see on the shop. It can find products, explain delivery and returns, track an order and take an order with a Pay now link. It never offers cash.</div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--ac-line)" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>Show Ask Miss Tokyo on the shop</div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label="Show Ask Miss Tokyo on the shop"
                    onClick={() => setEnabled(!enabled)}
                    style={{
                        position: "relative", width: 40, height: 22, borderRadius: 999, flexShrink: 0, cursor: "pointer",
                        border: "1px solid var(--ac-line-2)", background: enabled ? "var(--ac-accent)" : "var(--ac-bg-2)", transition: "background .15s",
                    }}
                >
                    <span style={{
                        position: "absolute", top: 2, left: enabled ? 20 : 2, width: 16, height: 16, borderRadius: 999,
                        background: "var(--ac-panel)", boxShadow: "0 1px 2px rgba(0,0,0,.2)", transition: "left .15s",
                    }} />
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 16 }}>
                <label><span className="ac-label">Messages per visitor per day</span>
                    <input className="ac-input" type="number" min={1} max={200} step="1" value={perDay} onChange={e => setPerDay(e.target.value)} /></label>
                <label><span className="ac-label">Share of the daily AI cap (%)</span>
                    <input className="ac-input" type="number" min={0} max={100} step="1" value={share} onChange={e => setShare(e.target.value)} /></label>
                <label><span className="ac-label">WhatsApp number for "Talk to us"</span>
                    <input className="ac-input" type="tel" placeholder="Blank = store phone" value={wa} onChange={e => setWa(e.target.value)} /></label>
            </div>
            <div style={{ marginTop: 18 }}>
                <button type="button" className="ac-btn ac-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>

            {data && (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16, marginTop: 24 }}>
                        {tile("Chats today", String(data.usage.today.chats))}
                        {tile("Messages today", String(data.usage.today.messages))}
                        {tile("Cost today", `GHS ${data.usage.today.cost_ghs.toFixed(2)}`)}
                        {tile("Chats (7 days)", String(data.usage.week.chats))}
                        {tile("Messages (7 days)", String(data.usage.week.messages))}
                        {tile("Cost (7 days)", `GHS ${data.usage.week.cost_ghs.toFixed(2)}`)}
                        {tile("Orders from chat (7 days)", `${data.usage.week.orders} · ${data.usage.week.paid_orders} paid`)}
                    </div>
                    {data.truncated && <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 6 }}>Counts include the first 20,000 rows only.</div>}

                    <div className="ac-table-wrap" style={{ marginTop: 20 }}>
                        <table className="ac-table">
                            <thead><tr><th>Last message</th><th>First question</th><th>Messages</th><th>Orders</th><th /></tr></thead>
                            <tbody>
                                {data.chats.length === 0 ? <tr><td colSpan={5} className="ac-table-empty">No shop chats yet.</td></tr> : data.chats.map(c => (
                                    <Fragment key={c.id}>
                                        <tr>
                                            <td>{new Date(c.last_message_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                                            <td>{c.first_question || "—"}</td>
                                            <td className="ac-mono">{c.turns}</td>
                                            <td className="ac-mono">{c.order_refs.join(", ") || "—"}</td>
                                            <td><button type="button" className="ac-btn" onClick={() => openChat(c.id)}>{openId === c.id ? "Close" : "Open"}</button></td>
                                        </tr>
                                        {openId === c.id && (
                                            <tr><td colSpan={5}>
                                                {lines === null ? "Loading…" : lines.length === 0 ? "No messages." : lines.map((l, i) => (
                                                    <div key={i} style={{ fontSize: 12, margin: "6px 0", color: l.who === "customer" ? "var(--ac-ink)" : "var(--ac-ink-3)" }}>
                                                        <strong>{l.who === "customer" ? "Customer" : "Ask Miss Tokyo"}:</strong> {l.text}
                                                    </div>
                                                ))}
                                            </td></tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
