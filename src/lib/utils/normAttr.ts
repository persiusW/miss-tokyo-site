export function normAttr(s: string | null | undefined): string {
    if (s == null) return "null";
    return s.replace(/\s*[—–-]\s*/g, "-").trim().toLowerCase();
}
