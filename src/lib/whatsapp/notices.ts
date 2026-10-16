// Messages we send outside the assistant (order updates, payment reminders)
// are logged as "notice". The assistant never wrote them, so they are not in
// its chat; when the customer answers one, it is put in front of their message
// as "[We messaged you: "…"]", from our own records. Pure.

export const NOTICE_TYPE = "notice";
const MAX_NOTICE = 300;

export type LogRow = { direction: string; message_type: string | null; content: string | null };

/**
 * The notice the customer is answering, from the conversation's latest
 * messages (newest first): the first message of ours after their own recent
 * messages, if it is a notice. Anything the assistant said since means the
 * notice was already answered.
 */
export function unseenNotice(newestFirst: LogRow[]): string | null {
    const ours = newestFirst.find(r => r.direction === "outbound");
    if (!ours || ours.message_type !== NOTICE_TYPE) return null;
    const text = String(ours.content ?? "").replace(/\s+/g, " ").replace(/"/g, "'").trim().slice(0, MAX_NOTICE);
    return text || null;
}

export function withNotice(notice: string, text: string): string {
    return `[We messaged you: "${notice}"]\n${text}`;
}
