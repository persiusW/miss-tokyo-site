import { ERRORS, errorText, isCatalogueText, isErrorCode, staffLine, type Audience, type ErrorCode } from "@/lib/errors/catalogue";
import { looksRaw } from "@/lib/errors/looksRaw";

export type ToastType = "success" | "error" | "info";
export type Toast = { id: string; message: string; type: ToastType; code?: string };

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

function add(message: string, type: ToastType, code?: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    toasts = [...toasts, { id, message, type, code }];
    notify();
    setTimeout(() => dismiss(id), type === "error" ? 6000 : 3500);
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
    code: (code: ErrorCode, opts: { audience: Audience }) =>
        add(opts.audience === "staff" ? staffLine(code) : errorText(code, "customer"), "error", code),
    /** An API reply `{ code?, error? }`: the route's calm text wins; the code is appended for staff. */
    fromResponse: (data: unknown, opts: { audience: Audience; fallback?: ErrorCode }) => {
        const d = (data ?? {}) as { code?: unknown };
        add(responseMessage(data, opts.audience, opts.fallback), "error", isErrorCode(d.code) ? d.code : opts.fallback ?? "GEN-00");
    },
};
