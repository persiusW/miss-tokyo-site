// Fetch helpers for the Inbox: never throw, always hand back the parsed body so
// the calm text the route chose reaches toast.fromResponse.
export type Res<T = any> = { ok: boolean; status: number; data: T | null };

export async function call<T = any>(url: string, init?: RequestInit): Promise<Res<T>> {
    try {
        const r = await fetch(url, { cache: "no-store", ...init });
        return { ok: r.ok, status: r.status, data: await r.json().catch(() => null) };
    } catch {
        return { ok: false, status: 0, data: null };
    }
}

export const send = (method: string, body?: unknown): RequestInit => ({
    method, headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
