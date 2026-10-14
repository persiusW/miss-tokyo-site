// Chatbots Africa (https://api.chatbotsafrica.com/developers/api-docs): the
// WhatsApp provider. The API key travels in the JSON body (query string for
// GETs), never a bearer header. Numbers are international with no "+".
// Interactive payloads (quick reply, list) go as a JSON-encoded STRING in
// `interactive`, not a nested object. Sends draw on a prepaid wallet.
//
// Never log a request URL or body here: both carry the API key.
import type { NotificationMeta } from "@/lib/notificationLog";
import type { BalanceResult, ListMessage, MessagingProvider, MessagingResult, QuickReply, TemplateMessage } from "./provider";

export const CHATBOTS_AFRICA_BASE = "https://api.chatbotsafrica.com/api/v1.0";
const PROVIDER = "chatbots_africa";
const TIMEOUT_MS = 15_000;

/** WhatsApp's own limits; the provider passes them through to Meta. */
export const WA_LIMITS = {
    text: 4096,
    quickReplies: 3,
    quickReplyTitle: 20,
    interactiveBody: 1024,
    listRows: 10,
    listSections: 10,
    listRowTitle: 24,
    listRowDescription: 72,
    listRowId: 200,
    listButton: 20,
    listHeader: 60,
    listFooter: 60,
    imageCaption: 1024,
} as const;

type Invalid = { ok: false; code: "invalid"; detail: string };
const invalid = (detail: string): Invalid => ({ ok: false, code: "invalid", detail });
const tooLong = (s: string | undefined, max: number) => (s ?? "").length > max;
const isInvalid = (v: unknown): v is Invalid => !!v && typeof v === "object" && (v as Invalid).ok === false && (v as Invalid).code === "invalid";

/** 233XXXXXXXXX. A local Ghana number (0XXXXXXXXX) gets the country code; anything else must already be international. */
export function toDestination(raw: string): string | null {
    const digits = String(raw ?? "").replace(/\D/g, "");
    if (/^0\d{9}$/.test(digits)) return "233" + digits.slice(1);
    return /^[1-9]\d{10,14}$/.test(digits) ? digits : null;
}

export function shapeQuickReply(m: QuickReply): { interactive: string } | Invalid {
    const text = String(m.text ?? "").trim();
    if (!text || tooLong(text, WA_LIMITS.interactiveBody)) return invalid("text");
    if (!Array.isArray(m.options) || m.options.length === 0) return invalid("no options");
    if (m.options.length > WA_LIMITS.quickReplies) return invalid(`more than ${WA_LIMITS.quickReplies} quick replies`);
    if (m.options.some(o => !String(o ?? "").trim() || tooLong(o, WA_LIMITS.quickReplyTitle))) return invalid("option title");
    const content: Record<string, string> = { text };
    if (m.caption) content.caption = m.caption;
    return { interactive: JSON.stringify({ content, options: m.options.map(title => ({ title })) }) };
}

export function shapeList(m: ListMessage): { interactive: string } | Invalid {
    const body = String(m.body ?? "").trim();
    if (!body || tooLong(body, WA_LIMITS.interactiveBody)) return invalid("body");
    if (!String(m.button ?? "").trim() || tooLong(m.button, WA_LIMITS.listButton)) return invalid("button");
    if (tooLong(m.title, WA_LIMITS.listHeader) || tooLong(m.footer, WA_LIMITS.listFooter)) return invalid("title or footer");
    if (!Array.isArray(m.sections) || m.sections.length === 0 || m.sections.length > WA_LIMITS.listSections) return invalid("sections");
    const rows = m.sections.flatMap(s => s.rows ?? []);
    if (rows.length === 0) return invalid("no rows");
    if (rows.length > WA_LIMITS.listRows) return invalid(`more than ${WA_LIMITS.listRows} list rows`);
    if (m.sections.some(s => tooLong(s.title, WA_LIMITS.listRowTitle))) return invalid("section title");
    if (rows.some(r => !String(r.title ?? "").trim() || tooLong(r.title, WA_LIMITS.listRowTitle)
        || tooLong(r.description, WA_LIMITS.listRowDescription) || !String(r.id ?? "").trim() || tooLong(r.id, WA_LIMITS.listRowId))) {
        return invalid("row");
    }
    const payload: Record<string, unknown> = {
        type: "list",
        title: m.title ?? "",
        body,
        globalButtons: [{ title: m.button }],
        items: m.sections.map(s => ({
            title: s.title,
            options: s.rows.map(r => ({ postbackText: r.id, title: r.title, description: r.description ?? "" })),
        })),
    };
    if (m.footer) payload.footer = m.footer;
    return { interactive: JSON.stringify(payload) };
}

export function shapeTemplate(m: TemplateMessage): Record<string, unknown> | Invalid {
    if (!Number.isInteger(m.templateId) || m.templateId <= 0) return invalid("template id");
    if (m.type !== "text" && !/^https:\/\//i.test(m.link ?? "")) return invalid("media templates need an https link");
    const out: Record<string, unknown> = { template_id: m.templateId, type: m.type };
    // An array, as the docs advise: a value holding a comma would split a joined string.
    if (m.placeholders?.length) out.placeholder = m.placeholders.map(String);
    if (m.type !== "text") out.link = m.link;
    return out;
}

/**
 * The message id. Chatbots Africa answers {"success":true,"message":{"message_id":"wamid…",…}}
 * (seen on a live send, 2026-10-14); the other places are kept as fallbacks.
 */
function messageIdFrom(data: any): string | null {
    const id = data?.message?.message_id ?? data?.message_id ?? data?.messageId ?? data?.wamid ?? data?.data?.message_id ?? data?.data?.wamid
        ?? data?.messages?.[0]?.id ?? data?.data?.messages?.[0]?.id ?? null;
    return id == null ? null : String(id);
}

export type SendRecord = { to: string; body: string; result: MessagingResult; meta?: NotificationMeta };

/** Default recorder: notification_log, like SMS and email. Imported lazily so this module loads without a database. */
async function logToNotificationLog(r: SendRecord): Promise<void> {
    const { buildRows, logNotification } = await import("@/lib/notificationLog");
    await logNotification(buildRows({
        channel: "whatsapp",
        recipients: [r.to],
        body: r.body,
        providerId: r.result.ok ? r.result.messageId : null,
        ok: r.result.ok,
        error: r.result.ok ? null : r.result.code,
        meta: r.meta,
    }));
}

type Deps = {
    apiKey?: string | null;
    fetchImpl?: typeof fetch;
    record?: (r: SendRecord) => Promise<void>;
};

export function createChatbotsAfrica(deps: Deps = {}): MessagingProvider {
    const key = () => (deps.apiKey !== undefined ? deps.apiKey : process.env.CHATBOTS_AFRICA_API_KEY) || null;
    const doFetch = deps.fetchImpl ?? fetch;
    const record = deps.record ?? logToNotificationLog;
    const masked = (d: string) => `***${d.slice(-4)}`;

    async function post(path: string, destination: string, fields: Record<string, unknown>): Promise<MessagingResult> {
        const apikey = key();
        if (!apikey) return { ok: false, code: "not_configured" };
        try {
            const res = await doFetch(`${CHATBOTS_AFRICA_BASE}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ apikey, destination, ...fields }),
                signal: AbortSignal.timeout(TIMEOUT_MS),
            });
            const data = await res.json().catch(() => null);
            if (res.status === 422) {
                console.error("[chatbots-africa] invalid", { path, to: masked(destination), errors: data?.errors ?? null });
                return { ok: false, code: "invalid", detail: data?.errors ?? null };
            }
            if (!res.ok || data?.status === false || data?.success === false || data?.status === "error") {
                console.error("[chatbots-africa] rejected", { path, status: res.status, to: masked(destination), error: data?.message ?? data?.error ?? null });
                return { ok: false, code: "rejected", detail: res.status };
            }
            return { ok: true, messageId: messageIdFrom(data) };
        } catch (err) {
            console.error("[chatbots-africa] network error", { path, to: masked(destination), err: String(err) });
            return { ok: false, code: "network" };
        }
    }

    async function send(path: string, to: string, fields: Record<string, unknown> | Invalid, logBody: string, meta?: NotificationMeta): Promise<MessagingResult> {
        const destination = toDestination(to);
        const result: MessagingResult = !destination ? { ok: false, code: "invalid", detail: "number" }
            : isInvalid(fields) ? fields
            : await post(path, destination, fields);
        // A send that never reached the provider for want of a key is not a send to record.
        if (result.ok || result.code !== "not_configured") {
            await record({ to: destination ?? String(to ?? ""), body: logBody, result, meta }).catch(() => {});
        }
        return result;
    }

    return {
        name: PROVIDER,

        sendText(to, text, meta) {
            const t = String(text ?? "").trim();
            const fields = !t || tooLong(t, WA_LIMITS.text) ? invalid("text") : { message: t };
            return send("/send/message", to, fields, t, meta);
        },

        sendImage(to, imageUrl, caption, meta) {
            const c = String(caption ?? "").trim();
            const fields = !/^https:\/\//i.test(imageUrl ?? "") ? invalid("image url")
                : tooLong(c, WA_LIMITS.imageCaption) ? invalid("caption")
                : { image_url: imageUrl, ...(c ? { caption: c } : {}) };
            return send("/send/image", to, fields, `[image] ${c}`.trim(), meta);
        },

        sendQuickReply(to, message, meta) {
            return send("/send/quick/reply", to, shapeQuickReply(message), `${message.text}\n[${(message.options ?? []).join(" | ")}]`, meta);
        },

        sendList(to, message, meta) {
            return send("/send/list/message", to, shapeList(message), `${message.body}\n[list: ${message.button}]`, meta);
        },

        sendTemplate(to, message, meta) {
            return send("/send/message/template", to, shapeTemplate(message), `[template ${message.templateId}] ${(message.placeholders ?? []).join(" | ")}`, meta);
        },

        async optOut(to) {
            const destination = toDestination(to);
            if (!destination) return { ok: false, code: "invalid", detail: "number" };
            return post("/send/opt/contact", destination, { status: false });
        },

        async balance(): Promise<BalanceResult> {
            const apikey = key();
            if (!apikey) return { ok: false, code: "not_configured" };
            try {
                const res = await doFetch(`${CHATBOTS_AFRICA_BASE}/wallet/balance?apikey=${encodeURIComponent(apikey)}`, {
                    method: "GET",
                    headers: { Accept: "application/json" },
                    signal: AbortSignal.timeout(TIMEOUT_MS),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) {
                    console.error("[chatbots-africa] balance rejected", { status: res.status });
                    return { ok: false, code: "rejected", detail: res.status };
                }
                // Field name undocumented: take the first numeric candidate, keep the raw body for the first real read.
                const n = Number(data?.balance ?? data?.data?.balance ?? data?.wallet_balance ?? data?.credit ?? NaN);
                return { ok: true, balance: Number.isFinite(n) ? n : null, raw: data };
            } catch (err) {
                console.error("[chatbots-africa] balance network error", { err: String(err) });
                return { ok: false, code: "network" };
            }
        },
    };
}
