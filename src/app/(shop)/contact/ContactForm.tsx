"use client";

import { useState, useCallback } from "react";

const TOPICS = ["Order help", "Size & fit", "Returns", "Delivery", "Collaboration", "Other"] as const;
const ORDER_TOPICS = new Set(["Order help", "Returns", "Delivery"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = {
    first_name: string;
    last_name: string;
    email: string;
    topic: string;
    order_number: string;
    message: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = { first_name: "", last_name: "", email: "", topic: "", order_number: "", message: "" };

function validate(f: FormState): FieldErrors {
    const e: FieldErrors = {};
    if (!f.first_name.trim()) e.first_name = "First name is required.";
    if (!f.email.trim()) e.email = "Email address is required.";
    else if (!EMAIL_REGEX.test(f.email.trim())) e.email = "Please enter a valid email address.";
    if (!f.topic) e.topic = "Please select a topic.";
    if (!f.message.trim()) e.message = "Message is required.";
    else if (f.message.trim().length < 10) e.message = "Message must be at least 10 characters.";
    return e;
}

export function ContactForm({ storeEmail }: { storeEmail: string }) {
    const [form, setForm] = useState<FormState>(EMPTY);
    const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
    const [submitErrors, setSubmitErrors] = useState<FieldErrors>({});
    const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const errors = { ...submitErrors, ...Object.fromEntries(
        (Object.keys(touched) as (keyof FormState)[])
            .filter(k => touched[k])
            .map(k => [k, validate(form)[k]])
            .filter(([, v]) => v)
    )};

    const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [field]: e.target.value }));

    const blur = (field: keyof FormState) => () =>
        setTouched(t => ({ ...t, [field]: true }));

    const handleTopicClick = (topic: string) => {
        setForm(f => ({ ...f, topic, order_number: "" }));
        setTouched(t => ({ ...t, topic: true }));
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ first_name: true, email: true, topic: true, message: true });
        const errs = validate(form);
        if (Object.keys(errs).length > 0) {
            setSubmitErrors(errs);
            return;
        }
        setStatus("sending");
        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.errors) {
                    setSubmitErrors(data.errors);
                    setStatus("idle");
                } else if (res.status === 429) {
                    setErrorMessage(data.message || "Too many submissions. Please try again later.");
                    setStatus("error");
                } else {
                    throw new Error(data.message || "Server error");
                }
                return;
            }
            setStatus("success");
        } catch (err: any) {
            setErrorMessage(err.message || "Something went wrong. Please try again.");
            setStatus("error");
        }
    }, [form]);

    if (status === "success") {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--sand)" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-serif text-2xl tracking-wide mb-1">Message Sent!</h3>
                    <p className="text-sm text-[var(--muted)] max-w-xs mx-auto leading-relaxed">
                        We've received your message and will get back to you within 24 hours.
                    </p>
                </div>
                <button
                    onClick={() => { setForm(EMPTY); setTouched({}); setSubmitErrors({}); setStatus("idle"); }}
                    className="text-xs uppercase tracking-widest text-[var(--muted)] hover:text-[var(--ink)] border-b border-current pb-0.5 transition-colors"
                >
                    Send another message
                </button>
            </div>
        );
    }

    const showOrderNumber = ORDER_TOPICS.has(form.topic);

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Topic pills */}
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-3">Topic</p>
                <div className="flex flex-wrap gap-2">
                    {TOPICS.map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => handleTopicClick(t)}
                            className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
                                form.topic === t
                                    ? "bg-[var(--ink)] text-white border-[var(--ink)]"
                                    : "border-[var(--border)] text-[var(--ink)] hover:border-[var(--ink)]"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                {errors.topic && <p className="text-red-500 text-xs mt-1">{errors.topic}</p>}
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-1.5">
                        First Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={form.first_name}
                        onChange={set("first_name")}
                        onBlur={blur("first_name")}
                        placeholder="Abena"
                        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--ink)] transition-colors ${
                            errors.first_name ? "border-red-400" : "border-[var(--border)]"
                        }`}
                    />
                    {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
                </div>
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-1.5">
                        Last Name
                    </label>
                    <input
                        type="text"
                        value={form.last_name}
                        onChange={set("last_name")}
                        placeholder="Mensah"
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--ink)] transition-colors"
                    />
                </div>
            </div>

            {/* Email */}
            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-1.5">
                    Email Address <span className="text-red-400">*</span>
                </label>
                <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    onBlur={blur("email")}
                    placeholder="you@email.com"
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--ink)] transition-colors ${
                        errors.email ? "border-red-400" : "border-[var(--border)]"
                    }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Order number (conditional) */}
            {showOrderNumber && (
                <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-1.5">
                        Order Number <span className="text-[var(--muted)] normal-case tracking-normal font-normal">(Optional)</span>
                    </label>
                    <input
                        type="text"
                        value={form.order_number}
                        onChange={set("order_number")}
                        placeholder="MT-12345"
                        className="w-full border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--ink)] transition-colors"
                    />
                </div>
            )}

            {/* Message */}
            <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-1.5">
                    Message <span className="text-red-400">*</span>
                </label>
                <textarea
                    value={form.message}
                    onChange={set("message")}
                    onBlur={blur("message")}
                    placeholder="Tell us what's on your mind…"
                    rows={5}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--ink)] transition-colors resize-y ${
                        errors.message ? "border-red-400" : "border-[var(--border)]"
                    }`}
                />
                {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
            </div>

            {/* Error banner */}
            {status === "error" && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    {errorMessage || `Something went wrong. Please try again or email us at ${storeEmail}`}
                </p>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={status === "sending"}
                className="w-full py-3.5 text-sm font-semibold uppercase tracking-widest text-white transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 rounded-lg"
                style={{ background: "var(--ink)" }}
            >
                {status === "sending" ? (
                    <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                            <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        Sending…
                    </>
                ) : (
                    <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        Send Message
                    </>
                )}
            </button>
            <p className="text-center text-xs text-[var(--muted)]">We typically reply within a few hours during business hours.</p>
        </form>
    );
}
