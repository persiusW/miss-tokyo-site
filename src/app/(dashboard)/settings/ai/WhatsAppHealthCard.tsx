"use client";
// WhatsApp inbound health: when a message last arrived, how many are waiting,
// and what was given up. The provider never resends, so this is where staff
// notice a problem. Also where chats that need a person are forwarded.
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { normaliseWaNumber } from "@/lib/ai/shopAssistant/settingsRules";
import { STATUS_TEMPLATE_EVENTS, STATUS_TEMPLATE_FIELDS, templateIdValue, type StatusTemplateEvent } from "@/lib/ai/templateSettings";
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
    const handoffTemplateRow = settings.find(s => s.key === "whatsapp_handoff_template_id");
    const [handoffTemplate, setHandoffTemplate] = useState(String(handoffTemplateRow?.value ?? ""));
    const updatesRow = settings.find(s => s.key === "whatsapp_status_notifications");
    const templatesRow = settings.find(s => s.key === "whatsapp_status_template_ids");
    const savedIds = (templatesRow?.value && typeof templatesRow.value === "object" ? templatesRow.value : {}) as Record<string, unknown>;
    const [updatesOn, setUpdatesOn] = useState(updatesRow?.value === true);
    const [templateIds, setTemplateIds] = useState<Record<StatusTemplateEvent, string>>(
        () => Object.fromEntries(STATUS_TEMPLATE_EVENTS.map(e => [e, String(savedIds[e] ?? "")])) as Record<StatusTemplateEvent, string>);
    const [savingUpdates, setSavingUpdates] = useState(false);

    async function patch(key: string, value: unknown): Promise<boolean> {
        const res = await fetch("/api/ai/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
        if (!res.ok) { const j = await res.json().catch(() => null); toast.error(j?.error ?? "We couldn't save that. Please try again."); return false; }
        return true;
    }

    async function saveUpdates() {
        const ids = Object.fromEntries(STATUS_TEMPLATE_EVENTS.map(e => [e, templateIds[e].trim()])) as Record<StatusTemplateEvent, string>;
        if (!Object.values(ids).every(templateIdValue)) { toast.error("Each template id is a number from Chatbots Africa's Message Templates."); return; }
        const changes: [string, unknown][] = [];
        if (updatesRow && updatesOn !== (updatesRow.value === true)) changes.push(["whatsapp_status_notifications", updatesOn]);
        if (templatesRow && STATUS_TEMPLATE_EVENTS.some(e => ids[e] !== String(savedIds[e] ?? ""))) changes.push(["whatsapp_status_template_ids", ids]);
        if (changes.length === 0) { toast.info("Nothing to save."); return; }
        setSavingUpdates(true);
        try {
            for (const [k, v] of changes) if (!(await patch(k, v))) return;
            toast.success(updatesOn ? "Saved. Customers now get order updates on WhatsApp." : "Saved. Order updates on WhatsApp are off.");
        } catch {
            toast.error("We couldn't save that. Please check your connection and try again.");
        } finally { setSavingUpdates(false); onSaved(); }
    }

    async function saveHandoff() {
        const number = handoff.trim() === "" ? "" : normaliseWaNumber(handoff);
        if (number === null) { toast.error("Enter a Ghana WhatsApp number, or leave it blank to use the shop's WhatsApp number."); return; }
        const tpl = handoffTemplate.trim();
        if (!templateIdValue(tpl)) { toast.error("The template id is a number from Chatbots Africa's Message Templates."); return; }
        const changes: [string, unknown][] = [];
        if (number !== (saved?.value ?? "")) changes.push(["whatsapp_handoff_number", number]);
        if (handoffTemplateRow && tpl !== String(handoffTemplateRow.value ?? "")) changes.push(["whatsapp_handoff_template_id", tpl]);
        if (changes.length === 0) { toast.info("Nothing to save."); return; }
        setSaving(true);
        try {
            for (const [k, v] of changes) if (!(await patch(k, v))) return;
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
                <label style={{ flex: "1 1 240px" }}>
                    <span className="ac-label">Approved template id (team_chat_alert)</span>
                    <input className="ac-input" inputMode="numeric" placeholder="From Chatbots Africa, Message Templates"
                        value={handoffTemplate} onChange={e => setHandoffTemplate(e.target.value)} disabled={!handoffTemplateRow} data-wa-handoff-template />
                    <span style={{ display: "block", fontSize: 11, color: "var(--ac-ink-4)", marginTop: 4 }}>
                        {handoffTemplateRow ? "WhatsApp only delivers the alert's free text if that number messaged the shop in the last 24 hours. With this set, the template goes instead; the SMS has the details." : "Available once the WhatsApp settings update is applied."}
                    </span>
                </label>
                <button type="button" className="ac-btn ac-btn-primary" onClick={saveHandoff} disabled={saving || !saved}>
                    {saving ? "Saving…" : "Save"}
                </button>
            </div>
            <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--ac-line)" }} data-wa-updates>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: updatesRow ? "pointer" : "default" }}>
                    <input type="checkbox" checked={updatesOn} onChange={e => setUpdatesOn(e.target.checked)} disabled={!updatesRow} style={{ marginTop: 3 }} />
                    <span>
                        <span style={{ display: "block", fontSize: 14, color: "var(--ac-ink)" }}>Order updates on WhatsApp</span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--ac-ink-3)" }}>
                            Paid, packed, on its way, ready for pickup, delivered and cancelled, sent with the SMS. Customers who reply STOP get none.
                        </span>
                    </span>
                </label>
                <div style={{ marginTop: 12 }}>
                    <span className="ac-label">Approved template ids, one per status</span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 6 }} data-wa-templates>
                        {STATUS_TEMPLATE_EVENTS.map(e => (
                            <label key={e}>
                                <span style={{ display: "block", fontSize: 12, color: "var(--ac-ink-2)" }}>{STATUS_TEMPLATE_FIELDS[e].label}</span>
                                <input className="ac-input" inputMode="numeric" placeholder={STATUS_TEMPLATE_FIELDS[e].name}
                                    value={templateIds[e]} onChange={ev => setTemplateIds({ ...templateIds, [e]: ev.target.value })} disabled={!templatesRow} />
                            </label>
                        ))}
                    </div>
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, color: "var(--ac-ink-4)", flex: "1 1 240px" }}>
                            {templatesRow ? "Needed after 24 hours without a message from the customer. A status left blank goes by SMS only then." : "Available once the WhatsApp settings update is applied."}
                        </span>
                        <button type="button" className="ac-btn ac-btn-primary" onClick={saveUpdates} disabled={savingUpdates || !updatesRow}>
                            {savingUpdates ? "Saving…" : "Save"}
                        </button>
                    </div>
                </div>
            </div>
            <SettingSwitch settings={settings} onSaved={onSaved} settingKey="whatsapp_choices_enabled" testId="wa-choices"
                label="Tappable answers"
                help="The assistant asks with buttons or a list (size, colour, which piece, delivery or pickup, yes or no), so customers tap instead of typing."
                savedOn="Saved. The assistant can now ask with buttons and lists." savedOff="Saved. The assistant asks in plain text." />
            <SettingSwitch settings={settings} onSaved={onSaved} settingKey="whatsapp_unpaid_nudge_enabled" testId="wa-unpaid-nudge"
                label="Unpaid order reminder"
                help="One WhatsApp message 30 to 60 minutes after an order placed in a WhatsApp chat goes unpaid, offering a new Pay now link. Not sent to customers who replied STOP or who are talking to a person."
                savedOn="Saved. Unpaid WhatsApp orders now get one reminder." savedOff="Saved. No reminders for unpaid orders." />
            <SettingSwitch settings={settings} onSaved={onSaved} settingKey="whatsapp_restock_alerts_enabled" testId="wa-restock"
                label="Back-in-stock alerts"
                help="When a piece is sold out, the assistant offers to message the customer when it's back, and sends that message once it is in stock (checked hourly)."
                savedOn="Saved. Customers can now ask to be told when a piece is back." savedOff="Saved. No back-in-stock alerts."
                template={{ key: "whatsapp_restock_template_id", label: "Approved template id (back_in_stock)", help: "Needed for alerts more than 24 hours after the customer's last message. Blank: those wait until they message again." }} />
            <SettingSwitch settings={settings} onSaved={onSaved} settingKey="whatsapp_returns_enabled" testId="wa-returns"
                label="Returns and exchanges"
                help="The assistant explains the returns policy, confirms the order, asks what's wrong (and for a photo if it's faulty), then passes the chat to your team with a summary to arrange the exchange or store credit."
                savedOn="Saved. The assistant now takes return requests." savedOff="Saved. Return questions get the policy and a person." />
        </div>
    );
}

/** One on/off AI setting with its own Save, shown only usable once its row exists. */
function SettingSwitch(p: {
    settings: { key: string; value: unknown }[]; onSaved: () => void; settingKey: string; testId: string;
    label: string; help: string; savedOn: string; savedOff: string;
    /** An approved template id saved with the switch. */
    template?: { key: string; label: string; help: string };
}) {
    const row = p.settings.find(s => s.key === p.settingKey);
    const [on, setOn] = useState(row?.value === true);
    const [saving, setSaving] = useState(false);
    const templateRow = p.template ? p.settings.find(s => s.key === p.template!.key) : undefined;
    const [templateId, setTemplateId] = useState(String(templateRow?.value ?? ""));

    async function save() {
        const id = templateId.trim();
        if (id && !(/^\d{1,16}$/.test(id) && Number.isSafeInteger(Number(id)))) { toast.error("The template id is a number from Chatbots Africa's Message Templates."); return; }
        const changes: [string, unknown][] = [];
        if (row && on !== (row.value === true)) changes.push([p.settingKey, on]);
        if (p.template && templateRow && id !== String(templateRow.value ?? "")) changes.push([p.template.key, id]);
        if (changes.length === 0) { toast.info("Nothing to save."); return; }
        setSaving(true);
        try {
            for (const [key, value] of changes) {
                const res = await fetch("/api/ai/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value }) });
                if (!res.ok) { const j = await res.json().catch(() => null); toast.error(j?.error ?? "We couldn't save that. Please try again."); return; }
            }
            toast.success(on ? p.savedOn : p.savedOff);
        } catch {
            toast.error("We couldn't save that. Please check your connection and try again.");
        } finally { setSaving(false); p.onSaved(); }
    }

    return (
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--ac-line)", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }} data-testid={p.testId}>
            <label style={{ flex: "1 1 240px", display: "flex", gap: 10, alignItems: "flex-start", cursor: row ? "pointer" : "default" }}>
                <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} disabled={!row} style={{ marginTop: 3 }} />
                <span>
                    <span style={{ display: "block", fontSize: 14, color: "var(--ac-ink)" }}>{p.label}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--ac-ink-3)" }}>
                        {row ? p.help : "Available once the WhatsApp settings update is applied."}
                    </span>
                </span>
            </label>
            {p.template && (
                <label style={{ flex: "1 1 240px" }}>
                    <span className="ac-label">{p.template.label}</span>
                    <input className="ac-input" inputMode="numeric" placeholder="From Chatbots Africa, Message Templates"
                        value={templateId} onChange={e => setTemplateId(e.target.value)} disabled={!templateRow} />
                    <span style={{ display: "block", fontSize: 11, color: "var(--ac-ink-4)", marginTop: 4 }}>{p.template.help}</span>
                </label>
            )}
            <button type="button" className="ac-btn ac-btn-primary" onClick={save} disabled={saving || !row}>
                {saving ? "Saving…" : "Save"}
            </button>
        </div>
    );
}
