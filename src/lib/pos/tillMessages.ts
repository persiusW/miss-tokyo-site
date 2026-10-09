// What the till tells staff after Send Link / Cash. Plain wording only: the
// SMS and email providers' own error text stays in the server logs and
// notification_log, never on the till.

export type Delivery = {
    email?: "sent" | "failed" | "no_email";
    sms?: string;
    smsError?: string;
    emailError?: string;
} | null | undefined;

export const TILL_GENERIC = "Something happened. Please try again shortly.";
export const TILL_SERVER_UNREACHABLE = "The till couldn't reach the server. Please try again.";

/** The panel heading for a link sale. Not for cash or gift-card completions. */
export function deliveryHeadline(d: Delivery): { text: string; tone: "ok" | "warn" } {
    const emailOk = d?.email === "sent";
    const smsOk = d?.sms === "sent";
    if (emailOk && smsOk) return { text: "Sent by SMS and email", tone: "ok" };
    if (smsOk) return { text: "Sent by SMS", tone: "ok" };
    if (emailOk) return { text: "Sent by email", tone: "ok" };
    return { text: "Not sent — copy the link and share it", tone: "warn" };
}

export function deliveryToast(d: Delivery): { type: "success" | "error"; message: string } {
    const smsOk = d?.sms === "sent";
    if (d?.email === "no_email") {
        return smsOk
            ? { type: "success", message: "Payment link sent by SMS" }
            : { type: "error", message: "The SMS didn't go out and there's no email on file. Copy the link below and share it." };
    }
    if (d?.email === "sent" && smsOk) return { type: "success", message: "Payment link sent by email and SMS" };
    if (d?.email === "sent") return { type: "error", message: "Email sent, but the SMS didn't go out. Copy the link below and share it." };
    if (smsOk) return { type: "error", message: "SMS sent, but the email didn't go out." };
    return { type: "error", message: "Neither the SMS nor the email went out. Copy the link below and share it." };
}

export function completionBanner(via: "cash" | "gift_card", hadContact: boolean): { title: string; note: string } {
    if (via === "cash") {
        return {
            title: "Cash received",
            note: hadContact ? "Receipt sent to the customer." : "No receipt sent — no phone or email on file.",
        };
    }
    return { title: "Paid in full by gift card", note: "Nothing to collect. Receipt sent to the customer." };
}
