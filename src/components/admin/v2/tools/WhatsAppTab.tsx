"use client";

import { useState } from "react";
import { Btn, Card, ConfirmPanel, ErrorState, Field, Money, SRow } from "@/components/admin/ui";
import { STATUS_TEMPLATE_EVENTS, STATUS_TEMPLATE_FIELDS } from "@/lib/ai/templateSettings";
import { WhatsAppHealth } from "../settings/AssistantCards";
import { WhatsAppResults } from "../settings/InsightCards";
import { saveWhatsAppSetup, sendTestWhatsApp } from "./actions";
import { useRun } from "./useRun";

const s = (v: unknown) => (v == null ? "" : String(v));

export function WhatsAppTab({ ai }: { ai: Record<string, unknown> | null }) {
    const { busy, run } = useRun();
    const ids = (ai?.whatsapp_status_template_ids && typeof ai.whatsapp_status_template_ids === "object" ? ai.whatsapp_status_template_ids : {}) as Record<string, unknown>;
    const [f, setF] = useState({
        alertNumber: s(ai?.whatsapp_wallet_alert_number), walletBelow: s(ai?.whatsapp_wallet_alert_ghs ?? "50"),
        handoffTemplate: s(ai?.whatsapp_handoff_template_id), restockTemplate: s(ai?.whatsapp_restock_template_id),
    });
    const [status, setStatus] = useState<Record<string, string>>(Object.fromEntries(STATUS_TEMPLATE_EVENTS.map(e => [e, s(ids[e])])));
    const [to, setTo] = useState("");
    const [text, setText] = useState("Test message from the Miss Tokyo admin.");
    const [asking, setAsking] = useState(false);
    const idInput = (label: string, value: string, onChange: (v: string) => void, help?: string) => (
        <SRow key={label} label={label} help={help}>
            <input className="input" inputMode="numeric" aria-label={label} placeholder="From Chatbots Africa" style={{ width: 200 }} value={value} onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 16))} />
        </SRow>
    );

    return (
        <>
            <WhatsAppHealth />
            <Card title="Wallet alert and templates">
                {!ai ? <ErrorState what="the WhatsApp settings" /> : <>
                    <div className="rows">
                        <SRow label="Send wallet and AI budget alerts to" help="By SMS, at most once a day each. Blank uses the handover number, else the shop's WhatsApp number.">
                            <input className="input" aria-label="Alert number" placeholder="233…" style={{ width: 200 }} value={f.alertNumber} onChange={e => setF({ ...f, alertNumber: e.target.value })} />
                        </SRow>
                        <SRow label="Alert when the wallet is below" help="The Chatbots Africa wallet, checked every few minutes. 0 turns it off."><Money label="Wallet alert" value={f.walletBelow} onChange={v => setF({ ...f, walletBelow: v })} /></SRow>
                        {idInput("Handover template id", f.handoffTemplate, v => setF({ ...f, handoffTemplate: v }), "team_chat_alert: goes to the team number when a chat needs a person outside the 24-hour window.")}
                        {idInput("Back-in-stock template id", f.restockTemplate, v => setF({ ...f, restockTemplate: v }), "Needed for alerts more than 24 hours after the customer's last message.")}
                        {STATUS_TEMPLATE_EVENTS.map(e => idInput(`Order update: ${STATUS_TEMPLATE_FIELDS[e].label}`, status[e], v => setStatus({ ...status, [e]: v }), `Template ${STATUS_TEMPLATE_FIELDS[e].name}. Blank: SMS only outside the 24-hour window.`))}
                    </div>
                    <div className="card-body"><Btn kind="primary" disabled={!!busy} onClick={() => run("wa", () => saveWhatsAppSetup({ ...f, status }), "WhatsApp settings saved.")}>{busy === "wa" ? "Saving…" : "Save"}</Btn></div>
                </>}
            </Card>
            <Card title="Send a test message">
                <div className="card-body stack">
                    <div className="tl-inline">
                        <Field label="WhatsApp number" htmlFor="wt-to"><input id="wt-to" className="input" placeholder="233…" value={to} onChange={e => setTo(e.target.value)} /></Field>
                        <Field label="Message" htmlFor="wt-text"><input id="wt-text" className="input" maxLength={500} value={text} onChange={e => setText(e.target.value)} /></Field>
                    </div>
                    <div><Btn disabled={!!busy || to.replace(/\D/g, "").length < 9 || text.trim().length < 2} onClick={() => setAsking(true)}>Send test</Btn></div>
                    <p className="xs muted">WhatsApp only delivers free text to a number that messaged the shop in the last 24 hours. The send is logged and billed like any other.</p>
                </div>
            </Card>
            <WhatsAppResults />
            <ConfirmPanel open={asking} onClose={() => setAsking(false)} title="Send a real WhatsApp message?" tone="warn" confirmLabel={busy === "test" ? "Sending…" : "Send"} busy={busy === "test"}
                consequenceTitle="From the shop's WhatsApp line" consequence={`To ${to}: “${text.trim()}”. It costs one message.`}
                onConfirm={() => run("test", () => sendTestWhatsApp({ to, text }), "Sent.").then(() => setAsking(false))} />
        </>
    );
}
