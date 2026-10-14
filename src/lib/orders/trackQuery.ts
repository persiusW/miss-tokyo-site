// How an order lookup's inputs are cleaned. Shared by /track and the shop chat
// so a reference that works in one works in the other.
export type TrackQuery = { ref: string | null; email: string | null; phone: string | null };

export function cleanTrackQuery(raw: { ref?: unknown; email?: unknown; phone?: unknown }): TrackQuery {
    const upper = String(raw.ref ?? "").trim().toUpperCase();
    // An 8-character run of hex is the reference; "#", spaces and words around it go.
    const runs = upper.replace(/\s+/g, "").match(/[A-F0-9]{8,}/g) ?? [];
    const exact = runs.find(r => r.length === 8);
    const joined = upper.replace(/[^A-F0-9]/g, "");
    const ref = exact ?? (joined.length === 8 ? joined : null);
    const email = String(raw.email ?? "").trim().toLowerCase();
    const phone = String(raw.phone ?? "").trim().replace(/\D/g, "");
    return { ref, email: email.includes("@") ? email : null, phone: phone.length >= 9 ? phone : null };
}
