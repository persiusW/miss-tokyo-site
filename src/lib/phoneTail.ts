// The last 9 digits of a Ghana number: how one number matches across the
// formats orders store it in (0…, +233…, 233…, with or without spaces).
export function last9(phone: unknown): string | null {
    const digits = String(phone ?? "").replace(/\D/g, "");
    return digits.length >= 9 ? digits.slice(-9) : null;
}
