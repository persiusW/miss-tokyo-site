"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { Mail, MessageSquare, Send, X } from "lucide-react";

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
        <div className="bg-neutral-50 rounded-sm border border-neutral-200 overflow-hidden text-xs">
            <div className="bg-white border-b border-neutral-200 px-4 py-3 space-y-1">
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest">Preview</p>
                <p className="text-neutral-700"><span className="text-neutral-400">Subject:</span> {subject}</p>
                <p className="text-neutral-500 text-[10px]">From: {name} &lt;no-reply@resend.dev&gt;</p>
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
        <div className="bg-neutral-50 rounded-sm border border-neutral-200 overflow-hidden">
            <div className="bg-white border-b border-neutral-200 px-4 py-3 space-y-1">
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest">SMS Preview</p>
                <p className="text-[10px] text-neutral-400">Variables shown with sample values</p>
            </div>
            <div className="p-6 flex justify-center">
                <div className="bg-neutral-800 text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[260px] text-sm leading-relaxed whitespace-pre-wrap">
                    {preview}
                </div>
            </div>
            <div className="px-4 pb-4 text-center">
                <p className={`text-[10px] ${raw.length > 160 ? "text-red-500" : "text-neutral-400"}`}>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left: event selector */}
            <div className="space-y-1">
                {events.map(ev => (
                    <button
                        key={ev.key}
                        type="button"
                        onClick={() => onSelectKey(ev.key)}
                        className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${
                            selectedKey === ev.key
                                ? "border-black bg-neutral-50 text-black"
                                : "border-transparent text-neutral-500 hover:text-black hover:bg-neutral-50"
                        }`}
                    >
                        <p className="text-xs font-semibold uppercase tracking-widest">{ev.label}</p>
                        {ev.adminOnly && (
                            <span className="text-[10px] text-neutral-400 uppercase tracking-widest">Admin only</span>
                        )}
                        {ev.previewTag && !ev.adminOnly && (
                            <span className="text-[10px] text-neutral-400 uppercase tracking-widest">{ev.previewTag}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Middle: editable fields */}
            <div className="space-y-6">
                <div className="bg-white border border-neutral-200 p-6 space-y-5">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 mb-1">Event</p>
                        <p className="text-sm font-semibold">{selectedEvent?.label}</p>
                        <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">{selectedEvent?.description}</p>
                    </div>

                    {channel === "email" && (
                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Subject Line</label>
                            <input
                                type="text"
                                value={tpl.subject ?? ""}
                                onChange={e => onUpdate(selectedKey, "subject", e.target.value)}
                                className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                                placeholder={`${selectedEvent?.label} — Miss Tokyo`}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">Greeting</label>
                        <input
                            type="text"
                            value={tpl.greeting ?? ""}
                            onChange={e => onUpdate(selectedKey, "greeting", e.target.value)}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                            placeholder={channel === "email" ? "Dear Customer," : "Miss Tokyo:"}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">
                            {channel === "email" ? "Body Text" : "Message"}
                        </label>
                        <textarea
                            ref={bodyRef}
                            rows={channel === "email" ? 5 : 3}
                            value={tpl.body_text}
                            onChange={e => onUpdate(selectedKey, "body_text", e.target.value)}
                            className="w-full border border-neutral-200 bg-transparent p-3 outline-none focus:border-black text-sm transition-colors resize-y"
                            placeholder={
                                channel === "email"
                                    ? "Your message body. Dynamic values like order ID and rider name are injected automatically."
                                    : "Short SMS message. Keep under 160 chars. Use variables below."
                            }
                        />
                        {channel === "sms" && (
                            <p className={`text-[10px] mt-1 tracking-wide ${tpl.body_text.length > 160 ? "text-red-500" : "text-neutral-400"}`}>
                                {tpl.body_text.length} / 160 characters
                            </p>
                        )}
                    </div>

                    <div className="bg-neutral-50 border border-neutral-100 p-3 space-y-2">
                        <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Available variables</p>
                        <div className="flex flex-wrap gap-1.5">
                            {TEMPLATE_VARS.map(v => (
                                <button
                                    key={v.key}
                                    type="button"
                                    onClick={() => insertVar(v.label)}
                                    className="font-mono text-[10px] px-2 py-1 bg-white border border-neutral-200 text-neutral-600 hover:border-black hover:text-black transition-colors rounded-sm"
                                    title={`Click to insert ${v.label}`}
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-neutral-400">Click a variable to insert it at cursor position.</p>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => onSave(selectedKey)}
                            disabled={saving === saveKey}
                            className="px-6 py-2.5 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-50"
                        >
                            {saving === saveKey ? "Saving..." : "Save Template"}
                        </button>
                        {saved === saveKey && (
                            <span className="text-[10px] text-green-600 uppercase tracking-wider">Saved</span>
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

    if (loading) return <p className="text-neutral-400 italic font-serif">Loading...</p>;

    const activeEmailEventLabel = ALL_EVENTS.find(e => e.key === emailSelectedKey)?.label ?? "Email";
    const activeSmsEventLabel   = ALL_EVENTS.find(e => e.key === smsSelectedKey)?.label ?? "SMS";

    return (
        <div className="space-y-8">
            {/* Header with test actions */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-500">Edit transactional message templates and send test notifications.</p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setEmailModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-black text-white text-[10px] uppercase tracking-widest hover:bg-neutral-800 transition-colors"
                    >
                        <Mail size={12} /> Test Email
                    </button>
                    <button
                        type="button"
                        onClick={() => setSmsModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-neutral-300 text-neutral-600 text-[10px] uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                    >
                        <MessageSquare size={12} /> Test SMS
                    </button>
                </div>
            </div>

            {/* Channel switcher */}
            <div className="flex gap-0 border-b border-neutral-200">
                {(["email", "sms"] as Channel[]).map(ch => (
                    <button
                        key={ch}
                        type="button"
                        onClick={() => setChannel(ch)}
                        className={`px-8 py-3 text-xs font-semibold uppercase tracking-widest border-b-2 -mb-px transition-colors ${
                            channel === ch ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"
                        }`}
                    >
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white w-full max-w-md mx-4 p-8 rounded-2xl shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-base">Send Test Email</h3>
                            <button type="button" onClick={() => setEmailModal(false)} className="text-neutral-400 hover:text-black"><X size={18} /></button>
                        </div>
                        <p className="text-xs text-neutral-500 mb-1">
                            Sending: <span className="font-semibold text-black">{activeEmailEventLabel}</span> template with dummy data.
                        </p>
                        <p className="text-[10px] text-neutral-400 mb-5">
                            Variables like {"{order_id}"} and {"{customer_name}"} will be replaced with test values.
                        </p>
                        <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            value={testEmail}
                            onChange={e => setTestEmail(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendTestEmail()}
                            placeholder="you@example.com"
                            autoFocus
                            className="w-full border border-neutral-200 px-3 py-2.5 text-sm rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setEmailModal(false)} className="flex-1 border border-neutral-200 py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-50">Cancel</button>
                            <button
                                type="button"
                                onClick={sendTestEmail}
                                disabled={testSending}
                                className="flex-1 bg-black text-white py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Send size={13} />{testSending ? "Sending…" : "Send Test"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Test SMS Modal */}
            {smsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white w-full max-w-md mx-4 p-8 rounded-2xl shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-base">Send Test SMS</h3>
                            <button type="button" onClick={() => setSmsModal(false)} className="text-neutral-400 hover:text-black"><X size={18} /></button>
                        </div>
                        <p className="text-xs text-neutral-500 mb-5">
                            Sending: <span className="font-semibold text-black">{activeSmsEventLabel}</span> template via MNotify.
                        </p>
                        <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-1.5">Phone Number</label>
                        <input
                            type="tel"
                            value={testPhone}
                            onChange={e => setTestPhone(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendTestSMS()}
                            placeholder="0200000000 or +233200000000"
                            autoFocus
                            className="w-full border border-neutral-200 px-3 py-2.5 text-sm rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                        <p className="text-[10px] text-neutral-400 mb-6">Ghana numbers only. Format: 0XXXXXXXXX or +233XXXXXXXXX</p>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setSmsModal(false)} className="flex-1 border border-neutral-200 py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-50">Cancel</button>
                            <button
                                type="button"
                                onClick={sendTestSMS}
                                disabled={testSending}
                                className="flex-1 bg-black text-white py-2.5 text-xs uppercase tracking-widest rounded-lg hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Send size={13} />{testSending ? "Sending…" : "Send Test"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
