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

export const toast = {
    success: (message: string) => add(message, "success"),
    error: (message: string) => add(calmMessage(message), "error"),
    info: (message: string) => add(message, "info"),
    /** A known error by code. Staff see the code. */
    code: (code: ErrorCode, opts: { audience: Audience }) =>
        add(opts.audience === "staff" ? staffLine(code) : errorText(code, "customer"), "error", code),
    /** An API reply `{ code?, error? }`: the route's calm text wins; the code is appended for staff. */
    fromResponse: (data: unknown, opts: { audience: Audience; fallback?: ErrorCode }) => {
        const d = (data ?? {}) as { code?: unknown; error?: unknown };
        const code: ErrorCode = isErrorCode(d.code) ? d.code : opts.fallback ?? "GEN-00";
        const text = typeof d.error === "string" && !looksRaw(d.error) ? d.error : errorText(code, opts.audience);
        add(opts.audience === "staff" && isErrorCode(d.code) && !text.endsWith(`(${code})`) ? `${text} (${code})` : text, "error", code);
    },
};
