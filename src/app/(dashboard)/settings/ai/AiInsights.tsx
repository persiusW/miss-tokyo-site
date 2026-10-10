"use client";

// Read-only cards: failed sends, errors people saw, AI use by staff member.
// Loads on its own so a failure here never hides the settings above.
import { useEffect, useState } from "react";

type Insights = {
    failed_sends: {
        total: number;
        capped?: boolean;
        by_kind: { channel: string; event: string; count: number }[];
        recent: { at: string; channel: string; event: string; to: string; reason: string }[];
    };
    errors: {
        enabled: boolean;
        total: number;
        capped?: boolean;
        by_code: { code: string; label: string; count: number }[];
        recent: { at: string; code: string; place: string | null; audience: string }[];
    };
    usage: Record<"week" | "month", { name: string; questions: number; cost_ghs: number; last_used: string }[]> & { capped?: boolean };
};

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
const channelName = (c: string) => (c === "sms" ? "SMS" : c === "email" ? "Email" : c);
const eventName = (e: string) => { const t = String(e ?? "").replace(/[_-]+/g, " ").trim(); return t ? t[0].toUpperCase() + t.slice(1) : "Message"; };

function Empty({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: 13, color: "var(--ac-ink-3)", padding: "12px 0" }}>{children}</div>;
}

export default function AiInsights() {
    const [data, setData] = useState<Insights | null>(null);
    const [failed, setFailed] = useState(false);
    const [range, setRange] = useState<"week" | "month">("week");

    useEffect(() => {
        let gone = false;
        fetch("/api/ai/insights", { cache: "no-store" })
            .then(async res => {
                const json = await res.json().catch(() => null);
                if (gone) return;
                if (!res.ok || !json?.failed_sends) { setFailed(true); return; }
                setData(json);
            })
            .catch(() => { if (!gone) setFailed(true); });
        return () => { gone = true; };
    }, []);

    if (failed) {
        return <div className="ac-card"><div className="ac-empty"><div className="ac-empty-title">We couldn't load the insight cards. Please refresh and try again.</div></div></div>;
    }
    if (!data) {
        return <div className="ac-card"><div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>Loading insights…</div></div>;
    }

    const usage = data.usage[range];

    return (
        <>
            <div className="ac-card flush" data-testid="insight-failed-sends">
                <div className="ac-card-head" style={{ padding: "16px 22px 0" }}>
                    <div className="ac-card-title">Failed sends · last 7 days</div>
                </div>
                <div style={{ padding: "8px 22px 0" }}>
                    {data.failed_sends.total === 0 ? <Empty>Nothing failed to send in the last 7 days.</Empty> : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "6px 0 12px" }}>
                            {data.failed_sends.by_kind.map(k => (
                                <span key={`${k.channel}|${k.event}`} style={{ fontSize: 12, padding: "4px 10px", border: "1px solid var(--ac-line-2)", borderRadius: 999 }}>
                                    {channelName(k.channel)} · {eventName(k.event)} — <strong>{k.count}{data.failed_sends.capped ? "+" : ""}</strong>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {data.failed_sends.recent.length > 0 && (
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead><tr><th>Time</th><th>Channel</th><th>Message</th><th>To</th><th>Why</th></tr></thead>
                            <tbody>
                                {data.failed_sends.recent.map((s, i) => (
                                    <tr key={i}>
                                        <td>{when(s.at)}</td>
                                        <td>{channelName(s.channel)}</td>
                                        <td>{eventName(s.event)}</td>
                                        <td className="ac-mono">{s.to}</td>
                                        <td>{s.reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="ac-card flush" data-testid="insight-errors">
                <div className="ac-card-head" style={{ padding: "16px 22px 0" }}>
                    <div className="ac-card-title">Errors people saw · last 7 days</div>
                </div>
                <div style={{ padding: "8px 22px 0" }}>
                    {!data.errors.enabled && data.errors.total === 0 && (
                        <Empty>Not recording. Turn on <strong>Error log</strong> in Miss Tokyo AI extras above to start.</Empty>
                    )}
                    {!data.errors.enabled && data.errors.total > 0 && (
                        <Empty>Recording is off. Showing what was recorded before.</Empty>
                    )}
                    {data.errors.enabled && data.errors.total === 0 && <Empty>No errors in the last 7 days.</Empty>}
                </div>
                {data.errors.by_code.length > 0 && (
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead><tr><th>Code</th><th>Meaning</th><th>Times</th></tr></thead>
                            <tbody>
                                {data.errors.by_code.map(e => (
                                    <tr key={e.code}><td className="ac-mono">{e.code}</td><td>{e.label}</td><td className="ac-mono">{e.count}{data.errors.capped ? "+" : ""}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {data.errors.recent.length > 0 && (
                    <div className="ac-table-wrap" style={{ marginTop: 12 }}>
                        <table className="ac-table">
                            <thead><tr><th>Time</th><th>Code</th><th>Page</th><th>Who</th></tr></thead>
                            <tbody>
                                {data.errors.recent.map((e, i) => (
                                    <tr key={i}>
                                        <td>{when(e.at)}</td>
                                        <td className="ac-mono">{e.code}</td>
                                        <td className="ac-mono">{e.place ?? "—"}</td>
                                        <td>{e.audience === "staff" ? "Staff" : "Customer"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="ac-card flush" data-testid="insight-usage">
                <div className="ac-card-head" style={{ padding: "16px 22px 0", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div className="ac-card-title">AI use by staff member</div>
                    <div role="group" aria-label="Period" style={{ display: "flex", gap: 6 }}>
                        {(["week", "month"] as const).map(r => (
                            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}
                                className={range === r ? "ac-btn ac-btn-primary" : "ac-btn"} style={{ padding: "4px 10px", fontSize: 12 }}>
                                {r === "week" ? "7 days" : "30 days"}
                            </button>
                        ))}
                    </div>
                </div>
                {usage.length === 0 ? <div style={{ padding: "8px 22px 16px" }}><Empty>No staff questions in this period.</Empty></div> : (
                    <div className="ac-table-wrap">
                        <table className="ac-table">
                            <thead><tr><th>Name</th><th>Questions</th><th>Cost</th><th>Last used</th></tr></thead>
                            <tbody>
                                {usage.map((u, i) => (
                                    <tr key={i}>
                                        <td>{u.name}</td>
                                        <td className="ac-mono">{u.questions}{data.usage.capped ? "+" : ""}</td>
                                        <td className="ac-mono">GHS {u.cost_ghs.toFixed(2)}</td>
                                        <td>{u.last_used ? when(u.last_used) : "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
