// Meta WhatsApp Cloud API: send one message from the shop's number.
// Server-only. Never expose this without an auth check in front of it — an
// open sender is a spam relay that gets the number banned.

/** Graph API version. The same one GlowBook's integration targets. */
export const GRAPH_API_VERSION = "v25.0";

export type WhatsAppSendInput =
    | { to: string; type: "text"; text: string }
    | { to: string; type: "image"; imageUrl: string; caption?: string };

export type WhatsAppSendResult =
    | { ok: true; messageId: string | null }
    | { ok: false; code: "not_configured" | "invalid" | "rejected" | "network"; detail?: unknown };

/** Digits only, 9-15 long (E.164 without the +). */
export function normaliseRecipient(to: string): string | null {
    const digits = String(to ?? "").replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 15 ? digits : null;
}

export async function sendWhatsApp(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
    const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!phoneNumberId || !accessToken) return { ok: false, code: "not_configured" };

    const to = normaliseRecipient(input.to);
    if (!to) return { ok: false, code: "invalid" };

    let message: Record<string, unknown>;
    if (input.type === "image") {
        if (!/^https:\/\//i.test(input.imageUrl ?? "")) return { ok: false, code: "invalid" };
        message = { type: "image", image: { link: input.imageUrl, caption: (input.caption ?? "").slice(0, 1024) } };
    } else {
        const text = String(input.text ?? "").trim();
        if (!text || text.length > 4096) return { ok: false, code: "invalid" };
        message = { type: "text", text: { body: text, preview_url: false } };
    }

    try {
        const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ messaging_product: "whatsapp", to, ...message }),
            signal: AbortSignal.timeout(15_000),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            console.error("[whatsapp/send] rejected", { status: res.status, to: `***${to.slice(-4)}`, error: data?.error ?? data });
            return { ok: false, code: "rejected", detail: data?.error?.code };
        }
        return { ok: true, messageId: data?.messages?.[0]?.id ?? null };
    } catch (err) {
        console.error("[whatsapp/send] network error", { to: `***${to.slice(-4)}`, err });
        return { ok: false, code: "network" };
    }
}
