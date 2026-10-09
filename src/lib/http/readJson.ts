// Parses a fetch Response only when it really is JSON. A timed-out function or
// a proxy error page returns HTML, and res.json() on that throws
// "Unexpected token '<'" — which used to end up on the till.
export async function readJson<T = unknown>(res: Response): Promise<{ data: T | null; isJson: boolean }> {
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("application/json")) return { data: null, isJson: false };
    try {
        return { data: (await res.json()) as T, isJson: true };
    } catch {
        return { data: null, isJson: false };
    }
}
