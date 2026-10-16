"use client";
// What WhatsApp brings in: chats, orders, paid sales, conversion, what the
// assistant cost, and what the reminder and back-in-stock alerts did.
import { useEffect, useState } from "react";
import type { Results } from "@/lib/whatsapp/results";

type Data = { week: Results; month: Results; truncated: boolean };

const ghs = (n: number) => `GHS ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WhatsAppResultsCard() {
    const [data, setData] = useState<Data | null>(null);
    const [failed, setFailed] = useState(false);
    const [period, setPeriod] = useState<"week" | "month">("month");

    useEffect(() => {
        fetch("/api/ai/whatsapp-results", { cache: "no-store" })
            .then(r => (r.ok ? r.json() : Promise.reject()))
            .then(setData)
            .catch(() => setFailed(true));
    }, []);

    const r = data?.[period];
    const tile = (label: string, value: string, hint?: string) => (
        <div>
            <div style={{ fontSize: 11, color: "var(--ac-ink-3)" }}>{label}</div>
            <div style={{ fontSize: 18, color: "var(--ac-ink)" }}>{value}</div>
            {hint && <div style={{ fontSize: 11, color: "var(--ac-ink-4)" }}>{hint}</div>}
        </div>
    );

    return (
        <div className="ac-card" data-testid="wa-results">
            <div className="ac-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div className="ac-card-title">WhatsApp results</div>
                <div style={{ display: "flex", gap: 6 }}>
                    {(["week", "month"] as const).map(p => (
                        <button key={p} type="button" className={`ac-btn ${period === p ? "ac-btn-primary" : ""}`} onClick={() => setPeriod(p)} aria-pressed={period === p}>
                            {p === "week" ? "Last 7 days" : "Last 30 days"}
                        </button>
                    ))}
                </div>
            </div>
            {failed && <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>We couldn't load this. Please refresh and try again.</div>}
            {!failed && !r && <div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>Loading…</div>}
            {r && (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
                        {tile("Chats answered", String(r.chats), `${r.replies} replies`)}
                        {tile("Orders placed", String(r.orders))}
                        {tile("Paid orders", String(r.paid_orders))}
                        {tile("Paid sales", ghs(r.sales_ghs))}
                        {tile("Chats that paid", r.conversion_pct === null ? "—" : `${r.conversion_pct}%`)}
                        {tile("Assistant cost", ghs(r.ai_cost_ghs))}
                        {tile("Paid after a reminder", String(r.recovered_orders), `${ghs(r.recovered_ghs)} · ${r.reminders_sent} sent`)}
                        {tile("Back-in-stock alerts", String(r.restock_alerts_sent))}
                    </div>
                    {data?.truncated && <div style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 10 }}>Very busy period: some older rows weren't counted.</div>}
                </>
            )}
        </div>
    );
}
