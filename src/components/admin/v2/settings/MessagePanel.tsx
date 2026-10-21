"use client";

// One customer message: email (subject, greeting, body, live preview), SMS
// (greeting, message, credits) and the WhatsApp template id, saved together.
// "Send a test" uses the same test routes as the old Emails tab.
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Btn, Field, Panel, toast } from "@/components/admin/ui";
import { STATUS_TEMPLATE_FIELDS } from "@/lib/ai/templateSettings";
import { saveMessage } from "./actions";
import type { Template } from "./load";
import { TEMPLATE_VARS, smsCredits, withSamples, type MessageEvent } from "./messages";

type Ch = "email" | "sms" | "wa";

function tpl(list: Template[], channel: "email" | "sms", ev?: string) {
    const t = ev ? list.find(x => x.channel === channel && x.event_type === ev) : undefined;
    return { subject: t?.subject ?? "", greeting: t?.greeting ?? "", body_text: t?.body_text ?? "" };
}

export function MessagePanel({ ev, templates, waIds, bizName, onClose }: {
    ev: MessageEvent; templates: Template[]; waIds: Record<string, string>; bizName: string; onClose: () => void;
}) {
    const router = useRouter();
    const chans: Ch[] = [ev.email && "email", ev.sms && "sms", ev.wa && "wa"].filter(Boolean) as Ch[];
    const [ch, setCh] = useState<Ch>(chans[0] ?? "wa");
    const start = useMemo(() => ({ email: tpl(templates, "email", ev.email), sms: tpl(templates, "sms", ev.sms), wa: ev.wa ? waIds[ev.wa] ?? "" : "" }), [templates, ev, waIds]);
    const [email, setEmail] = useState(start.email);
    const [sms, setSms] = useState(start.sms);
    const [wa, setWa] = useState(start.wa);
    const [busy, setBusy] = useState(false);
    const [testTo, setTestTo] = useState("");
    const [testing, setTesting] = useState(false);
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const smsRef = useRef<HTMLTextAreaElement>(null);

    const dirty = JSON.stringify({ email, sms, wa }) !== JSON.stringify(start);

    const insert = (which: "email" | "sms", token: string) => {
        const el = which === "email" ? bodyRef.current : smsRef.current;
        const cur = which === "email" ? email.body_text : sms.body_text;
        const a = el?.selectionStart ?? cur.length, b = el?.selectionEnd ?? cur.length;
        const next = cur.slice(0, a) + token + cur.slice(b);
        if (which === "email") setEmail({ ...email, body_text: next }); else setSms({ ...sms, body_text: next });
        requestAnimationFrame(() => { if (el) { el.focus(); el.selectionStart = el.selectionEnd = a + token.length; } });
    };

    const save = async () => {
        setBusy(true);
        const res = await saveMessage({
            event: ev.key,
            ...(ev.email ? { email } : {}),
            ...(ev.sms ? { sms } : {}),
            ...(ev.wa ? { waTemplateId: wa } : {}),
        });
        setBusy(false);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success(`${ev.label} message saved`);
        router.refresh();
        onClose();
    };

    const sendTest = async () => {
        const to = testTo.trim();
        if (!to) { toast.error(ch === "email" ? "Enter an email address to send the test to." : "Enter a phone number to send the test to."); return; }
        setTesting(true);
        try {
            const res = ch === "email"
                ? await fetch("/api/admin/test-email", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: to, eventType: ev.email, eventLabel: ev.label, subject: email.subject || ev.label, greeting: email.greeting || "Hello,", bodyText: email.body_text }),
                })
                : await fetch("/api/admin/test-sms", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone: to, message: withSamples([sms.greeting, sms.body_text].filter(Boolean).join(" ")) || undefined }),
                });
            const data = await res.json().catch(() => null);
            if (!res.ok) { toast.fromResponse(data, { audience: "staff", fallback: ch === "email" ? "EML-01" : "SMS-01" }); return; }
            toast.success(ch === "email" ? `Test email sent to ${to}` : `Test SMS sent to ${to}`);
        } catch {
            toast.code("NET-01", { audience: "staff" });
        } finally { setTesting(false); }
    };

    const tabs = chans.map(c => ({ v: c, l: c === "email" ? "Email" : c === "sms" ? "SMS" : "WhatsApp" }));
    const smsText = [sms.greeting, sms.body_text].filter(Boolean).join(" ");

    const vars = (which: "email" | "sms") => (
        <div className="field">
            <span className="label">Insert</span>
            <div className="hrow-sm wrap">
                {TEMPLATE_VARS.map(t => <button key={t} type="button" className="chip" onClick={() => insert(which, t)}>{t}</button>)}
            </div>
            <div className="help">Tap one to put it where the cursor is. It&apos;s replaced with the real value when the message goes out.</div>
        </div>
    );

    const testRow = (
        <div className="set-test">
            <Field label={ch === "email" ? "Send a test to" : "Send a test SMS to"} htmlFor="msg-test"
                help={ch === "email" ? "Uses sample values like TEST1234 for the order." : "Ghana numbers only: 0XXXXXXXXX or +233XXXXXXXXX."}>
                <div className="hrow-sm">
                    <input id="msg-test" className="input grow" inputMode={ch === "email" ? "email" : "tel"} placeholder={ch === "email" ? "you@example.com" : "0200000000"}
                        value={testTo} onChange={e => setTestTo(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void sendTest(); }} />
                    <Btn onClick={() => void sendTest()} disabled={testing}>{testing ? "Sending…" : "Send a test"}</Btn>
                </div>
            </Field>
        </div>
    );

    return (
        <Panel open wide onClose={onClose} title={ev.label} sub={ev.when}
            tabs={tabs.length > 1 ? tabs : null} tab={ch} onTab={t => { setCh(t); setTestTo(""); }}
            footer={<><Btn kind="ghost" onClick={onClose} disabled={busy}>Cancel</Btn><Btn kind="primary" onClick={() => void save()} disabled={busy || !dirty}>{busy ? "Saving…" : "Save message"}</Btn></>}>
            {ev.fixed && <Banner tone="info" title="Email and SMS are set by the system">{ev.fixed}</Banner>}
            {ch === "email" && ev.email && <>
                <Field label="Subject" htmlFor="msg-subj"><input id="msg-subj" className="input" value={email.subject} placeholder={`${ev.label} — ${bizName}`} onChange={e => setEmail({ ...email, subject: e.target.value })} /></Field>
                <Field label="Greeting" htmlFor="msg-greet"><input id="msg-greet" className="input" value={email.greeting} placeholder="Dear Customer," onChange={e => setEmail({ ...email, greeting: e.target.value })} /></Field>
                <Field label="Message" htmlFor="msg-body"><textarea id="msg-body" ref={bodyRef} className="textarea" style={{ minHeight: 160 }} value={email.body_text}
                    placeholder="Your message. The order details and links are added automatically." onChange={e => setEmail({ ...email, body_text: e.target.value })} /></Field>
                {vars("email")}
                <div className="field">
                    <span className="label">Preview</span>
                    <div className="set-mail" aria-label="Email preview">
                        <div className="set-mail-h"><span className="xs muted">Subject</span> {withSamples(email.subject || ev.label)}</div>
                        <div className="set-mail-b">
                            <div className="set-mail-brand">{bizName}</div>
                            <div className="xs muted set-mail-kicker">{ev.label}</div>
                            <p>{withSamples(email.greeting || "Hello,")}</p>
                            <p style={{ whiteSpace: "pre-wrap" }}>{withSamples(email.body_text) || "Your message will appear here."}</p>
                            <div className="xs muted set-mail-foot">{bizName} · Accra, Ghana</div>
                        </div>
                    </div>
                    <div className="help">Shown with sample values.</div>
                </div>
                {testRow}
            </>}
            {ch === "sms" && ev.sms && <>
                <Field label="Greeting" htmlFor="sms-greet"><input id="sms-greet" className="input" value={sms.greeting} placeholder={`${bizName}:`} onChange={e => setSms({ ...sms, greeting: e.target.value })} /></Field>
                <Field label="Message" htmlFor="sms-body" help={`${smsText.length} characters · about ${smsCredits(smsText)} SMS ${smsCredits(smsText) === 1 ? "credit" : "credits"} (160 characters each)`}>
                    <textarea id="sms-body" ref={smsRef} className="textarea" style={{ minHeight: 110 }} value={sms.body_text}
                        placeholder="Keep it under 160 characters." onChange={e => setSms({ ...sms, body_text: e.target.value })} />
                </Field>
                {vars("sms")}
                <div className="field">
                    <span className="label">Preview</span>
                    <div className="set-sms">{withSamples(smsText) || "Your SMS will appear here."}</div>
                </div>
                {testRow}
            </>}
            {ch === "wa" && ev.wa && <>
                <Field label={`Approved template id (${STATUS_TEMPLATE_FIELDS[ev.wa].name})`} htmlFor="wa-id"
                    help="The number shown for this template in Chatbots Africa › Message Templates. Needed after 24 hours without a message from the customer; left blank, this step goes by SMS only then.">
                    <input id="wa-id" className="input" inputMode="numeric" value={wa} placeholder="From Chatbots Africa" onChange={e => setWa(e.target.value.replace(/\s/g, ""))} />
                </Field>
                <Banner tone="neutral" title="WhatsApp wording is fixed">WhatsApp only sends templates it has approved, so the words are set in Chatbots Africa. Order updates on WhatsApp are switched on or off for every step in Messages to customers.</Banner>
            </>}
        </Panel>
    );
}
