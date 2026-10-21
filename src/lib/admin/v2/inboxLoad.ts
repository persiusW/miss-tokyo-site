// Admin v2 Inbox data from the database: contact forms, custom requests and the
// admin's questions (WhatsApp chats come from /api/whatsapp/inbox, unchanged).
// Server only (service role); callers check the role first.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanSearch } from "@/lib/ai/missTokyoAi/tools/shared";
import type { StaffRole } from "./server";
import {
    REQUEST_NEEDS, contactReplyEvent, formItem, replyText, questionItem, requestItem, sortItems,
    type FormRow, type InboxFilter, type InboxItem, type InboxSource, type QuestionRow, type RequestRow,
} from "./inbox";

const db = supabaseAdmin as any;
const FORM_COLS = "id, first_name, last_name, email, topic, order_number, message, status, submitted_at, replied_at";
const REQUEST_COLS = "id, customer_name, customer_email, customizations, status, details, reference_product, created_at";
const QUESTION_COLS = "id, user_id, role, question, excerpt, page_path, status, answer, answered_at, saved_answer_id, created_at";

/** Reply by email from the inbox. On unless INBOX_EMAIL_REPLY=off. */
export const emailReplyOn = () => (process.env.INBOX_EMAIL_REPLY ?? "").trim().toLowerCase() !== "off";

/** Custom requests are shown while the store setting is on (unset counts as on, as in counts.ts). */
export async function customRequestsOn(): Promise<boolean> {
    const { data } = await supabaseAdmin.from("store_settings").select("enable_custom_requests").eq("id", "default").maybeSingle();
    return data?.enable_custom_requests !== false;
}

async function askers(rows: { user_id: string }[]): Promise<Map<string, string>> {
    const ids = [...new Set(rows.map(r => r.user_id))];
    if (ids.length === 0) return new Map();
    const { data } = await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids);
    return new Map((data ?? []).map(p => [p.id, (p.full_name ?? "").trim() || (p.email ?? "").split("@")[0] || "A team member"]));
}

function withAsker(rows: any[], names: Map<string, string>): QuestionRow[] {
    return rows.map(({ user_id, ...q }) => ({ ...q, excerpt: Array.isArray(q.excerpt) ? q.excerpt : [], asker: names.get(user_id) ?? "A team member" }));
}

export type SourceList = { items: InboxItem[]; more: boolean; totals: Record<Exclude<InboxSource, "whatsapp">, number> };

/**
 * The non-WhatsApp rows for one chip, newest first within each source, at most
 * `limit` per source (`more` says there are older ones to load).
 */
export async function loadSources(a: { role: StaffRole; filter: InboxFilter; q: string; limit: number; showRequests: boolean }): Promise<SourceList> {
    const q = cleanSearch(a.q, 60);
    const like = q ? `%${q}%` : null;
    const want = (s: InboxSource) => a.filter === "needs" || a.filter === "all" || a.filter === s;
    const take = a.limit + 1;

    const forms = want("form") ? (() => {
        let r = db.from("contact_submissions").select(FORM_COLS).order("submitted_at", { ascending: false }).limit(take);
        if (a.filter === "needs") r = r.eq("status", "unread");
        if (like) r = r.or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},message.ilike.${like}`);
        return r;
    })() : null;
    const requests = want("request") && a.showRequests ? (() => {
        let r = db.from("custom_requests").select(REQUEST_COLS).order("created_at", { ascending: false, nullsFirst: false }).limit(take);
        if (a.filter === "needs") r = r.in("status", REQUEST_NEEDS);
        if (like) r = r.or(`customer_name.ilike.${like},customer_email.ilike.${like},details.ilike.${like}`);
        return r;
    })() : null;
    const questions = want("ai") && a.role === "admin" ? (() => {
        let r = db.from("ai_questions").select(QUESTION_COLS).order("created_at", { ascending: false }).limit(take);
        if (a.filter === "needs") r = r.eq("status", "open");
        if (like) r = r.ilike("question", like);
        return r;
    })() : null;

    const head = (t: string) => db.from(t).select("id", { count: "exact", head: true });
    const [f, rq, qs, fc, rc, qc] = await Promise.all([
        forms ?? { data: [] }, requests ?? { data: [] }, questions ?? { data: [] },
        head("contact_submissions"),
        a.showRequests ? head("custom_requests") : { count: 0 },
        a.role === "admin" ? head("ai_questions") : { count: 0 },
    ]);
    for (const r of [f, rq, qs, fc, rc, qc]) if (r.error) throw r.error;

    const qRows = withAsker(qs.data ?? [], await askers(qs.data ?? []));
    const parts = [
        ((f.data ?? []) as FormRow[]).map(formItem),
        ((rq.data ?? []) as RequestRow[]).map(requestItem),
        qRows.map(questionItem),
    ];
    return {
        items: sortItems(parts.flatMap(p => p.slice(0, a.limit))),
        more: parts.some(p => p.length > a.limit),
        totals: { form: fc.count ?? 0, request: rc.count ?? 0, ai: qc.count ?? 0 },
    };
}

export type FormReply = { at: string; body: string; ok: boolean };
export type SourceDetail =
    | { source: "form"; item: InboxItem; form: FormRow; replies: FormReply[]; emailReply: boolean }
    | { source: "request"; item: InboxItem; request: RequestRow }
    | { source: "ai"; item: InboxItem; question: QuestionRow };

/** One conversation, or null when it isn't there (or the role may not see it). */
export async function loadDetail(source: Exclude<InboxSource, "whatsapp">, id: string, role: StaffRole): Promise<SourceDetail | null> {
    if (source === "form") {
        const [row, sent] = await Promise.all([
            db.from("contact_submissions").select(FORM_COLS).eq("id", id).maybeSingle(),
            db.from("notification_log").select("created_at, body, status").eq("event", contactReplyEvent(id)).order("created_at", { ascending: true }).limit(50),
        ]);
        if (row.error) throw row.error;
        if (!row.data) return null;
        const replies = ((sent.data ?? []) as { created_at: string; body: string | null; status: string }[])
            .map(r => ({ at: r.created_at, body: replyText(r.body), ok: r.status === "sent" }));
        return { source, item: formItem(row.data), form: row.data, replies, emailReply: emailReplyOn() };
    }
    if (source === "request") {
        const { data, error } = await db.from("custom_requests").select(REQUEST_COLS).eq("id", id).maybeSingle();
        if (error) throw error;
        return data ? { source, item: requestItem(data), request: data } : null;
    }
    if (role !== "admin") return null;
    const { data, error } = await db.from("ai_questions").select(QUESTION_COLS).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const [q] = withAsker([data], await askers([data]));
    return { source, item: questionItem(q), question: q };
}

/** Active products with a photo flashcard, and without one yet. */
export async function flashcardCoverage(): Promise<{ withCard: number; withoutCard: number }> {
    const { data, error } = await db.rpc("fn_flashcard_coverage");
    if (error) throw error;
    const r = (Array.isArray(data) ? data[0] : data) ?? {};
    return { withCard: Number(r.with_card) || 0, withoutCard: Number(r.without_card) || 0 };
}
