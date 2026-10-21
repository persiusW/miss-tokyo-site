// Admin v2 Inbox: one list for WhatsApp chats, contact-form messages, custom
// requests and the questions Miss Tokyo AI sent the admin. How each kind of
// row is keyed, labelled, filtered and sorted, and what counts as "needs a
// person" (the same rules as the side-nav count in counts.ts). Pure, so the
// page, the API and the tests agree.
import { REPLY_WINDOW_MS } from "@/lib/whatsapp/pipeline";
import type { InboxConversation } from "@/lib/whatsapp/inbox";

export type InboxSource = "whatsapp" | "form" | "request" | "ai";
export const SOURCES: readonly InboxSource[] = ["whatsapp", "form", "request", "ai"];

/** The chips over the list. `ai` is the admin's "Questions for admin". */
export type InboxFilter = "needs" | "all" | InboxSource;
export const FILTERS: readonly InboxFilter[] = ["needs", "all", "whatsapp", "form", "request", "ai"];

export const SOURCE_LABEL: Record<InboxSource, string> = {
    whatsapp: "WhatsApp", form: "Contact form", request: "Custom request", ai: "Question for admin",
};
export const FILTER_LABEL: Record<InboxFilter, string> = {
    needs: "Needs a person", all: "All", whatsapp: "WhatsApp", form: "Contact form", request: "Custom requests", ai: "Questions for admin",
};

/** Which chips a person sees: custom requests only while that feature is on, questions only for the admin. */
export function filtersFor(role: string, showRequests: boolean): InboxFilter[] {
    return FILTERS.filter(f => (f !== "request" || showRequests) && (f !== "ai" || role === "admin"));
}

export function isFilter(v: unknown): v is InboxFilter {
    return typeof v === "string" && (FILTERS as readonly string[]).includes(v);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A conversation in the URL is `<source>:<id>` (`?c=form:…`). A bare id is a WhatsApp chat, as the old inbox linked them. */
export function parseKey(v: string | null | undefined): { source: InboxSource; id: string } | null {
    const s = String(v ?? "").trim();
    if (UUID.test(s)) return { source: "whatsapp", id: s };
    const i = s.indexOf(":");
    if (i < 0) return null;
    const source = s.slice(0, i) as InboxSource;
    const id = s.slice(i + 1);
    return (SOURCES as readonly string[]).includes(source) && UUID.test(id) ? { source, id } : null;
}
export const itemKey = (source: InboxSource, id: string) => `${source}:${id}`;

/** One row in the list, whatever it came from. */
export type InboxItem = {
    key: string; source: InboxSource; id: string;
    name: string; subject: string; at: string;
    /** Waiting for someone on the team. */
    needs: boolean;
    /** Finished: replied, dealt with, answered, completed. */
    done: boolean;
    /** Shown in bold until someone opens it. */
    unread: boolean;
    /** A short status for rows that are neither waiting nor done ("Read", "Production"). */
    status: string | null;
    email: string | null;
    /** For sorting what is waiting: longest wait first. */
    waitingSince: string | null;
};

// ── Contact form ─────────────────────────────────────────────────────────────

export type FormRow = {
    id: string; first_name: string; last_name: string | null; email: string; topic: string;
    order_number: string | null; message: string; status: "unread" | "read" | "replied"; submitted_at: string; replied_at: string | null;
};
export const FORM_STATUS_LABEL: Record<FormRow["status"], string> = { unread: "Unread", read: "Read", replied: "Replied" };

export const fullName = (first: string | null | undefined, last?: string | null) => [first?.trim(), last?.trim()].filter(Boolean).join(" ");

export function formItem(r: FormRow): InboxItem {
    return {
        key: itemKey("form", r.id), source: "form", id: r.id,
        name: fullName(r.first_name, r.last_name) || r.email, subject: `${r.topic}: ${oneLine(r.message)}`, at: r.submitted_at,
        needs: r.status === "unread", done: r.status === "replied", unread: r.status === "unread",
        status: r.status === "read" ? "Read" : null, email: r.email, waitingSince: r.status === "unread" ? r.submitted_at : null,
    };
}

// ── Custom requests ──────────────────────────────────────────────────────────

/** Every status the old Custom Requests page offered, in its order. */
export const REQUEST_STATUSES = [
    { v: "inquiry", l: "Inquiry" },
    { v: "material_confirmation", l: "Material confirmation" },
    { v: "production", l: "Production" },
    { v: "completed", l: "Completed" },
    { v: "cancelled", l: "Cancelled" },
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number]["v"];
export const isRequestStatus = (v: unknown): v is RequestStatus => REQUEST_STATUSES.some(s => s.v === v);
/** New requests waiting for a first reply (counts.ts counts the same two). */
export const REQUEST_NEEDS = ["inquiry", "new"];
const REQUEST_DONE = ["completed", "cancelled"];

export type RequestRow = {
    id: string; customer_name: string | null; customer_email: string | null; customizations: unknown;
    status: string | null; details: string | null; reference_product: string | null; created_at: string | null;
};

/** The customer's choices, as "Label: value" lines. */
export function requestChoices(r: Pick<RequestRow, "customizations">): string[] {
    const c = r.customizations;
    if (!c || typeof c !== "object" || Array.isArray(c)) return [];
    return Object.entries(c as Record<string, unknown>)
        .filter(([, v]) => v != null && String(v).trim() !== "")
        .map(([k, v]) => `${k.replace(/[_-]+/g, " ").replace(/^\w/, x => x.toUpperCase())}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
}

export function requestStatusLabel(s: string | null): string {
    const st = s || "inquiry";
    return REQUEST_STATUSES.find(x => x.v === st)?.l ?? (st === "new" ? "New" : st);
}

export function requestItem(r: RequestRow): InboxItem {
    const st = r.status || "inquiry";
    const needs = REQUEST_NEEDS.includes(st);
    const at = r.created_at ?? new Date(0).toISOString();
    return {
        key: itemKey("request", r.id), source: "request", id: r.id,
        name: r.customer_name?.trim() || r.customer_email || "Customer",
        subject: oneLine(r.details || r.reference_product || requestChoices(r).join(", ") || "Bespoke request"), at,
        needs, done: REQUEST_DONE.includes(st), unread: needs,
        status: needs || REQUEST_DONE.includes(st) ? null : requestStatusLabel(st), email: r.customer_email, waitingSince: needs ? at : null,
    };
}

// ── Questions Miss Tokyo AI sent the admin ───────────────────────────────────

export type QuestionLine = { role: "user" | "assistant"; text: string };
export type QuestionRow = {
    id: string; role: string; question: string; excerpt: QuestionLine[] | null; page_path: string | null;
    status: "open" | "answered" | "dismissed"; answer: string | null; answered_at: string | null; saved_answer_id: string | null;
    created_at: string; asker: string;
};

export function questionItem(q: QuestionRow): InboxItem {
    const open = q.status === "open";
    return {
        key: itemKey("ai", q.id), source: "ai", id: q.id,
        name: q.asker, subject: oneLine(q.question), at: q.answered_at ?? q.created_at,
        needs: open, done: !open, unread: open,
        status: null, email: null, waitingSince: open ? q.created_at : null,
    };
}

// ── WhatsApp ─────────────────────────────────────────────────────────────────

const localPhone = (intl: string) => (/^233\d{9}$/.test(intl) ? `0${intl.slice(3)}` : `+${intl}`);
export { localPhone };

export function chatItem(c: InboxConversation): InboxItem {
    const at = c.preview?.at ?? c.lastMessageAt ?? new Date(0).toISOString();
    return {
        key: itemKey("whatsapp", c.id), source: "whatsapp", id: c.id,
        name: c.name ?? localPhone(c.phone),
        subject: c.preview ? `${c.preview.direction === "outbound" ? "You: " : ""}${c.preview.text}` : "No messages yet",
        at, needs: c.standing === "needs", done: c.standing === "dealt", unread: c.standing === "needs",
        status: c.standing === "assistant" ? "With the assistant" : c.standing === "notices" ? "Order updates only" : null,
        email: null, waitingSince: c.waitingSince,
    };
}

// ── The list ─────────────────────────────────────────────────────────────────

export function inFilter(i: Pick<InboxItem, "source" | "needs">, f: InboxFilter): boolean {
    if (f === "needs") return i.needs;
    if (f === "all") return true;
    return i.source === f;
}

/** What is waiting first, longest wait first; then everything else, newest first. */
export function sortItems<T extends Pick<InboxItem, "needs" | "waitingSince" | "at">>(items: T[]): T[] {
    const t = (s: string | null) => (s ? Date.parse(s) || 0 : 0);
    return [...items].sort((a, b) => {
        if (a.needs !== b.needs) return a.needs ? -1 : 1;
        if (a.needs) return t(a.waitingSince ?? a.at) - t(b.waitingSince ?? b.at);
        return t(b.at) - t(a.at);
    });
}

/** "another 23 hours", "another 40 minutes": how long WhatsApp still lets us write, or null once it has closed. */
export function windowLeft(lastInboundAt: string | null, now: number): string | null {
    const t = lastInboundAt ? Date.parse(lastInboundAt) : NaN;
    if (!Number.isFinite(t)) return null;
    const left = t + REPLY_WINDOW_MS - now;
    if (left <= 0) return null;
    const min = Math.floor(left / 60_000);
    if (min < 1) return "less than a minute";
    if (min < 60) return `another ${min} minute${min === 1 ? "" : "s"}`;
    const h = Math.floor(min / 60);
    return `another ${h} hour${h === 1 ? "" : "s"}`;
}

/** The email that answers a contact form: plain words, the customer's message quoted under it. */
export function contactReplyEmail(a: { firstName: string; reply: string; message: string; storeName: string }): { subject: string; html: string; text: string } {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const reply = a.reply.trim();
    const greet = a.firstName.trim() ? `Hi ${a.firstName.trim()},` : "Hi,";
    return {
        subject: `Re: your ${a.storeName} enquiry`,
        text: `${greet}\n\n${reply}\n\n${a.storeName}\n\n> ${a.message.trim().replace(/\n/g, "\n> ")}`,
        html: `<div style="font-family:sans-serif;max-width:600px;color:#141210;line-height:1.6">
<p>${esc(greet)}</p>
<div style="white-space:pre-wrap">${esc(reply)}</div>
<p style="margin-top:24px">${esc(a.storeName)}</p>
<hr style="margin:24px 0;border:none;border-top:1px solid #E8E4DE"/>
<p style="color:#8C8479;font-size:13px;margin-bottom:4px">Your message:</p>
<div style="color:#8C8479;font-size:13px;white-space:pre-wrap">${esc(a.message.trim())}</div>
</div>`,
    };
}
export const CONTACT_REPLY_MAX = 4000;
/** notification_log.event for a reply to one contact form, so the inbox can show what was sent. */
export const contactReplyEvent = (submissionId: string) => `contact_reply:${submissionId}`;

/** What we emailed (as notification_log keeps it), without the quoted message under it. */
export function replyText(body: string | null): string {
    const t = String(body ?? "");
    const cut = t.indexOf("Your message:");
    return (cut >= 0 ? t.slice(0, cut) : t).trim();
}

function oneLine(s: string | null | undefined, max = 90): string {
    const t = String(s ?? "").replace(/\s+/g, " ").trim();
    return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
