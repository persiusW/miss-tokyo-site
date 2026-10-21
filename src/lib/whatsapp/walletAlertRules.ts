// When to text about the Chatbots Africa wallet (it pays for every WhatsApp
// message; empty, replies and order updates stop). Pure.

/** Checked once an hour: in the first sweep (every 5 minutes) of each hour. */
export const isWalletCheckMinute = (now: Date) => now.getUTCMinutes() < 5;

export function walletIsLow(balance: number | null, thresholdGhs: number): boolean {
    return thresholdGhs > 0 && balance !== null && Number.isFinite(balance) && balance < thresholdGhs;
}

export function walletAlertText(balance: number, thresholdGhs: number): string {
    return `Miss Tokyo WhatsApp: the Chatbots Africa wallet is low (GHS ${balance.toFixed(2)}, alert below GHS ${thresholdGhs.toFixed(2)}). Top it up so WhatsApp replies and order updates keep sending.`;
}
