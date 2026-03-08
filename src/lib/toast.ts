export type ToastType = "success" | "error" | "info";
export type Toast = { id: string; message: string; type: ToastType };

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

function add(message: string, type: ToastType) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    toasts = [...toasts, { id, message, type }];
    notify();
    setTimeout(() => {
        toasts = toasts.filter(t => t.id !== id);
        notify();
    }, 3500);
}

export const toast = {
    success: (message: string) => add(message, "success"),
    error: (message: string) => add(message, "error"),
    info: (message: string) => add(message, "info"),
};
