"use client";

// Panels the WhatsApp chat opens: correcting one of the assistant's replies
// (what it should have said and why → a lesson staff can edit → saved, and
// optionally the right answer sent now), and the customer's orders on this
// number with what is in the assistant's basket.
import { useState } from "react";
import { Banner, Btn, BtnLink, Empty, Field, Panel, Switch, ghs, plural, toast } from "@/components/admin/ui";
import type { CustomerPanel as Panelled } from "@/lib/whatsapp/customerPanel";
import { BODY_MAX, TITLE_MAX } from "@/lib/ai/teach/lessonRules";
import { call, send } from "./api";

export function CorrectPanel(p: { conversationId: string; messageId: string; said: string; customerWrote: string | null; name: string; onClose: () => void; onSaved: () => void }) {
    const [right, setRight] = useState("");
    const [why, setWhy] = useState("");
    const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
    const [canSend, setCanSend] = useState(false);
    const [sendNow, setSendNow] = useState(true);
    const [busy, setBusy] = useState(false);
    const url = `/api/whatsapp/inbox/${p.conversationId}/correct`;

    const makeDraft = async () => {
        if (!right.trim()) { toast.error("Say what it should have said."); return; }
        setBusy(true);
        const r = await call(url, send("POST", { step: "draft", messageId: p.messageId, rightAnswer: right, why }));
        setBusy(false);
        if (!r.ok || !r.data?.draft) { toast.fromResponse(r.data, { audience: "staff" }); return; }
        setDraft(r.data.draft);
        setCanSend(!!r.data.canSend);
        setSendNow(!!r.data.canSend);
    };

    const save = async () => {
        if (!draft) return;
        setBusy(true);
        const r = await call(url, send("POST", { step: "save", messageId: p.messageId, title: draft.title, body: draft.body, rightAnswer: right, sendNow: canSend && sendNow }));
        setBusy(false);
        if (!r.ok) { toast.fromResponse(r.data, { audience: "staff" }); return; }
        toast.success(r.data?.sent === false
            ? "Lesson saved. The message to the customer didn't send; reply from your WhatsApp."
            : r.data?.sent ? "Lesson saved and the right answer sent." : "Saved. The assistant uses it from the next message.");
        p.onSaved();
        p.onClose();
    };

    return (
        <Panel open onClose={p.onClose} title="Teach the assistant" sub={`From the chat with ${p.name}`}
            footerLeft={draft ? <Btn kind="ghost" onClick={() => setDraft(null)} disabled={busy}>Back</Btn> : undefined}
            footer={<>
                <Btn kind="ghost" onClick={p.onClose} disabled={busy}>Cancel</Btn>
                {draft
                    ? <Btn kind="primary" onClick={() => void save()} disabled={busy || !draft.title.trim() || !draft.body.trim()}>{busy ? "Saving…" : "Save"}</Btn>
                    : <Btn kind="primary" onClick={() => void makeDraft()} disabled={busy || !right.trim()}>{busy ? "Thinking…" : "Next"}</Btn>}
            </>}>
            <div className="stack">
                {p.customerWrote && <div className="inset sm"><div className="section-t">The customer wrote</div><div className="inbox-text">{p.customerWrote}</div></div>}
                <div className="inset sm"><div className="section-t">The assistant said</div><div className="inbox-text">“{p.said}”</div></div>
                {!draft ? (
                    <>
                        <Field label="What should it have said?" htmlFor="correct-right">
                            <textarea id="correct-right" data-autofocus className="textarea" maxLength={600} value={right} onChange={e => setRight(e.target.value)}
                                placeholder="e.g. Yes, you can collect from Osu tomorrow after 10." />
                        </Field>
                        <Field label="The rule to remember" htmlFor="correct-why" help="Write it the way you'd explain it to a new member of staff. Keep prices and times out: those come from your products and hours.">
                            <textarea id="correct-why" className="textarea" maxLength={400} value={why} onChange={e => setWhy(e.target.value)} />
                        </Field>
                    </>
                ) : (
                    <>
                        <p className="sm ink2">The lesson it will remember for every customer. Change it if you like.</p>
                        <Field label="Title" htmlFor="correct-title">
                            <input id="correct-title" className="input" maxLength={TITLE_MAX} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
                        </Field>
                        <Field label="What it should know" htmlFor="correct-body" help={`${draft.body.length}/${BODY_MAX}`}>
                            <textarea id="correct-body" className="textarea" maxLength={BODY_MAX} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} />
                        </Field>
                        <div className="hrow between">
                            <div>
                                <div className="sm strong">Also send the right answer to this customer now</div>
                                {!canSend && <div className="help">Their last message was over 24 hours ago, so WhatsApp won&apos;t deliver it from here.</div>}
                            </div>
                            <Switch label="Also send the right answer now" checked={canSend && sendNow} disabled={!canSend} onChange={setSendNow} />
                        </div>
                    </>
                )}
            </div>
        </Panel>
    );
}

export function CustomerPanel({ c, phone, onClose }: { c: Panelled; phone: string; onClose: () => void }) {
    return (
        <Panel open onClose={onClose} title={c.name ?? "Customer"} sub={`Orders on ${phone}`}
            footer={<>
                <Btn kind="ghost" onClick={onClose}>Close</Btn>
                {c.email && <BtnLink kind="primary" href={`/customers/${encodeURIComponent(c.email)}`}>Open customer</BtnLink>}
            </>}>
            <div className="stack">
                <dl className="dl">
                    <dt>Orders</dt><dd>{c.orders ? plural(c.orders, "order") : "None on this number yet"}</dd>
                    <dt>Spent</dt><dd>{c.paidOrders ? `${ghs(c.spent)} across ${plural(c.paidOrders, "paid order")}` : "Nothing paid yet"}</dd>
                    {c.email && <><dt>Email</dt><dd>{c.email}</dd></>}
                </dl>
                {c.basket.length > 0 && (
                    <div className="inset">
                        <div className="section-t">In the assistant&apos;s basket</div>
                        {c.basket.map((b, i) => <div key={i} className="sm">{b}</div>)}
                    </div>
                )}
                {c.recent.length > 0 ? (
                    <div className="card" style={{ background: "var(--card-2)" }}>
                        <div className="card-h"><h2>Latest orders</h2></div>
                        <div className="rows">
                            {c.recent.map(o => (
                                <a key={o.id} className="row click" href={`/sales/orders/${o.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                                    <div className="row-main">
                                        <div className="row-title">{o.ref ?? o.id.slice(0, 8).toUpperCase()}</div>
                                        <div className="row-sub">{new Date(o.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Accra" })} · {o.payment ?? "unknown"}{o.fulfilment ? ` · ${o.fulfilment}` : ""}</div>
                                    </div>
                                    <span className="num strong">{ghs(o.total)}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                ) : (
                    <Empty icon="orders" title="No orders yet" body="Orders placed with this phone number, in the shop or on WhatsApp, show here." />
                )}
                {!c.email && c.orders > 0 && <Banner tone="neutral" title="No email on these orders">Customer pages are found by email, so open an order to see their details.</Banner>}
            </div>
        </Panel>
    );
}
