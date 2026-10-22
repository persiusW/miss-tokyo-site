// The switches Admin Tools › Switches shows, where each is stored, and which
// ask for a confirmation first. One list: the page and setSwitch both read it,
// so nothing outside it can be flipped from here.

export type SwitchDef = {
    key: string;
    label: string;
    help: string;
    store: "store" | "ai" | "billing";
    group: "Admin" | "Payments" | "Assistants" | "Shop";
    /** Confirm before changing, with what happens. */
    danger?: { on: string; off: string };
};

export const SWITCHES = [
    { key: "store.admin_v2", group: "Admin", store: "store", label: "New admin for everyone", help: "The new menu and pages for every staff member.", danger: { on: "Everyone moves to the new admin on their next page load.", off: "Everyone goes back to the old admin pages, except devices previewing the new one." } },
    { key: "store.admin_v2_products", group: "Admin", store: "store", label: "New Products pages", help: "Products, photos and stock in the new product panel." },
    { key: "store.admin_v2_orders", group: "Admin", store: "store", label: "New Orders pages", help: "Packing, sending, refunds and cancelling in the new order panel." },
    { key: "store.admin_v2_till", group: "Admin", store: "store", label: "New POS", help: "Everyone at the counter uses the new POS.", danger: { on: "The counter switches to the new POS on its next page load.", off: "The counter goes back to the old POS on its next page load." } },
    { key: "billing.payout_split_live", group: "Payments", store: "billing", label: "Take the admin share automatically", help: "Every online payment sends the admin share straight to the admin payout account. Off: the site's Paystack split works as before.", danger: { on: "From the next payment, checkout, POS links and invoice links carry the admin share split. Amounts customers pay don't change.", off: "Payments go back to the site's Paystack split. Shares not taken are recorded as owed." } },
    { key: "store.refunds_live", group: "Payments", store: "store", label: "Refunds through Paystack", help: "Card and Mobile money refunds go back to the customer from the order page.", danger: { on: "Refunding an order sends the money back through Paystack straight away.", off: "Refunds are recorded only; staff refund in the Paystack dashboard first." } },
    { key: "store.paystack_sync_enabled", group: "Payments", store: "store", label: "Save Paystack payouts hourly", help: "Payouts and Billing read saved settlements, the same rows Dashttp's Command Centre reads. Off: they ask Paystack live." },
    { key: "store.pos_live_payment_status", group: "Payments", store: "store", label: "Live payment status at the POS", help: "The POS checks Paystack every few seconds after sending a link." },
    { key: "store.maintenance_mode", group: "Shop", store: "store", label: "Shop closed for maintenance", help: "Customers see a “Coming soon” page. The admin, POS and pay links keep working.", danger: { on: "Customers can't browse or buy on the website until this is off.", off: "The shop opens to customers again." } },
    { key: "ai.whatsapp_enabled", group: "Assistants", store: "ai", label: "WhatsApp assistant", help: "Answers WhatsApp messages and hands over when it can't help.", danger: { on: "The assistant starts answering WhatsApp customers.", off: "WhatsApp messages wait for a person in Inbox." } },
    { key: "ai.shop_assistant_enabled", group: "Assistants", store: "ai", label: "Ask Miss Tokyo on the shop", help: "The chat button on every shop page." },
    { key: "ai.dashboard_agent_enabled", group: "Assistants", store: "ai", label: "Miss Tokyo AI for staff", help: "The assistant on every admin page." },
    { key: "ai.whatsapp_status_notifications", group: "Assistants", store: "ai", label: "Order updates on WhatsApp", help: "Paid, packed, on its way and the rest, with the SMS." },
    { key: "ai.whatsapp_choices_enabled", group: "Assistants", store: "ai", label: "Tappable answers", help: "Buttons and lists in WhatsApp chats." },
    { key: "ai.whatsapp_unpaid_nudge_enabled", group: "Assistants", store: "ai", label: "Unpaid order reminder", help: "One WhatsApp reminder for unpaid WhatsApp orders." },
    { key: "ai.whatsapp_restock_alerts_enabled", group: "Assistants", store: "ai", label: "Back-in-stock alerts", help: "The assistant offers to message customers when a piece is back." },
    { key: "ai.whatsapp_returns_enabled", group: "Assistants", store: "ai", label: "Returns and exchanges", help: "The assistant takes return requests, then hands to the team." },
    { key: "ai.mtai_error_log_enabled", group: "Assistants", store: "ai", label: "Error log", help: "Records which error codes people see (System tab)." },
] as const satisfies readonly SwitchDef[];

export type SwitchKey = (typeof SWITCHES)[number]["key"];
