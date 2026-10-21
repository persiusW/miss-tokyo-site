// Billing is static by the owner's decision (October 2026): the page shows the
// design with these sample figures until billing is set up. Every number on
// the Billing page comes from here and nowhere else, so connecting it later
// means replacing this one file with real reads. The page says so in a banner.

export const BILLING_PREVIEW = {
    plan: "Studio",
    price: 450,
    period: "month",
    nextPayment: "1 Nov 2026",
    endsOn: "1 Nov",
    endsOnLong: "1 November",
    autoRenew: true,
    method: "MTN Mobile money •••• 4821",
    includes: [
        "Miss Tokyo AI for staff",
        "Ask Miss Tokyo on the shop and WhatsApp",
        "Up to GH₵ 40 of AI use per day",
        "Hosting and support",
    ],
    costs: {
        paystackFees: 1284.6,
        smsSpent: 212,
        smsCredit: 1880,
        whatsappCredit: 64.2,
        whatsappDaysLeft: 2,
        aiUsed: 612.8,
        aiAllowance: 1240,
    },
    history: [
        { no: "MTB-2026-10", date: "1 Oct 2026", desc: "Studio plan · October", amount: 450 },
        { no: "MTB-2026-09", date: "1 Sep 2026", desc: "Studio plan · September", amount: 450 },
        { no: "MTB-2026-08B", date: "19 Aug 2026", desc: "AI use above plan · August", amount: 86.4 },
        { no: "MTB-2026-08", date: "1 Aug 2026", desc: "Studio plan · August", amount: 450 },
    ],
    paymentMethods: [
        { v: "momo", title: "MTN Mobile money •••• 4821", desc: "You approve each payment on your phone." },
        { v: "card", title: "Add a card", desc: "Visa or Mastercard. Charged automatically." },
    ],
} as const;

export const NOT_CONNECTED = "Billing isn't connected yet, so nothing was changed.";
