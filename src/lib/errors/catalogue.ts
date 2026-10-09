// Every error the app can show, with one stable code each. Staff see the text
// plus the code, so they can quote it; customers see their own text only.
// Codes are never reused. Wording approved in spec B (2026-10-09).

export type ErrorArea = "pay" | "pos" | "sms" | "email" | "stock" | "order" | "auth" | "net" | "gen";
export type ErrorDef = { area: ErrorArea; staff: string; customer: string; steps?: string[]; aiHelp?: boolean };

const GENERIC_CUSTOMER = "Something happened. Please try again shortly.";

export const ERRORS = {
    "PAY-01": { area: "pay", aiHelp: true,
        staff: "Paystack isn't answering right now. Please try again in a minute.",
        customer: "We couldn't reach our payment provider. Please try again in a minute.",
        steps: ["Wait a minute, then send the link again.", "If it keeps happening, the customer can pay with card or another mobile money network on a new link."] },
    "PAY-02": { area: "pay", aiHelp: true,
        staff: "Paystack didn't create the payment link. Please check the details and try again.",
        customer: "We couldn't start your payment. Please check your details and try again.",
        steps: ["Check the customer's phone and email, then send the link again."] },
    "PAY-03": { area: "pay",
        staff: "Online payments aren't set up. Please tell the admin.",
        customer: "Online payment isn't available right now. Please try again later." },
    "PAY-04": { area: "pay", aiHelp: true,
        staff: "The payment was declined. Nothing was charged.",
        customer: "Your payment didn't go through, so you haven't been charged. You can try again, or pay with card or another mobile money network.",
        steps: ["Ask the customer to check they have enough balance and approve the prompt.", "Send the same link again."] },
    "PAY-05": { area: "pay", aiHelp: true,
        staff: "The payment hasn't been completed yet. The customer may still be approving it.",
        customer: "We haven't received confirmation of your payment yet. If you're approving it on your phone, finish there.",
        steps: ["Ask the customer to check their phone for the mobile money prompt.", "Wait a moment before sending a new link, so they aren't charged twice."] },
    "PAY-06": { area: "pay", aiHelp: true,
        staff: "This payment link has expired. Send a new one.",
        customer: "This payment link has expired.",
        steps: ["Send a new link from the till."] },
    "PAY-07": { area: "pay", staff: "This sale has already been paid.", customer: "This order has already been paid." },
    "POS-01": { area: "pos", staff: "Some items are no longer in stock. Check the cart and try again.", customer: GENERIC_CUSTOMER },
    "POS-02": { area: "pos", staff: "That discount or gift card can't be used right now. Remove it and try again.", customer: GENERIC_CUSTOMER },
    "POS-03": { area: "pos", staff: "This sale was closed. Start a new order.", customer: GENERIC_CUSTOMER },
    "SMS-01": { area: "sms", staff: "The SMS didn't go out. Copy the link and share it.", customer: GENERIC_CUSTOMER },
    "EML-01": { area: "email", staff: "The email didn't go out.", customer: GENERIC_CUSTOMER },
    "STK-01": { area: "stock", staff: "Stock changed while checking out. Please review the cart.", customer: "Stock changed while you were checking out. Please review your bag." },
    "ORD-01": { area: "order", staff: "The order couldn't be created. Nothing was charged. Please try again.", customer: "We couldn't place your order. You haven't been charged. Please try again." },
    "AUTH-01": { area: "auth", staff: "Your sign-in expired. Please sign in again.", customer: "Please sign in again." },
    "NET-01": { area: "net", staff: "Couldn't reach the server. Please try again.", customer: "We couldn't connect. Please check your connection and try again." },
    "GEN-00": { area: "gen", staff: "Something happened. Please try again shortly.", customer: GENERIC_CUSTOMER },
} satisfies Record<string, ErrorDef>;

export type ErrorCode = keyof typeof ERRORS;
export type Audience = "staff" | "customer";

export function isErrorCode(c: unknown): c is ErrorCode {
    return typeof c === "string" && Object.prototype.hasOwnProperty.call(ERRORS, c);
}

export function errorText(code: string, audience: Audience): string {
    const d: ErrorDef = isErrorCode(code) ? ERRORS[code] : ERRORS["GEN-00"];
    return audience === "staff" ? d.staff : d.customer;
}

export function staffLine(code: ErrorCode): string {
    return `${ERRORS[code].staff} (${code})`;
}

export function errorBody(code: ErrorCode, audience: Audience): { code: ErrorCode; error: string } {
    return { code, error: errorText(code, audience) };
}

const KNOWN_TEXTS = new Set<string>(
    (Object.keys(ERRORS) as ErrorCode[]).flatMap(c => [ERRORS[c].staff, ERRORS[c].customer, staffLine(c)]),
);
export function isCatalogueText(s: string): boolean { return KNOWN_TEXTS.has(s); }

/** What the AI tells staff when an order fails: hand-written stock and
 *  validation lines are kept (they say which item to fix), with the code. */
export function checkoutErrorLine(code: string, error: string): string {
    const c = fromCheckoutCode(code);
    if (code === "invalid" || !c) return error;
    if (code === "unavailable") return `${error} (${c})`;
    return staffLine(c);
}

/** createCheckoutOrder's own codes → catalogue codes. "invalid" keeps its hand-written text. */
export function fromCheckoutCode(c: string): ErrorCode | null {
    switch (c) {
        case "gateway": return "PAY-01";
        case "refused": return "PAY-02";
        case "payments_unconfigured": return "PAY-03";
        case "unavailable": return "STK-01";
        case "internal": return "ORD-01";
        default: return null;
    }
}
