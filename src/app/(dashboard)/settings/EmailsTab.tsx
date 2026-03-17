"use client";

import { useEffect, useState } from "react";
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
];

function EmailPreview({ event, template, bizName }: { event: EventDef; template: CommTemplate; bizName: string }) {
    const name = bizName || "Miss Tokyo";
    const greeting = template.greeting || "Hello,";
    const body = template.body_text || "Your message body will appear here.";
    const subject = template.subject || event.label;

    return (
        <div className="bg-neutral-50 rounded-sm border border-neutral-200 overflow-hidden text-xs">
            {/* Email chrome */}
            <div className="bg-white border-b border-neutral-200 px-4 py-3 space-y-1">
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest">Preview</p>
                <p className="text-neutral-700"><span className="text-neutral-400">Subject:</span> {subject}</p>
                <p className="text-neutral-500 text-[10px]">From: {name} &lt;no-reply@resend.dev&gt;</p>
            </div>
            {/* Email body */}
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
    const body = template.body_text || "Your SMS message will appear here.";
    const greeting = template.greeting || "";
    return (
        <div className="bg-neutral-50 rounded-sm border border-neutral-200 overflow-hidden">
            <div className="bg-white border-b border-neutral-200 px-4 py-3">
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest">SMS Preview</p>
            </div>
            <div className="p-6 flex justify-center">
                <div className="bg-neutral-800 text-white rounded-2xl rounded-tl-sm px-4 py-3 max-w-[260px] text-sm leading-relaxed">
                    {greeting && <span className="font-semibold">{greeting} </span>}
                    {body}
                </div>
            </div>
        </div>
    );
}

function ChannelTab({
    channel,
    bizName,
    templates,
    onUpdate,
    onSave,
    saving,
    saved,
}: {
    channel: Channel;
    bizName: string;
    templates: CommTemplate[];
    onUpdate: (event_type: string, field: keyof CommTemplate, value: string) => void;
    onSave: (event_type: string) => void;
    saving: string | null;
    saved: string | null;
}) {
    const events = ALL_EVENTS.filter(e => e.channels.includes(channel));
    const [selected, setSelected] = useState(events[0]?.key ?? "");

    const selectedEvent = events.find(e => e.key === selected) ?? events[0];
    const tpl: CommTemplate = templates.find(t => t.channel === channel && t.event_type === selected) ?? {
        channel,
        event_type: selected,
        subject: "",
        greeting: "",
        body_text: "",
    };
    const saveKey = `${channel}-${selected}`;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left: event type selector */}
            <div className="space-y-1">
                {events.map(ev => (
                    <button
                        key={ev.key}
                        type="button"
                        onClick={() => setSelected(ev.key)}
                        className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${
                            selected === ev.key
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
                                onChange={e => onUpdate(selected, "subject", e.target.value)}
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
                            onChange={e => onUpdate(selected, "greeting", e.target.value)}
                            className="w-full border-b border-neutral-300 bg-transparent py-2 outline-none focus:border-black text-sm transition-colors"
                            placeholder={channel === "email" ? "Dear Customer," : "Miss Tokyo:"}
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] uppercase tracking-widest font-semibold text-neutral-500 mb-2">
                            {channel === "email" ? "Body Text" : "Message"}
                        </label>
                        <textarea
                            rows={channel === "email" ? 5 : 3}
                            value={tpl.body_text}
                            onChange={e => onUpdate(selected, "body_text", e.target.value)}
                            className="w-full border border-neutral-200 bg-transparent p-3 outline-none focus:border-black text-sm transition-colors resize-y"
                            placeholder={
                                channel === "email"
                                    ? "Your message body. Dynamic values like order ID and rider name are injected automatically."
                                    : "Short SMS message. Keep under 160 characters for single SMS."
                            }
                        />
                        {channel === "sms" && (
                            <p className={`text-[10px] mt-1 tracking-wide ${tpl.body_text.length > 160 ? "text-red-500" : "text-neutral-400"}`}>
                                {tpl.body_text.length} / 160 characters
                            </p>
                        )}
                    </div>

                    {channel === "email" && (
                        <div className="bg-neutral-50 border border-neutral-100 p-3 space-y-1">
                            <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">Available variables</p>
                            <p className="text-[10px] text-neutral-500 font-mono leading-relaxed">
                                {"{order_id}"}  {"{customer_name}"}  {"{amount}"}  {"{rider_name}"}  {"{rider_phone}"}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => onSave(selected)}
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

export function EmailsTab() {
    const [channel, setChannel] = useState<Channel>("email");
    const [templates, setTemplates] = useState<CommTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [saved, setSaved] = useState<string | null>(null);
    const [bizName, setBizName] = useState("Miss Tokyo");

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
                    t.channel === channel && t.event_type === event_type ? { ...t, [field]: value } : t
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

    return (
        <div className="space-y-8">
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
            />
        </div>
    );
}
