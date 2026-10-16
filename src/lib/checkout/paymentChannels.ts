// The ways a customer can pay at checkout, and how we say them. One list, so
// the payment page, the FAQ and Ask Miss Tokyo never disagree: a method is
// only ever offered in words once checkout actually shows it. Pure.
//
// GHS supports mobile money, card and bank transfer. "bank" (direct debit)
// and "ussd" are Nigeria-only, and offering a channel Paystack cannot render
// for this currency left the checkout pane blank next to the channel list: a
// payment page that looks broken, which is where dropped orders come from.
// Mobile money leads, so it is the channel selected by default.
export const CHECKOUT_CHANNELS = ["mobile_money", "card", "bank_transfer"] as const;

const WORDS: Record<(typeof CHECKOUT_CHANNELS)[number], string> = {
    mobile_money: "mobile money",
    card: "cards",
    bank_transfer: "bank transfer",
};

/** "mobile money, cards and bank transfer" (or "or" for a choice). */
export function paymentMethodsText(join: "and" | "or" = "and"): string {
    const words = CHECKOUT_CHANNELS.map(c => WORDS[c]);
    return words.length > 1 ? `${words.slice(0, -1).join(", ")} ${join} ${words[words.length - 1]}` : words.join("");
}
