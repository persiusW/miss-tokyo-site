"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

type Channel = "email" | "sms";

type CommTemplate = {
    id?: string;
    channel: Channel;
    event_type: string;
    subject?: string | null;
    greeting?: string | null;
    body_text: string;
};

type EventDef = {
    key: string;
    label: string;
    description: string;
    adminOnly?: boolean;
    channels: Channel[];
    previewTag?: string;
};

const ALL_EVENTS: EventDef[] = [
    {
        key: "order_confirmed",
        label: "Order Confirmed",
        description: "Sent to the customer when payment is successfully processed via Paystack.",
        channels: ["email", "sms"],
        previewTag: "Transactional",
    },
    {
        key: "order_shipped",
        label: "Order Shipped",
        description: "Sent to the customer when a rider is assigned and the order is on its way.",
        channels: ["email", "sms"],
        previewTag: "Transactional",
    },
    {
        key: "order_fulfilled",
        label: "Order Fulfilled",
        description: "Sent to the customer when their order has been delivered and marked complete.",
        channels: ["email", "sms"],
        previewTag: "Transactional",
    },
    {
        key: "order_cancelled",
        label: "Order Cancelled",
        description: "Sent to the customer if their order is cancelled for any reason.",
        channels: ["email", "sms"],
        previewTag: "Transactional",
    },
    {
        key: "admin_new_order",
        label: "New Order Alert",
        description: "Internal notification sent to the atelier team when a new order is placed.",
        channels: ["email"],
        adminOnly: true,
        previewTag: "Admin",
    },
    {
        key: "account_setup",
        label: "Account Setup",
        description: "Sent to first-time customers with a link to set their password and track orders.",
        channels: ["email"],
        previewTag: "Onboarding",
    },
    {
        key: "invoice_sent",
        label: "Invoice Sent",
        description: "Sent to clients when an invoice or quotation is issued from the Finance panel.",
        channels: ["email"],
        previewTag: "Finance",
    },
    {
        key: "wholesale_approved",
        label: "Wholesale Approved",
        description: "Sent to a customer when their account is promoted to wholesale status.",
        channels: ["email", "sms"],
        previewTag: "Account",
    },
    {
        key: "wholesale_revoked",
        label: "Wholesale Revoked",
        description: "Sent to a customer when their wholesale access is removed.",
        channels: ["email"],
        previewTag: "Account",
    },
    {
        key: "team_invite",
        label: "Team Invitation",
        description: "Sent to a new team member (admin or sales staff) when they are invited to the platform.",
        channels: ["email", "sms"],
        adminOnly: true,
        previewTag: "Admin",
    },
];

// ── Dummy values injected into template variables for test sends ───────────────
const DUMMY_VARS: Record<string, string> = {
    "{order_id}":       "TEST1234",
    "{customer_name}":  "Test Customer",
    "{amount}":         "GH₵ 1,200.00",
    "{rider_name}":     "Kwame Mensah",
    "{rider_phone}":    "+233 20 000 0000",
};

function injectDummyVars(text: string): string {
    return Object.entries(DUMMY_VARS).reduce(
        (str, [key, val]) => str.replaceAll(key, val),
        text,
    );
}

// ── Email preview component ────────────────────────────────────────────────────

function EmailPreview({ event, template, bizName }: { event: EventDef; template: CommTemplate; bizName: string }) {
    const name = bizName || "Miss Tokyo";
    const greeting = template.greeting || "Hello,";
    const body = template.body_text || "Your message body will appear here.";
    const subject = template.subject || event.label;

    return (
        <div style={{ background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-md)", overflow: "hidden", fontSize: 12 }}>
            <div style={{ background: "var(--ac-panel)", borderBottom: "1px solid var(--ac-line)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>Preview</p>
                <p style={{ color: "var(--ac-ink-2)" }}><span style={{ color: "var(--ac-ink-4)" }}>Subject:</span> {subject}</p>
                <p style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>From: {name} &lt;no-reply@resend.dev&gt;</p>
            </div>
            <div style={{ fontFamily: "Georgia, serif", padding: "24px 20px", background: "#fafaf9" }}>
                <div style={{ maxWidth: 480, margin: "0 auto", background: "white", border: "1px solid #e5e5e5", padding: "32px 36px" }}>
                    <h1 style={{ fontSize: 18, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px", fontFamily: "Georgia, serif" }}>
                        {name}
                    </h1>
                    <p style={{ color: "#737373", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 28px" }}>
                        {event.label}
                    </p>
                    <p style={{ fontSize: 13, color: "#171717", margin: "0 0 16px", fontFamily: "Georgia, serif" }}>
                        {greeting}
                    </p>
                    <p style={{ fontSize: 13, color: "#525252", lineHeight: 1.8, margin: "0 0 24px", whiteSpace: "pre-wrap" }}>
                        {body}
                    </p>
                    {event.key === "account_setup" && (
                        <div style={{ background: "#171717", display: "inline-block", padding: "12px 20px", marginBottom: 24 }}>
                            <span style={{ color: "white", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                                Set Up Your Account →
                            </span>
                        </div>
                    )}
                    {event.key === "admin_new_order" && (
                        <div style={{ background: "#171717", display: "inline-block", padding: "12px 20px", marginBottom: 24 }}>
                            <span style={{ color: "white", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                                View Order in Dashboard →
                            </span>
                        </div>
                    )}
                    <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: 16 }}>
                        <p style={{ fontSize: 10, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
                            {name} · Accra, Ghana
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SmsPreview({ template }: { template: CommTemplate }) {
    const raw = [template.greeting, template.body_text].filter(Boolean).join(" ") || "Your SMS message will appear here.";
    const preview = injectDummyVars(raw);
    return (
        <div style={{ background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            <div style={{ background: "var(--ac-panel)", borderBottom: "1px solid var(--ac-line)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-ink-4)" }}>SMS Preview</p>
                <p style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>Variables shown with sample values</p>
            </div>
            <div style={{ padding: 24, display: "flex", justifyContent: "center" }}>
                <div style={{ background: "#1f2937", color: "#fff", borderRadius: "16px 16px 16px 4px", padding: "12px 16px", maxWidth: 260, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {preview}
                </div>
            </div>
            <div style={{ padding: "0 16px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 10, color: raw.length > 160 ? "var(--ac-danger)" : "var(--ac-ink-4)" }}>
                    {raw.length} chars · {Math.ceil(raw.length / 160)} SMS credit{Math.ceil(raw.length / 160) > 1 ? "s" : ""}
                </p>
            </div>
        </div>
    );
}

// ── ChannelTab ─────────────────────────────────────────────────────────────────

const TEMPLATE_VARS = [
    { key: "order_id",      label: "{order_id}" },
    { key: "customer_name", label: "{customer_name}" },
    { key: "amount",        label: "{amount}" },
    { key: "rider_name",    label: "{rider_name}" },
    { key: "rider_phone",   label: "{rider_phone}" },
];

function ChannelTab({
    channel,
    bizName,
    templates,
    onUpdate,
    onSave,
    saving,
    saved,
    selectedKey,
    onSelectKey,
}: {
    channel: Channel;
    bizName: string;
    templates: CommTemplate[];
    onUpdate: (event_type: string, field: keyof CommTemplate, value: string) => void;
    onSave: (event_type: string) => void;
    saving: string | null;
    saved: string | null;
    selectedKey: string;
    onSelectKey: (key: string) => void;
})
 {
    const events = ALL_EVENTS.filter(e => e.channels.includes(channel));
    const selectedEvent = events.find(e => e.key === selectedKey) ?? events[0];
    const tpl: CommTemplate = templates.find(t => t.channel === channel && t.event_type === selectedKey) ?? {
        channel,
        event_type: selectedKey,
        subject: "",
        greeting: "",
        body_text: "",
    };
    const saveKey = `${channel}-${selectedKey}`;
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    function insertVar(varLabel: string) {
        const el = bodyRef.current;
        if (!el) return;
        const start = el.selectionStart ?? el.value.length;
        const end   = el.selectionEnd   ?? el.value.length;
        const newVal = el.value.slice(0, start) + varLabel + el.value.slice(end);
        onUpdate(selectedKey, "body_text", newVal);
        // Restore cursor after the inserted text
        requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = start + varLabel.length;
            el.focus();
        });
    }

    return (
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", gap: 24, alignItems: "start" }}>
            {/* Left: event selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {events.map(ev => (
                    <button key={ev.key} type="button" onClick={() => onSelectKey(ev.key)}
                        style={{
                            width: "100%", textAlign: "left", padding: "10px 12px", cursor: "pointer",
                            background: selectedKey === ev.key ? "var(--ac-panel-2)" : "transparent",
                            border: "none", borderLeft: `2px solid ${selectedKey === ev.key ? "var(--ac-accent)" : "transparent"}`,
                            color: selectedKey === ev.key ? "var(--ac-ink)" : "var(--ac-ink-4)",
                            transition: "all .15s",
                        }}>
                        <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" }}>{ev.label}</p>
                        {ev.adminOnly && <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)" }}>Admin only</span>}
                        {ev.previewTag && !ev.adminOnly && <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ac-ink-4)" }}>{ev.previewTag}</span>}
                    </button>
                ))}
            </div>

            {/* Middle: editable fields */}
            <div>
                <div className="ac-card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                    <div>
                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-4)", marginBottom: 4 }}>Event</p>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ac-ink)" }}>{selectedEvent?.label}</p>
                        <p style={{ fontSize: 11, color: "var(--ac-ink-4)", marginTop: 4, lineHeight: 1.6 }}>{selectedEvent?.description}</p>
                    </div>

                    {channel === "email" && (
                        <div>
                            <label className="ac-label">Subject Line</label>
                            <input type="text" value={tpl.subject ?? ""}
                                onChange={e => onUpdate(selectedKey, "subject", e.target.value)}
                                className="ac-input" placeholder={`${selectedEvent?.label} — Miss Tokyo`} />
                        </div>
                    )}

                    <div>
                        <label className="ac-label">Greeting</label>
                        <input type="text" value={tpl.greeting ?? ""}
                            onChange={e => onUpdate(selectedKey, "greeting", e.target.value)}
                            className="ac-input" placeholder={channel === "email" ? "Dear Customer," : "Miss Tokyo:"} />
                    </div>

                    <div>
                        <label className="ac-label">{channel === "email" ? "Body Text" : "Message"}</label>
                        <textarea ref={bodyRef} rows={channel === "email" ? 5 : 3}
                            value={tpl.body_text}
                            onChange={e => onUpdate(selectedKey, "body_text", e.target.value)}
                            className="ac-textarea" style={{ resize: "vertical" }}
                            placeholder={channel === "email"
                                ? "Your message body. Dynamic values like order ID and rider name are injected automatically."
                                : "Short SMS message. Keep under 160 chars. Use variables below."
                            } />
                        {channel === "sms" && (
                            <p style={{ fontSize: 10, marginTop: 4, color: tpl.body_text.length > 160 ? "var(--ac-danger)" : "var(--ac-ink-4)" }}>
                                {tpl.body_text.length} / 160 characters
                            </p>
                        )}
                    </div>

                    <div style={{ background: "var(--ac-panel-2)", border: "1px solid var(--ac-line)", borderRadius: "var(--r-sm)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600, color: "var(--ac-ink-4)" }}>Available variables</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {TEMPLATE_VARS.map(v => (
                                <button key={v.key} type="button" onClick={() => insertVar(v.label)}
                                    style={{ fontFamily: "var(--f-mono)", fontSize: 10, padding: "3px 8px", background: "var(--ac-panel)", border: "1px solid var(--ac-line)", color: "var(--ac-ink-3)", cursor: "pointer", borderRadius: "var(--r-sm)" }}
                                    title={`Click to insert ${v.label}`}>
                                    {v.label}
                                </button>
                            ))}
                        </div>
                        <p style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>Click a variable to insert it at cursor position.</p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 4 }}>
                        <button type="button" onClick={() => onSave(selectedKey)} disabled={saving === saveKey} className="ac-btn ac-btn-primary">
                            {saving === saveKey ? "Saving…" : "Save Template"}
                        </button>
                        {saved === saveKey && (
                            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ac-accent)" }}>Saved</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: preview */}
            <div>
                {channel === "email" ? (
                    <EmailPreview event={selectedEvent} template={tpl} bizName={bizName} />
                ) : (
                    <SmsPreview template={tpl} />
                )}
            </div>
        </div>
    );
}

// ── EmailsTab ──────────────────────────────────────────────────────────────────

export function EmailsTab() {
    const [channel, setChannel] = useState<Channel>("email");
    const [templates, setTemplates] = useState<CommTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [bizName, setBizName] = useState("Miss Tokyo");

    // Lifted selection state so test buttons know the active template
    const emailEvents = ALL_EVENTS.filter(e => e.channels.includes("email"));
    const smsEvents   = ALL_EVENTS.filter(e => e.channels.includes("sms"));
    const [emailSelectedKey, setEmailSelectedKey] = useState(emailEvents[0]?.key ?? "");
    const [smsSelectedKey,   setSmsSelectedKey]   = useState(smsEvents[0]?.key ?? "");

    const selectedKey = channel === "email" ? emailSelectedKey : smsSelectedKey;
    const setSelectedKey = channel === "email" ? setEmailSelectedKey : setSmsSelectedKey;

    // Test send state
    const [emailModal, setEmailModal] = useState(false);
    const [smsModal,   setSmsModal]   = useState(false);
    const [testEmail,  setTestEmail]  = useState("");
    const [testPhone,  setTestPhone]  = useState("");
    const [testSending, setTestSending] = useState(false);

    // Get the active template for the current selection
    function getActiveTpl(ch: Channel, key: string): CommTemplate {
        return templates.find(t => t.channel === ch && t.event_type === key) ?? {
            channel: ch, event_type: key, subject: "", greeting: "", body_text: "",
        };
    }

    async function sendTestEmail() {
        if (!testEmail.trim()) { toast.error("Enter an email address"); return; }
        const tpl = getActiveTpl("email", emailSelectedKey);
        const eventDef = ALL_EVENTS.find(e => e.key === emailSelectedKey);
        setTestSending(true);
        try {
            const res = await fetch("/api/admin/test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email:     testEmail.trim(),
                    eventType: emailSelectedKey,
                    eventLabel: eventDef?.label ?? emailSelectedKey,
                    subject:   tpl.subject || eventDef?.label || "Order Confirmed",
                    greeting:  tpl.greeting || "Hello,",
                    bodyText:  tpl.body_text || "",
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed");
            toast.success("Test email sent!");
            setEmailModal(false);
            setTestEmail("");
        } catch (e: any) {
            toast.error(e.message || "Failed to send");
        } finally {
            setTestSending(false);
        }
    }

    async function sendTestSMS() {
        if (!testPhone.trim()) { toast.error("Enter a phone number"); return; }
        const tpl = getActiveTpl("sms", smsSelectedKey);
        const message = injectDummyVars(
            [tpl.greeting, tpl.body_text].filter(Boolean).join(" ")
            || "Your Miss Tokyo order #TEST1234 is confirmed! Thank you.",
        );
        setTestSending(true);
        try {
            const res = await fetch("/api/admin/test-sms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: testPhone.trim(), message }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed");
            toast.success("Test SMS sent!");
            setSmsModal(false);
            setTestPhone("");
        } catch (e: any) {
            toast.error(e.message || "Failed to send");
        } finally {
            setTestSending(false);
        }
    }

    useEffect(() => {
        Promise.all([
            supabase.from("communication_templates").select("*"),
            supabase.from("business_settings").select("business_name").eq("id", "default").single(),
        ]).then(([{ data: tpls }, { data: biz }]) => {
            setTemplates(tpls ?? []);
            if (biz?.business_name) setBizName(biz.business_name);
            setLoading(false);
        });
    }, []);

    const handleUpdate = (event_type: string, field: keyof CommTemplate, value: string) => {
        setTemplates(prev => {
            const exists = prev.find(t => t.channel === channel && t.event_type === event_type);
            if (exists) {
                return prev.map(t =>
                    t.channel === channel && t.event_type === event_type ? { ...t, [field]: value } : t,
                );
            }
            return [...prev, { channel, event_type, subject: null, greeting: "", body_text: "", [field]: value }];
        });
    };

    const handleSave = async (event_type: string) => {
        const tpl = templates.find(t => t.channel === channel && t.event_type === event_type) ?? {
            channel, event_type, subject: null, greeting: "", body_text: "",
        };
        const key = `${channel}-${event_type}`;
        setSaving(key);
        const { error } = await supabase
            .from("communication_templates")
            .upsert({ ...tpl, updated_at: new Date().toISOString() }, { onConflict: "channel,event_type" });
        setSaving(null);
        if (error) {
            toast.error("Failed to save template.");
        } else {
            setSaved(key);
            setTimeout(() => setSaved(null), 3000);
        }
    };

    if (loading) return <div className="ac-empty"><p className="ac-empty-title">Loading…</p></div>;

    const activeEmailEventLabel = ALL_EVENTS.find(e => e.key === emailSelectedKey)?.label ?? "Email";
    const activeSmsEventLabel   = ALL_EVENTS.find(e => e.key === smsSelectedKey)?.label ?? "SMS";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Header with test actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>Edit transactional message templates and send test notifications.</p>
                <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => setEmailModal(true)} className="ac-btn ac-btn-primary ac-btn-sm">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Test Email
                    </button>
                    <button type="button" onClick={() => setSmsModal(true)} className="ac-btn ac-btn-ghost ac-btn-sm">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Test SMS
                    </button>
                </div>
            </div>

            {/* Channel switcher */}
            <div className="ac-tabs">
                {(["email", "sms"] as Channel[]).map(ch => (
                    <button key={ch} type="button" onClick={() => setChannel(ch)}
                        className={`ac-tab ${channel === ch ? "active" : ""}`}>
                        {ch === "email" ? "Email Templates" : "SMS Templates"}
                    </button>
                ))}
            </div>

            <ChannelTab
                key={channel}
                channel={channel}
                bizName={bizName}
                templates={templates}
                onUpdate={handleUpdate}
                onSave={handleSave}
                saving={saving}
                saved={saved}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
            />

            {/* Test Email Modal */}
            {emailModal && (
                <div className="ac-modal-scrim" onClick={e => { if (e.target === e.currentTarget) setEmailModal(false); }}>
                    <div className="ac-modal">
                        <div className="ac-modal-head">
                            <div className="ac-modal-title">Send Test Email</div>
                            <button type="button" onClick={() => setEmailModal(false)} className="ac-modal-close">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div className="ac-modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <p style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                Sending: <strong style={{ color: "var(--ac-ink)" }}>{activeEmailEventLabel}</strong> template with dummy data.
                            </p>
                            <p style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>
                                Variables like {"{"+"order_id"+"}"} and {"{"+"customer_name"+"}"} will be replaced with test values.
                            </p>
                            <div>
                                <label className="ac-label">Email Address</label>
                                <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && sendTestEmail()}
                                    placeholder="you@example.com" autoFocus className="ac-input" />
                            </div>
                        </div>
                        <div className="ac-modal-foot">
                            <button type="button" onClick={() => setEmailModal(false)} className="ac-btn ac-btn-ghost">Cancel</button>
                            <button type="button" onClick={sendTestEmail} disabled={testSending} className="ac-btn ac-btn-primary">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                {testSending ? "Sending…" : "Send Test"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Test SMS Modal */}
            {smsModal && (
                <div className="ac-modal-scrim" onClick={e => { if (e.target === e.currentTarget) setSmsModal(false); }}>
                    <div className="ac-modal">
                        <div className="ac-modal-head">
                            <div className="ac-modal-title">Send Test SMS</div>
                            <button type="button" onClick={() => setSmsModal(false)} className="ac-modal-close">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                        <div className="ac-modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <p style={{ fontSize: 12, color: "var(--ac-ink-3)" }}>
                                Sending: <strong style={{ color: "var(--ac-ink)" }}>{activeSmsEventLabel}</strong> template via MNotify.
                            </p>
                            <div>
                                <label className="ac-label">Phone Number</label>
                                <input type="tel" value={testPhone} onChange={e => setTestPhone(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && sendTestSMS()}
                                    placeholder="0200000000 or +233200000000" autoFocus className="ac-input" />
                            </div>
                            <p style={{ fontSize: 10, color: "var(--ac-ink-4)" }}>Ghana numbers only. Format: 0XXXXXXXXX or +233XXXXXXXXX</p>
                        </div>
                        <div className="ac-modal-foot">
                            <button type="button" onClick={() => setSmsModal(false)} className="ac-btn ac-btn-ghost">Cancel</button>
                            <button type="button" onClick={sendTestSMS} disabled={testSending} className="ac-btn ac-btn-primary">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                                {testSending ? "Sending…" : "Send Test"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
