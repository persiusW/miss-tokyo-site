"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";

type Turn = { created_at: string; channel: string; model: string | null; input_tokens: number | null; output_tokens: number | null; cost_ghs: number };
type Data = {
    settings: { key: string; value: unknown }[];
    today: { spend_ghs: number; cap_ghs: number };
    recent_turns: Turn[];
};
type Form = {
    whatsapp_enabled: boolean;
    dashboard_agent_enabled: boolean;
    daily_spend_cap_ghs: string;
    admin_cost_markup_pct: string;
};

const ghs = (n: number) => `GHS ${n.toFixed(2)}`;

function formFrom(data: Data): Form {
    const v = (k: string) => data.settings.find(s => s.key === k)?.value;
    return {
        whatsapp_enabled: v("whatsapp_enabled") === true,
        dashboard_agent_enabled: v("dashboard_agent_enabled") === true,
        daily_spend_cap_ghs: String(v("daily_spend_cap_ghs") ?? ""),
        admin_cost_markup_pct: String(v("admin_cost_markup_pct") ?? "0"),
    };
}

function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--ac-line)" }}>
            <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>{label}</div>
                <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 2 }}>{description}</div>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={() => onChange(!checked)}
                style={{
                    position: "relative", width: 40, height: 22, borderRadius: 999, flexShrink: 0, cursor: "pointer",
                    border: "1px solid var(--ac-line-2)", background: checked ? "var(--ac-accent)" : "var(--ac-bg-2)", transition: "background .15s",
                }}
            >
                <span style={{
                    position: "absolute", top: 2, left: checked ? 20 : 2, width: 16, height: 16, borderRadius: 999,
                    background: "var(--ac-panel)", boxShadow: "0 1px 2px rgba(0,0,0,.2)", transition: "left .15s",
                }} />
            </button>
        </div>
    );
}

export default function AiSettingsClient() {
    const [data, setData] = useState<Data | null>(null);
    const [form, setForm] = useState<Form | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch("/api/ai/settings", { cache: "no-store" });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.settings) {
                setLoadError(json?.error ?? "We couldn't load AI settings. Please refresh and try again.");
                return;
            }
            setLoadError(null);
            setData(json);
            setForm(formFrom(json));
        } catch {
            setLoadError("We couldn't load AI settings. Please refresh and try again.");
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        if (!data || !form) return;
        const original = formFrom(data);
        const cap = Number(form.daily_spend_cap_ghs);
        const markup = Number(form.admin_cost_markup_pct);
        if (!Number.isFinite(cap) || cap < 0 || cap > 10_000) { toast.error("Daily spend cap must be between 0 and 10,000 GHS."); return; }
        if (!Number.isFinite(markup) || markup < 0 || markup > 500) { toast.error("Markup must be between 0 and 500%."); return; }

        const changes: { key: string; value: unknown }[] = [];
        if (form.whatsapp_enabled !== original.whatsapp_enabled) changes.push({ key: "whatsapp_enabled", value: form.whatsapp_enabled });
        if (form.dashboard_agent_enabled !== original.dashboard_agent_enabled) changes.push({ key: "dashboard_agent_enabled", value: form.dashboard_agent_enabled });
        if (cap !== Number(original.daily_spend_cap_ghs)) changes.push({ key: "daily_spend_cap_ghs", value: cap });
        if (markup !== Number(original.admin_cost_markup_pct)) changes.push({ key: "admin_cost_markup_pct", value: markup });
        if (changes.length === 0) { toast.info("Nothing to save."); return; }

        setSaving(true);
        try {
            for (const change of changes) {
                const res = await fetch("/api/ai/settings", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(change),
                });
                if (!res.ok) {
                    const json = await res.json().catch(() => null);
                    toast.error(json?.error ?? "We couldn't save that. Please try again.");
                    return;
                }
            }
            toast.success("AI settings saved.");
        } catch {
            toast.error("We couldn't save that. Please check your connection and try again.");
        } finally {
            setSaving(false);
            load();
        }
    };

    if (loadError) {
        return <div className="ac-card"><div className="ac-empty"><div className="ac-empty-title">{loadError}</div></div></div>;
    }
    if (!data || !form) {
        return <div className="ac-card"><div style={{ fontSize: 13, color: "var(--ac-ink-3)" }}>Loading…</div></div>;
    }

    const pct = data.today.cap_ghs > 0 ? Math.min(100, (data.today.spend_ghs / data.today.cap_ghs) * 100) : 100;
    const barColour = pct >= 100 ? "var(--ac-danger)" : pct >= 80 ? "var(--ac-warn)" : "var(--ac-accent)";

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div className="ac-card">
                <div className="ac-card-head"><div className="ac-card-title">Today's spend</div></div>
                <div style={{ fontSize: 22, color: "var(--ac-ink)", marginTop: 8 }}>
                    {ghs(data.today.spend_ghs)} <span style={{ fontSize: 14, color: "var(--ac-ink-3)" }}>/ {ghs(data.today.cap_ghs)}</span>
                </div>
                <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                    aria-label="Share of today's AI spend limit used"
                    style={{ height: 8, borderRadius: 999, background: "var(--ac-bg-2)", marginTop: 12, overflow: "hidden" }}
                >
                    <div style={{ width: `${pct}%`, height: "100%", background: barColour, transition: "width .3s" }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--ac-ink-3)", marginTop: 8 }}>
                    Shared by the WhatsApp agent and the Store Assistant. Resets at midnight (Ghana time).
                </div>
            </div>

            <div className="ac-card">
                <div className="ac-card-head"><div className="ac-card-title">Assistants</div></div>
                <Switch
                    checked={form.whatsapp_enabled}
                    onChange={v => setForm({ ...form, whatsapp_enabled: v })}
                    label="WhatsApp Agent"
                    description="Answers customers on WhatsApp once the number is connected."
                />
                <Switch
                    checked={form.dashboard_agent_enabled}
                    onChange={v => setForm({ ...form, dashboard_agent_enabled: v })}
                    label="Dashboard Agent"
                    description="The Store Assistant for staff in this dashboard."
                />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 16 }}>
                    <label>
                        <span className="ac-label">Daily spend cap (GHS)</span>
                        <input
                            className="ac-input" type="number" min={0} max={10000} step="1"
                            value={form.daily_spend_cap_ghs}
                            onChange={e => setForm({ ...form, daily_spend_cap_ghs: e.target.value })}
                        />
                    </label>
                    <label>
                        <span className="ac-label">Dev cost markup (%)</span>
                        <input
                            className="ac-input" type="number" min={0} max={500} step="1"
                            value={form.admin_cost_markup_pct}
                            onChange={e => setForm({ ...form, admin_cost_markup_pct: e.target.value })}
                        />
                        <span style={{ display: "block", fontSize: 11, color: "var(--ac-ink-4)", marginTop: 4 }}>
                            Not visible to customers or staff
                        </span>
                    </label>
                </div>
                <div style={{ marginTop: 18 }}>
                    <button type="button" className="ac-btn ac-btn-primary" onClick={save} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>

            <div className="ac-card flush">
                <div className="ac-card-head" style={{ padding: "16px 22px 0" }}><div className="ac-card-title">Last 20 AI turns</div></div>
                <div className="ac-table-wrap">
                    <table className="ac-table">
                        <thead>
                            <tr><th>Time</th><th>Channel</th><th>Model</th><th>Tokens in / out</th><th>Cost</th></tr>
                        </thead>
                        <tbody>
                            {data.recent_turns.length === 0 ? (
                                <tr><td colSpan={5} className="ac-table-empty">No AI usage yet.</td></tr>
                            ) : data.recent_turns.map((t, i) => (
                                <tr key={i}>
                                    <td>{new Date(t.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                                    <td style={{ textTransform: "capitalize" }}>{t.channel}</td>
                                    <td className="ac-mono">{t.model ?? "—"}</td>
                                    <td className="ac-mono">{(t.input_tokens ?? 0).toLocaleString()} / {(t.output_tokens ?? 0).toLocaleString()}</td>
                                    <td className="ac-mono">{ghs(t.cost_ghs)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
