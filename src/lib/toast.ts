import { ERRORS, errorText, isCatalogueText, isErrorCode, staffLine, type Audience, type ErrorCode } from "@/lib/errors/catalogue";
import { looksRaw } from "@/lib/errors/looksRaw";

export type ToastType = "success" | "error" | "info";
/** The sale a payment error is about, for "Ask Miss Tokyo AI". */
export type AskTarget = { code: string; posSessionId?: string; orderId?: string; saleKey?: string };
export type Toast = { id: string; message: string; type: ToastType; code?: string; ask?: AskTarget };

// Registered by the dashboard's Miss Tokyo AI panel while help on payment
// errors is switched on; null everywhere else (so customers never see it).
// The handler returns false when the assistant is busy, so the toast stays.
let askHandler: ((ask: AskTarget) => boolean) | null = null;
export function setAskHandler(fn: ((ask: AskTarget) => boolean) | null) {
    askHandler = fn;
    toasts = [...toasts]; // new snapshot, so toasts on screen gain or lose the button
    notify();
}
export function getAskHandler() { return askHandler; }

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners: Set<Listener> = new Set();

function notify() {
    listeners.forEach(l => l(toasts));
}

export function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getSnapshot(): Toast[] {
    return toasts;
}

export function dismiss(id: string) {
    toasts = toasts.filter(t => t.id !== id);
    notify();
}

function add(message: string, type: ToastType, code?: string, ask?: AskTarget) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const keepAsk = ask && code && isErrorCode(code) && (ERRORS[code] as { aiHelp?: boolean }).aiHelp ? { ...ask, code } : undefined;
    toasts = [...toasts, { id, message, type, code, ask: keepAsk }];
    notify();
    setTimeout(() => dismiss(id), keepAsk ? 12000 : type === "error" ? 6000 : 3500);
}

/** Backstop: technical text never reaches the screen. The original goes to the console. */
export function calmMessage(message: string): string {
    if (isCatalogueText(message) || !looksRaw(message)) return message;
    console.error("[toast] hid raw message:", message);
    return ERRORS["GEN-00"].customer;
}

/** The text for an API error reply: the route's calm text, else the catalogue's; staff get the code. */
export function responseMessage(data: unknown, audience: Audience, fallback: ErrorCode = "GEN-00"): string {
    const d = (data ?? {}) as { code?: unknown; error?: unknown };
    const code: ErrorCode = isErrorCode(d.code) ? d.code : fallback;
    const text = typeof d.error === "string" && !looksRaw(d.error) ? d.error : errorText(code, audience);
    return audience === "staff" && isErrorCode(d.code) && !text.endsWith(`(${code})`) ? `${text} (${code})` : text;
}

export const toast = {
    success: (message: string) => add(message, "success"),
    error: (message: string) => add(calmMessage(message), "error"),
    info: (message: string) => add(message, "info"),
    /** A known error by code. Staff see the code. */
    code: (code: ErrorCode, opts: { audience: Audience; ask?: Omit<AskTarget, "code"> }) =>
        add(opts.audience === "staff" ? staffLine(code) : errorText(code, "customer"), "error", code, opts.audience === "staff" && opts.ask ? { code, ...opts.ask } : undefined),
    /** An API reply `{ code?, error? }`: the route's calm text wins; the code is appended for staff. */
    fromResponse: (data: unknown, opts: { audience: Audience; fallback?: ErrorCode; ask?: Omit<AskTarget, "code"> }) => {
        const d = (data ?? {}) as { code?: unknown };
        const code = isErrorCode(d.code) ? d.code : opts.fallback ?? "GEN-00";
        add(responseMessage(data, opts.audience, opts.fallback), "error", code, opts.audience === "staff" && opts.ask ? { code, ...opts.ask } : undefined);
    },
};
