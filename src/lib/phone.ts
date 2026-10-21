// The phone number an order is saved with: digits only, with the country code.
// Ghana numbers in any common form become 233XXXXXXXXX. A number with another
// country code is kept as it is: forcing it to Ghana (the old rule: 233 + the
// last 9 digits) turned +44 7733 384758 into 0733 384 758, a stranger's number,
// and order texts went to them. Pure.

/** Shortest and longest full international numbers (E.164 allows up to 15 digits). */
const INTL_MIN = 10;
const INTL_MAX = 15;

export function normaliseOrderPhone(raw: string | null | undefined): string | null {
    let d = String(raw ?? "").replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);                          // 00 44 … → 44 …
    if (d.startsWith("2330") && d.length === 13) d = `233${d.slice(4)}`;   // +233 024 … (a stray 0 after the code)
    if (d.startsWith("233")) return d.length === 12 ? d : null;
    if (d.startsWith("0") && d.length === 10) return `233${d.slice(1)}`;   // 024 123 4567
    if (d.length === 9) return `233${d}`;                              // 24 123 4567
    if (d.length >= INTL_MIN && d.length <= INTL_MAX && !d.startsWith("0")) return d;   // another country, as given
    return null;
}

/** For people: 0XXXXXXXXX for Ghana, +<digits> for anywhere else. */
export const displayPhone = (p: string) => (/^233\d{9}$/.test(p) ? `0${p.slice(3)}` : `+${p}`);
