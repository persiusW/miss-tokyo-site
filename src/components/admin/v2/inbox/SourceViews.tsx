"use client";

// The Inbox conversations that aren't WhatsApp chats: a contact-form message
// (read / unread / replied, reply by email), a custom request (its status) and
// a question Miss Tokyo AI sent the admin (answer, save the answer for next
// time, or dismiss). Each loads from /api/admin/v2/inbox/<source>/<id>.
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Badge, Banner, Btn, BtnLink, ErrorState, Field, IconBtn, Menu, Select, SkeletonRows, Switch, TwoTap, toast, when,
    firstName, type MenuItem,
} from "@/components/admin/ui";
import { useAdminV2 } from "@/components/admin/shell/AdminV2Context";
import {
    FORM_STATUS_LABEL, REQUEST_STATUSES, fullName, requestChoices, requestStatusLabel,
    type FormRow, type InboxItem, type QuestionRow, type RequestRow,
} from "@/lib/admin/v2/inbox";
import { call, send } from "./api";

type FormDetail = { source: "form"; item: InboxItem; form: FormRow; replies: { at: string; body: string; ok: boolean }[]; emailReply: boolean };
type RequestDetail = { source: "request"; item: InboxItem; request: RequestRow };
type QuestionDetail = { source: "ai"; item: InboxItem; question: QuestionRow };
type Detail = FormDetail | RequestDetail | QuestionDetail;

const ROLE_LABEL: Record<string, string> = { admin: "Admin", owner: "Owner", sales_staff: "Sales staff" };
const MAX_ANSWER = 4000;
const MAX_TITLE = 160;

function useDetail<T extends Detail>(source: T["source"], id: string) {
    const [d, setD] = useState<T | null>(null);
    const [failed, setFailed] = useState(false);
    const load = useCallback(async (quiet = false) => {
        const r = await call<T>(`/api/admin/v2/inbox/${source}/${id}`);
        if (r.ok && r.data) { setD(r.data); setFailed(false); } else if (!quiet) { setD(null); setFailed(true); }
    }, [source, id]);
    useEffect(() => { setD(null); setFailed(false); void load(); }, [load]);
    return { d, failed, load };
}

function Shell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
    return <section className="card"><div className="card-h"><span className="pane-back"><IconBtn label="Back to list" icon="back" onClick={onBack} /></span><h2>{title}</h2></div>{children}</section>;
}

function Head({ name, line, badge, email, menu, onBack }: { name: string; line: string; badge: React.ReactNode; email?: string | null; menu?: MenuItem[]; onBack: () => void }) {
    return (
        <div className="card-h inbox-conv-h">
            <span className="pane-back"><IconBtn label="Back to list" icon="back" onClick={onBack} /></span>
            <div className="grow" style={{ minWidth: 0 }}>
                <h2 className="inbox-ellipsis">{name}</h2>
                <div className="sm muted inbox-ellipsis">{line}</div>
            </div>
            {badge}
            {email && <BtnLink sm kind="ghost" href={`/customers/${encodeURIComponent(email)}`}>Customer</BtnLink>}
            {menu && menu.length > 0 && <Menu label="Conversation actions" items={menu} />}
        </div>
    );
}

// ── Contact form ─────────────────────────────────────────────────────────────

export function FormView({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
    const { refreshCounts } = useAdminV2();
    const { d, failed, load } = useDetail<FormDetail>("form", id);
    const [reply, setReply] = useState("");
    const [busy, setBusy] = useState(false);
    const marked = useRef<string | null>(null);

    const setStatus = useCallback(async (status: FormRow["status"], done?: string) => {
        setBusy(true);
        const r = await call(`/api/admin/contact-submissions/${id}`, send("PATCH", { status }));
        setBusy(false);
        if (!r.ok || r.data?.success === false) { if (done) toast.fromResponse(r.data, { audience: "staff" }); return; }
        if (done) toast.success(done);
        void load(true); onChanged(); refreshCounts();
    }, [id, load, onChanged, refreshCounts]);

    // Opening an unread message marks it read, as the old Form Submissions page did.
    useEffect(() => {
        if (d?.form.status === "unread" && marked.current !== id) { marked.current = id; void setStatus("read"); }
    }, [d, id, setStatus]);

    if (failed) return <Shell title="Contact form" onBack={onBack}><ErrorState what="this message" onRetry={() => load()} /></Shell>;
    if (!d) return <Shell title="Loading…" onBack={onBack}><SkeletonRows n={4} cols={2} /></Shell>;
    const f = d.form;
    const first = firstName(f.first_name) || "them";
    const mailto = `mailto:${f.email}?subject=${encodeURIComponent("Re: your Miss Tokyo enquiry")}`;

    const emailIt = async () => {
        const t = reply.trim();
        if (!t) return;
        setBusy(true);
        const r = await call(`/api/admin/v2/inbox/form/${id}`, send("POST", { action: "reply", body: t }));
        setBusy(false);
        if (!r.ok) { toast.fromResponse(r.data, { audience: "staff" }); return; }
        setReply("");
        toast.success(r.data?.warning ?? "Reply emailed");
        void load(true); onChanged(); refreshCounts();
    };

    const menu: MenuItem[] = [
        ...(f.status !== "replied" ? [{ l: "Mark as done", icon: "check" as const, onClick: () => void setStatus("replied", "Marked as replied"), disabled: busy }] : []),
        ...(f.status !== "unread" ? [{ l: "Mark as unread", icon: "mail" as const, onClick: () => { marked.current = id; void setStatus("unread", "Marked as unread"); }, disabled: busy }] : []),
        ...(f.status === "replied" ? [{ l: "Mark as read, not replied", icon: "inbox" as const, onClick: () => void setStatus("read", "Marked as read"), disabled: busy }] : []),
        "-",
        { l: "Open in your email app", icon: "mail", onClick: () => { window.location.href = mailto; } },
    ];

    return (
        <section className="card inbox-conv" aria-label={`Message from ${fullName(f.first_name, f.last_name)}`}>
            <Head name={fullName(f.first_name, f.last_name) || f.email} line={`Contact form · ${f.email} · ${f.topic}`} onBack={onBack} email={f.email} menu={menu}
                badge={f.status === "replied" ? <Badge plain>Done</Badge> : f.status === "unread" ? <Badge tone="warn">Needs a person</Badge> : <Badge plain>{FORM_STATUS_LABEL[f.status]}</Badge>} />
            <div className="inbox-thread">
                <div className="msg">
                    <div className="inbox-text">{f.message}</div>
                    <div className="msg-meta">{firstName(f.first_name) || "Customer"} · {when(f.submitted_at)}</div>
                </div>
                <dl className="dl inbox-facts">
                    <dt>Topic</dt><dd>{f.topic}</dd>
                    <dt>Order number</dt><dd>{f.order_number || "None given"}</dd>
                    <dt>Status</dt><dd>{FORM_STATUS_LABEL[f.status]}{f.replied_at ? ` · ${when(f.replied_at)}` : ""}</dd>
                </dl>
                {d.replies.map((r, i) => (
                    <div key={i} className="msg out">
                        <div className="inbox-text">{r.body}</div>
                        <div className="msg-meta">{r.ok ? "Emailed" : "Didn't send"} · {when(r.at)}</div>
                    </div>
                ))}
            </div>
            <div className="card-body inbox-compose stack-sm">
                {d.emailReply ? (
                    <>
                        <label className="sr" htmlFor={`form-reply-${id}`}>Reply by email</label>
                        <textarea id={`form-reply-${id}`} className="textarea" maxLength={MAX_ANSWER} value={reply} onChange={e => setReply(e.target.value)}
                            placeholder={`Reply by email to ${first}`} />
                        <div className="hrow between wrap">
                            <p className="help" style={{ margin: 0 }}>Sent from the shop&apos;s email address to {f.email}, with their message quoted under it. Marks it replied.</p>
                            <div className="hrow-sm">
                                <a className="btn btn-ghost" href={mailto}>Use my email app</a>
                                <Btn kind="primary" onClick={() => void emailIt()} disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Send"}</Btn>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="hrow between wrap">
                        <p className="help" style={{ margin: 0 }}>Reply from your email app, then mark it done from the menu.</p>
                        <a className="btn btn-primary" href={mailto}>Reply by email</a>
                    </div>
                )}
            </div>
        </section>
    );
}

// ── Custom request ───────────────────────────────────────────────────────────

export function RequestView({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
    const { refreshCounts } = useAdminV2();
    const { d, failed, load } = useDetail<RequestDetail>("request", id);
    const [busy, setBusy] = useState(false);
    if (failed) return <Shell title="Custom request" onBack={onBack}><ErrorState what="this request" onRetry={() => load()} /></Shell>;
    if (!d) return <Shell title="Loading…" onBack={onBack}><SkeletonRows n={4} cols={2} /></Shell>;
    const r = d.request;
    const status = r.status || "inquiry";
    const choices = requestChoices(r);
    const options = REQUEST_STATUSES.some(s => s.v === status) ? [...REQUEST_STATUSES] : [{ v: status, l: requestStatusLabel(status) }, ...REQUEST_STATUSES];

    const change = async (next: string) => {
        if (next === status) return;
        setBusy(true);
        const res = await call(`/api/admin/v2/inbox/request/${id}`, send("POST", { action: "status", status: next }));
        setBusy(false);
        if (!res.ok) { toast.fromResponse(res.data, { audience: "staff" }); return; }
        toast.success(`Status changed to ${requestStatusLabel(next).toLowerCase()}`);
        void load(true); onChanged(); refreshCounts();
    };

    return (
        <section className="card inbox-conv" aria-label="Custom request">
            <Head name={d.item.name} line={`Custom request${r.customer_email ? ` · ${r.customer_email}` : ""}`} onBack={onBack} email={r.customer_email}
                menu={r.customer_email ? [{ l: "Open in your email app", icon: "mail", onClick: () => { window.location.href = `mailto:${r.customer_email}`; } }] : []}
                badge={d.item.needs ? <Badge tone="warn">Needs a person</Badge> : d.item.done ? <Badge plain>Done</Badge> : <Badge tone="info">{requestStatusLabel(status)}</Badge>} />
            <div className="inbox-thread">
                <div className="msg">
                    <div className="inbox-text">{r.details?.trim() || "Bespoke request"}</div>
                    {choices.length > 0 && <div className="sm" style={{ marginTop: 6 }}>{choices.map(c => <div key={c}>{c}</div>)}</div>}
                    {r.reference_product && <div className="sm" style={{ marginTop: 6 }}>Based on: {r.reference_product}</div>}
                    <div className="msg-meta">{firstName(r.customer_name) || "Customer"} · {when(r.created_at)}</div>
                </div>
            </div>
            <div className="card-body inbox-compose">
                <Field label="Status" htmlFor={`req-status-${id}`} help="Changes save straight away. Reply to the customer by email.">
                    <Select id={`req-status-${id}`} value={status} onChange={v => void change(v)} options={options} disabled={busy} />
                </Field>
            </div>
        </section>
    );
}

// ── Question for admin ───────────────────────────────────────────────────────

export function QuestionView({ id, onBack, onChanged }: { id: string; onBack: () => void; onChanged: () => void }) {
    const { refreshCounts } = useAdminV2();
    const { d, failed, load } = useDetail<QuestionDetail>("ai", id);
    const [answer, setAnswer] = useState("");
    const [save, setSave] = useState(false);
    const [title, setTitle] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (d) setTitle(t => t || d.question.question.slice(0, MAX_TITLE)); }, [d]);

    if (failed) return <Shell title="Question for admin" onBack={onBack}><ErrorState what="this question" onRetry={() => load()} /></Shell>;
    if (!d) return <Shell title="Loading…" onBack={onBack}><SkeletonRows n={4} cols={2} /></Shell>;
    const q = d.question;
    const after = () => { window.dispatchEvent(new Event("mtai:badge-refresh")); void load(true); onChanged(); refreshCounts(); };

    const reply = async () => {
        if (!answer.trim()) return;
        setBusy(true);
        const r = await call(`/api/ai/inbox/${id}/answer`, send("POST", { answer, save: save ? { title } : null }));
        setBusy(false);
        if (!r.ok) { toast.fromResponse(r.data, { audience: "staff" }); return; }
        setAnswer("");
        toast.success(r.data?.warning ?? (r.data?.saved ? "Answer sent and saved for the assistant" : "Answer sent"));
        after();
    };
    const dismiss = async () => {
        setBusy(true);
        const r = await call(`/api/ai/inbox/${id}/dismiss`, { method: "POST" });
        setBusy(false);
        if (!r.ok) { toast.fromResponse(r.data, { audience: "staff" }); return; }
        toast.success("Question dismissed");
        after();
    };

    return (
        <section className="card inbox-conv" aria-label={`Question from ${q.asker}`}>
            <Head name={q.asker} line={`Question for admin · ${ROLE_LABEL[q.role] ?? q.role}${q.page_path ? ` · asked on ${q.page_path}` : ""}`} onBack={onBack}
                badge={q.status === "open" ? <Badge tone="warn">Needs a person</Badge> : <Badge plain>{q.status === "dismissed" ? "Dismissed" : "Done"}</Badge>} />
            <div className="inbox-thread">
                {(q.excerpt ?? []).length > 0 && <div className="inbox-day">Their chat with Miss Tokyo AI before they asked</div>}
                {(q.excerpt ?? []).map((l, i) => (
                    <div key={i} className={`msg${l.role === "assistant" ? " bot" : ""}`}>
                        <div className="inbox-text">{l.text}</div>
                        <div className="msg-meta">{l.role === "user" ? firstName(q.asker) || "Staff" : "Miss Tokyo AI"}</div>
                    </div>
                ))}
                <div className="msg">
                    <div className="inbox-text strong">{q.question}</div>
                    <div className="msg-meta">{firstName(q.asker) || "Staff"} sent this to the admin · {when(q.created_at)}</div>
                </div>
                {q.status === "answered" && q.answer && (
                    <div className="msg out">
                        <div className="inbox-text">{q.answer}</div>
                        <div className="msg-meta">Answered{q.saved_answer_id ? " · saved for the assistant" : ""} · {when(q.answered_at)}</div>
                    </div>
                )}
                {q.status === "dismissed" && <div className="inbox-event">Dismissed without a reply · {when(q.answered_at)}</div>}
            </div>
            {q.status === "open" ? (
                <div className="card-body inbox-compose stack-sm">
                    <label className="sr" htmlFor={`q-answer-${id}`}>Answer the question</label>
                    <textarea id={`q-answer-${id}`} className="textarea" maxLength={MAX_ANSWER} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Answer the question" />
                    <div className="hrow between">
                        <span className="sm">Save as an answer the assistant can give next time</span>
                        <Switch label="Save answer" checked={save} onChange={setSave} />
                    </div>
                    {save && (
                        <Field label="Saved answer title" htmlFor={`q-title-${id}`} help="The question staff ask. All staff get this answer from Miss Tokyo AI; change who sees it under Teach the assistant.">
                            <input id={`q-title-${id}`} className="input" maxLength={MAX_TITLE} value={title} onChange={e => setTitle(e.target.value)} />
                        </Field>
                    )}
                    <div className="hrow between wrap">
                        <TwoTap label="Dismiss" kind="ghost" onConfirm={() => void dismiss()} disabled={busy} />
                        <Btn kind="primary" onClick={() => void reply()} disabled={busy || !answer.trim() || (save && !title.trim())}>{busy ? "Sending…" : "Send"}</Btn>
                    </div>
                    <p className="help" style={{ margin: 0 }}>Your answer appears in {firstName(q.asker) || "their"}{firstName(q.asker) ? "'s" : ""} Miss Tokyo AI chat.</p>
                </div>
            ) : (
                <div className="card-body"><Banner tone="neutral" title={q.status === "answered" ? "Answered" : "Dismissed"}>Nothing else to do here.</Banner></div>
            )}
        </section>
    );
}
