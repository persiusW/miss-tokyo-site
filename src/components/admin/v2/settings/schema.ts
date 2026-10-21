// Every Settings section, its rows and where each row is stored. Pure: the
// page, the search, the live summaries and the save action all read this one
// list, so the server validates exactly what the page shows.
//
// A row key is "<part>.<column>":
//   store.*    store_settings (id 'default')       biz.*  business_settings (id 'default')
//   site.*     site_settings (id 'singleton')      push.* push_notification_settings
//   ai.*       ai_settings key                     meta.* site_metadata for "/"
//   cats.wholesale  ids of the wholesale-only categories
// Keys starting with "_" are display rows (status, links, panels): never saved.
import { ghs0 } from "@/components/admin/ui/format";

export type Val = string | boolean | string[];
export type Values = Record<string, Val>;

export type RowType =
    | "text" | "textarea" | "switch" | "money" | "pct" | "num" | "select" | "seg" | "radio"
    | "tags" | "cats" | "range" | "head"
    | "status" | "link" | "riders" | "messages" | "logo" | "aiuse" | "rss" | "payout" | "push-device" | "push-template"
    | "legacy-content" | "assistant-cards" | "account";

export type Row = {
    k: string;
    label: string;
    help?: string;
    type: RowType;
    /** select / seg / radio choices: [value, label, description?] */
    opts?: [string, string, string?][];
    /** range: the "up to" key paired with k ("from"). */
    k2?: string;
    placeholder?: string;
    max?: number;
    /** Only the admin role sees and saves it (checked on the server too). */
    adminOnly?: boolean;
    /** Switched off (greyed) while this switch key is off. */
    needs?: string;
    /** status rows: the badge text and tone come from the page context. */
    status?: (ctx: Ctx) => { text: string; tone: "ok" | "neutral" | "warn" };
    /** link rows: where Open goes. */
    href?: (ctx: Ctx) => string | null;
    /** search: extra words people might type. */
    words?: string;
    /** data-assist anchor kept from the old Settings page. */
    assist?: string;
};

export type Group = "Store" | "Selling" | "Customers" | "Online store" | "Team" | "Money" | "Admin" | "Your account";

export type Section = {
    k: string;
    g: Group;
    t: string;
    rows: Row[];
    sum: (v: Values, ctx: Ctx) => string;
    /** Any staff role may open it (their own account). */
    mine?: boolean;
    /** Hidden unless this is true for the viewer/page. */
    show?: (ctx: Ctx) => boolean;
    /** data-assist anchor on the section's card. */
    assist?: string;
};

/** Facts the page knows that aren't settings: counts, config, other areas. */
export type Ctx = {
    role: "admin" | "owner" | "sales_staff";
    domain: string;
    paystackConnected: boolean;
    riders: { total: number; active: number };
    staffCount: number;
    staffHref: string;
    billingHref: string | null;
    contentOn: boolean;
    me: { name: string; email: string };
};

const on = (b: Val | undefined) => (b === true ? "on" : "off");
const str = (v: Val | undefined) => (typeof v === "string" ? v : "");

export const LAYOUT_COLS: [string, string][] = [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]];

export const SECTIONS: Section[] = [
    {
        g: "Store", k: "profile", t: "Store details",
        sum: v => [str(v["biz.business_name"]), str(v["biz.email"])].filter(Boolean).join(" · ") || "Name, contact and social links",
        rows: [
            { k: "biz.business_name", label: "Store name", help: "Shown in the shop header, emails and receipts.", type: "text", max: 80 },
            { k: "biz.email", label: "Contact email", help: "Customers reply to this address. Order emails come from it.", type: "text", placeholder: "hello@misstokyo.shop" },
            { k: "biz.contact", label: "Contact phone", help: "Shown on the contact page and receipts.", type: "text", placeholder: "+233 …" },
            { k: "biz.address", label: "Address", help: "Shown on receipts and the contact page.", type: "textarea" },
            { k: "biz.logo_url", label: "Logo", help: "Used on receipts and invoices.", type: "logo" },
            { k: "site.store_tagline", label: "Tagline", help: "A short line about the shop. Up to 160 characters.", type: "text", max: 160 },
            { k: "site.store_description", label: "About the shop", help: "A sentence or two used where the shop describes itself.", type: "textarea" },
            { k: "_social", label: "Social links", help: "Linked from the shop footer. Leave one blank to hide it.", type: "head" },
            { k: "site.social_instagram", label: "Instagram", type: "text", placeholder: "https://", words: "social" },
            { k: "site.social_tiktok", label: "TikTok", type: "text", placeholder: "https://", words: "social" },
            { k: "site.social_facebook", label: "Facebook", type: "text", placeholder: "https://", words: "social" },
            { k: "site.social_twitter", label: "X (Twitter)", type: "text", placeholder: "https://", words: "social twitter" },
            { k: "site.social_pinterest", label: "Pinterest", type: "text", placeholder: "https://", words: "social" },
            { k: "site.social_youtube", label: "YouTube", type: "text", placeholder: "https://", words: "social" },
            { k: "site.social_snapchat", label: "Snapchat", type: "text", placeholder: "https://", words: "social" },
            { k: "site.social_threads", label: "Threads", type: "text", placeholder: "https://", words: "social" },
            { k: "site.instagram_access_token", label: "Instagram feed key", help: "Shows your live Instagram posts on the home page. Leave blank to show placeholder tiles.", type: "text", words: "token instagram feed" },
        ],
    },
    {
        g: "Store", k: "location", t: "Location and pickup",
        sum: v => (v["store.enable_store_pickup"] === true ? `Pickup on · ready in ${str(v["site.pickup_estimated_wait"]) || "24 hours"}` : "Pickup off"),
        rows: [
            { k: "store.enable_store_pickup", label: "Let customers collect orders", help: "Adds store pickup at checkout, free of charge.", type: "switch", words: "pickup collect" },
            { k: "site.pickup_address", label: "Pickup address", help: "Sent in the pickup messages and receipts. Blank uses the store address.", type: "textarea", needs: "store.enable_store_pickup" },
            { k: "site.pickup_contact_phone", label: "Pickup phone", help: "Blank uses the contact phone.", type: "text", needs: "store.enable_store_pickup" },
            { k: "site.pickup_estimated_wait", label: "Usually ready in", help: "Shown to customers after they place a pickup order, for example “24 hours” or “Same day”.", type: "text", needs: "store.enable_store_pickup" },
            { k: "site.pickup_instructions", label: "Pickup instructions", help: "Appears word for word in pickup emails and receipts. Up to 500 characters.", type: "textarea", max: 500, needs: "store.enable_store_pickup" },
        ],
    },
    {
        g: "Store", k: "policies", t: "Policies",
        show: c => c.contentOn,
        sum: () => "Shipping, refund, privacy and terms pages",
        rows: [
            { k: "_pol", label: "Policy pages", help: "Edit the text in Content › Pages. Links show in the shop footer and at checkout.", type: "link", href: c => (c.contentOn ? "/content/pages" : null) },
        ],
    },
    {
        g: "Selling", k: "checkout", t: "Checkout",
        // The processing fee moved to Admin tools › Fees (admin only, owner decision 2026-10-21).
        sum: v => (v["store.checkout_undo_removed_enabled"] === true ? "Customers can undo a removed item" : "Removed items stay removed"),
        rows: [
            { k: "_fee", label: "Processing fee", help: "Set by your developer. It's added to every online order, invoice and pay link, and shown at checkout.", type: "status", status: () => ({ text: "Set by your developer", tone: "neutral" }), words: "platform fee service charge processing" },
            { k: "store.checkout_undo_removed_enabled", label: "Let customers undo a removed item", help: "When something sells out while they're checking out, it's removed. This lets them put it back if it's free again. It re-checks stock, so a sold-out piece never comes back.", type: "switch", words: "undo" },
        ],
    },
    {
        g: "Selling", k: "payments", t: "Payments",
        sum: (v, c) => `Paystack ${c.paystackConnected ? "connected" : "not set up"} · pay links hold stock ${str(v["store.pos_hold_minutes"]) || "15"} min`,
        rows: [
            { k: "_ps", label: "Paystack", help: "Card and Mobile money for the shop, invoices and pay links.", type: "status", status: c => (c.paystackConnected ? { text: "Connected", tone: "ok" } : { text: "Not set up", tone: "warn" }) },
            { k: "_cash", label: "Cash at the POS", help: "Cash is always a payment option at the POS. It's counted at close.", type: "status", status: () => ({ text: "Always on", tone: "neutral" }) },
            { k: "store.pos_hold_minutes", label: "Pay links hold the stock for", help: "Nobody else can buy the items until the link is paid or expires. The same time is shown in the customer's email and SMS.", type: "select", opts: [["15", "15 minutes"], ["30", "30 minutes"], ["45", "45 minutes"]], assist: "settings.pos-hold", words: "pos POS hold link" },
            { k: "store.pos_live_payment_status", label: "Show live payment status at the POS", help: "After sending a link, the POS checks Paystack every few seconds and shows Waiting, Paid or Declined.", type: "switch", words: "pos till" },
        ],
    },
    {
        g: "Selling", k: "delivery", t: "Shipping and delivery", assist: "settings.delivery-fees",
        sum: v => (v["store.delivery_fees_enabled"] === true
            ? `${ghs0(str(v["store.delivery_fee_accra"]) || 0)} in Accra · ${ghs0(str(v["store.delivery_fee_outside"]) || 0)} outside`
            : "Delivery charges off"),
        rows: [
            { k: "store.delivery_fees_enabled", label: "Charge for delivery", help: "Takes effect on the next order. When off, delivery is free everywhere and checkout looks as it did before.", type: "switch", words: "delivery fee shipping" },
            { k: "store.delivery_fee_accra", label: "Within Greater Accra", help: "Door-to-door by one of your riders.", type: "money", needs: "store.delivery_fees_enabled", words: "delivery fee" },
            { k: "store.delivery_fee_outside", label: "Outside Accra", help: "Bus parcel to the nearest station. 0 charges nothing for this zone. Pickup and deliveries outside Ghana are never charged.", type: "money", needs: "store.delivery_fees_enabled", words: "delivery fee" },
            { k: "_riders", label: "Riders", help: "Who can be assigned to deliveries and gets the delivery text.", type: "riders", words: "dispatch" },
        ],
    },
    {
        g: "Selling", k: "taxes", t: "Taxes",
        sum: v => {
            const r = Number(str(v["biz.tax_rate"])) || 0;
            return r > 0 ? `No tax at checkout · ${r}% on new invoices` : "No tax added at checkout";
        },
        rows: [
            { k: "_tax", label: "Tax at checkout", help: "The shop doesn't add VAT or levies to prices. Prices you enter are what customers pay. Talk to your accountant before changing this; it's set up by your developer.", type: "status", status: () => ({ text: "Not collected", tone: "neutral" }), words: "vat" },
            { k: "biz.tax_rate", label: "Tax on new invoices", help: "The rate filled in when you create an invoice or quotation. You can change it on each one. 0 adds no tax.", type: "pct", words: "vat invoice" },
        ],
    },
    {
        g: "Selling", k: "wholesale", t: "Wholesale",
        sum: v => (v["store.wholesale_enabled"] === true
            ? `On · tiers from ${str(v["store.wholesale_tier_1_min"])}, ${str(v["store.wholesale_tier_2_min"])} and ${str(v["store.wholesale_tier_3_min"])} pieces`
            : "Off"),
        rows: [
            { k: "store.wholesale_enabled", label: "Wholesale prices", help: "Customers you give wholesale access see tier prices on every product.", type: "switch", words: "b2b" },
            { k: "store.wholesale_tier_1_min", k2: "store.wholesale_tier_1_max", label: "Tier 1", help: "Pieces in one order.", type: "range", needs: "store.wholesale_enabled" },
            { k: "store.wholesale_tier_2_min", k2: "store.wholesale_tier_2_max", label: "Tier 2", help: "Pieces in one order.", type: "range", needs: "store.wholesale_enabled" },
            { k: "store.wholesale_tier_3_min", k2: "store.wholesale_tier_3_max", label: "Tier 3", help: "Pieces in one order.", type: "range", needs: "store.wholesale_enabled" },
            { k: "cats.wholesale", label: "Wholesale-only categories", help: "Products only in these categories are hidden from retail customers. Tap a category to add or remove it.", type: "cats" },
        ],
    },
    {
        g: "Customers", k: "accounts", t: "Customer accounts",
        sum: () => "Account offered after the first order",
        rows: [
            { k: "_claim", label: "Account after the first order", help: "Every paid order creates or links a customer account. The confirmation email includes a link to set a password and see past orders.", type: "status", status: () => ({ text: "Always on", tone: "ok" }), words: "claim password" },
            { k: "_setupmsg", label: "Account set-up email", help: "Edit its wording in Messages to customers.", type: "link", href: () => "/settings/notifications" },
        ],
    },
    {
        g: "Customers", k: "notifications", t: "Messages to customers",
        sum: v => `Email and SMS · WhatsApp updates ${on(v["ai.whatsapp_status_notifications"])}`,
        rows: [
            { k: "_msgs", label: "Order messages", help: "Sent automatically when an order reaches each step. Tap one to edit its email, SMS and WhatsApp template.", type: "messages", words: "email sms template confirmation shipped cancelled" },
            { k: "ai.whatsapp_status_notifications", label: "Order updates on WhatsApp", help: "Paid, packed, on its way, ready for pickup, delivered and cancelled, sent with the SMS. Customers who reply STOP get none.", type: "switch" },
            { k: "ai.whatsapp_unpaid_nudge_enabled", label: "Unpaid order reminder", help: "One WhatsApp message 30 to 60 minutes after an order placed in a WhatsApp chat goes unpaid, offering a new Pay now link. Not sent to customers who replied STOP or who are talking to a person.", type: "switch", words: "nudge" },
            { k: "ai.whatsapp_restock_alerts_enabled", label: "Back-in-stock alerts", help: "When a piece is sold out, the assistant offers to message the customer when it's back, and sends that message once it is in stock (checked hourly).", type: "switch", words: "restock" },
            { k: "ai.whatsapp_restock_template_id", label: "Back-in-stock template id", help: "The approved back_in_stock template from Chatbots Africa. Needed for alerts more than 24 hours after the customer's last message. Blank: those wait until they message again.", type: "text", needs: "ai.whatsapp_restock_alerts_enabled", placeholder: "From Chatbots Africa", words: "restock" },
        ],
    },
    {
        g: "Customers", k: "assistants", t: "Assistants",
        sum: v => `Shop ${on(v["ai.shop_assistant_enabled"])} · WhatsApp ${on(v["ai.whatsapp_enabled"])} · ${ghs0(str(v["ai.daily_spend_cap_ghs"]) || 0)} a day`,
        rows: [
            { k: "ai.shop_assistant_enabled", label: "Ask Miss Tokyo on the shop", help: "A chat button on every shop page that finds products, explains delivery and returns, tracks an order and takes an order with a Pay now link. It never offers cash.", type: "switch", words: "ai chat" },
            { k: "ai.whatsapp_enabled", label: "WhatsApp assistant", help: "Answers WhatsApp messages and hands over to Inbox when it can't help.", type: "switch", words: "ai agent" },
            { k: "ai.dashboard_agent_enabled", label: "Miss Tokyo AI for staff", help: "The assistant for staff on every admin page.", type: "switch", words: "ai" },
            { k: "ai.shop_assistant_daily_messages_per_visitor", label: "Messages per visitor per day", help: "Stops one person using up the daily limit. 1 to 200.", type: "num" },
            { k: "ai.daily_spend_cap_ghs", label: "Daily AI spending limit", help: "Shared by every assistant. They stop for the day when it's reached, and staff see a notice. Resets at midnight, Ghana time.", type: "money", words: "cap budget" },
            { k: "_aiuse", label: "AI use", help: "Today's spend against the daily limit, and this calendar month so far.", type: "aiuse", words: "spend cost month" },
            { k: "ai.shop_assistant_cap_share_pct", label: "Shop assistant's share of the daily limit", help: "The most the shop chat can use of the daily limit, so staff and WhatsApp keep the rest.", type: "pct", words: "cap share" },
            { k: "ai.shop_whatsapp_number", label: "Shop WhatsApp number", help: "Where the shop chat's “Talk to us” button goes. Blank uses the store phone.", type: "text", placeholder: "233…", words: "phone" },
            { k: "_wa", label: "WhatsApp handover and alerts", type: "head" },
            { k: "ai.whatsapp_handoff_number", label: "Send chats that need a person to", help: "They get the customer, the reason, recent messages and a link to reply, by WhatsApp and SMS. Blank uses the shop's WhatsApp number.", type: "text", placeholder: "233…", words: "handoff" },
            { k: "ai.whatsapp_handoff_template_id", label: "Handover template id", help: "The approved team_chat_alert template. WhatsApp only delivers free text to a number that messaged the shop in the last 24 hours; with this set, the template goes instead and the SMS has the details.", type: "text", placeholder: "From Chatbots Africa", words: "handoff" },
            { k: "ai.whatsapp_wallet_alert_number", label: "Send wallet and AI budget alerts to", help: "By SMS, at most once a day each: the wallet running low, and AI spend reaching 80% and 100% of the daily limit. Blank uses the shop's WhatsApp number.", type: "text", placeholder: "233…" },
            { k: "ai.whatsapp_wallet_alert_ghs", label: "Wallet alert below", help: "Checked hourly. 0 turns it off.", type: "money", words: "wallet chatbots" },
            { k: "ai.whatsapp_choices_enabled", label: "Tappable answers", help: "The assistant asks with buttons or a list (size, colour, which piece, delivery or pickup), so customers tap instead of typing.", type: "switch" },
            { k: "ai.whatsapp_returns_enabled", label: "Returns and exchanges", help: "The assistant explains the returns policy, confirms the order, asks what's wrong, then passes the chat to your team with a summary.", type: "switch" },
            { k: "_mtai", label: "Miss Tokyo AI extras", help: "Each can be turned off on its own. The rest keep working.", type: "head" },
            { k: "ai.mtai_send_to_admin_enabled", label: "Send to admin", help: "When Miss Tokyo AI can't answer, owners and staff can send the question to the admin (Inbox › Questions for admin) and get the reply in the chat.", type: "switch" },
            { k: "ai.mtai_bell_enabled", label: "Bell count", help: "The top bar bell shows unread replies (staff and owners) or open questions (admin).", type: "switch" },
            { k: "ai.mtai_walkthroughs_enabled", label: "Walkthroughs", help: "Miss Tokyo AI can start a step-by-step tour that highlights each control in turn.", type: "switch" },
            { k: "ai.mtai_voice_enabled", label: "Voice input", help: "A microphone button fills the chat box from speech. It never sends by itself.", type: "switch" },
            { k: "ai.mtai_error_help_enabled", label: "Help on payment errors", help: "Payment error messages for staff get an “Ask Miss Tokyo AI” button. It only suggests another way to pay after 2 failures or a Paystack outage, and never cash.", type: "switch" },
            { k: "ai.mtai_error_log_enabled", label: "Error log", help: "Records which error codes staff and customers see, and on which page, for the errors card below. No technical details. Kept 30 days. Takes up to a minute to start or stop.", type: "switch" },
            { k: "_cards", label: "Activity", type: "assistant-cards" },
        ],
    },
    {
        g: "Online store", k: "domain", t: "Domain and home page",
        sum: (v, c) => `${c.domain} · opens on ${({ shop: "the shop", gallery: "the gallery", home: "the home page" } as Record<string, string>)[str(v["store.homepage_route"])] ?? "the home page"}`,
        rows: [
            { k: "_dom", label: "Domain", help: "Your shop's web address.", type: "status", status: c => ({ text: c.domain, tone: "neutral" }) },
            { k: "store.homepage_route", label: "First page visitors see", help: "Where the shop's address takes someone who isn't signed in.", type: "select", opts: [["home", "The home page"], ["shop", "The shop"], ["gallery", "The gallery"]], words: "landing route" },
        ],
    },
    {
        g: "Online store", k: "status", t: "Shop open or closed",
        sum: v => (v["store.maintenance_mode"] === true ? "Closed for maintenance" : "Open"),
        rows: [
            { k: "store.maintenance_mode", label: "Shop status", type: "radio", opts: [["open", "Open", "Customers can browse and buy."], ["closed", "Closed for maintenance", "Customers see a “Coming soon” page instead of the shop. The admin and the POS keep working, and pay links still work."]], words: "maintenance coming soon" },
        ],
    },
    {
        g: "Online store", k: "pages", t: "Shop pages",
        sum: v => `${["store.enable_gift_cards", "store.enable_gallery", "store.enable_craft", "store.enable_whitelabel", "store.enable_custom_requests"].filter(k => v[k] === true).length} of 5 optional pages on`,
        rows: [
            { k: "store.enable_gift_cards", label: "Gift cards", help: "Customers can buy gift cards online.", type: "switch" },
            { k: "store.enable_gallery", label: "Gallery", help: "A shoppable photo and video gallery.", type: "switch" },
            { k: "store.enable_craft", label: "The craft", help: "A page about how pieces are made.", type: "switch" },
            { k: "store.enable_whitelabel", label: "White label", help: "For businesses who want pieces under their own brand.", type: "switch" },
            { k: "store.enable_custom_requests", label: "Custom requests", help: "A form for bespoke orders. Requests arrive in the admin.", type: "switch", words: "bespoke" },
        ],
    },
    {
        g: "Online store", k: "layout", t: "Shop layout",
        sum: v => `${str(v["store.shop_grid_cols"])} columns · images ${v["store.shop_image_stretch"] === "stretch" ? "stretched" : "cropped"}`,
        rows: [
            { k: "store.shop_grid_cols", label: "Products per row on a computer", help: "On the shop page.", type: "seg", opts: LAYOUT_COLS, words: "grid columns" },
            { k: "store.shop_mobile_cols", label: "Products per row on a phone", type: "seg", opts: [["1", "1"], ["2", "2"]], words: "grid columns mobile" },
            { k: "store.shop_product_limit", label: "Products per page", help: "How many load at once on the shop page.", type: "select", opts: [["8", "8"], ["12", "12"], ["16", "16"], ["24", "24"], ["32", "32"]] },
            { k: "store.home_grid_cols", label: "Products per row on the home page", type: "seg", opts: LAYOUT_COLS, words: "grid columns" },
            { k: "store.home_product_limit", label: "Featured products on the home page", help: "How many show in the home page grid.", type: "seg", opts: [["4", "4"], ["6", "6"], ["8", "8"], ["12", "12"]], words: "featured grid count" },
            { k: "store.shop_show_title", label: "Show the heading above products", help: "The title and subtitle at the top of the shop page.", type: "switch" },
            { k: "store.shop_image_stretch", label: "Product photos", help: "Stretching fills the frame exactly but can distort a photo.", type: "seg", opts: [["crop", "Crop to fill"], ["stretch", "Stretch to fill"]], words: "image fit" },
        ],
    },
    {
        g: "Online store", k: "options", t: "Product options", assist: "settings.global-options",
        sum: v => {
            const n = (k: string) => (Array.isArray(v[k]) ? (v[k] as string[]).length : 0);
            return `${n("store.global_sizes")} sizes · ${n("store.global_colors")} colours · ${n("store.global_brands")} brands`;
        },
        rows: [
            { k: "store.global_sizes", label: "Sizes", help: "Offered when you add sizes to a product. Press Enter or comma after each one.", type: "tags", words: "global size" },
            { k: "store.global_colors", label: "Colours", help: "Offered when you add colours to a product.", type: "tags", words: "global colour color" },
            { k: "store.global_brands", label: "Brands", help: "Offered when you add brands to a product.", type: "tags", words: "global brand" },
        ],
    },
    {
        g: "Online store", k: "seo", t: "Search engines",
        sum: v => str(v["meta.title"]) || "Shop title and description for Google",
        rows: [
            { k: "meta.title", label: "Shop title in search results", help: "Up to 60 characters.", type: "text", max: 60, words: "seo google meta" },
            { k: "meta.description", label: "Shop description in search results", help: "Up to 160 characters.", type: "textarea", max: 160, words: "seo google meta" },
            { k: "meta.keywords", label: "Keywords", help: "Separated by commas.", type: "text", words: "seo" },
            { k: "_rss", label: "New arrivals feed", help: "A public RSS feed of your 20 newest active products, updated hourly. Wholesale-only products are left out.", type: "rss", words: "rss" },
        ],
    },
    {
        g: "Online store", k: "content", t: "Site content",
        show: c => !c.contentOn,
        sum: () => "Home page, about page, reviews, size guide and more",
        rows: [{ k: "_legacy", label: "Site content", type: "legacy-content", words: "hero slides trust bar reviews about gift card size guide product page carousel" }],
    },
    {
        g: "Team", k: "team", t: "Staff and notifications",
        sum: (_v, c) => `${c.staffCount} ${c.staffCount === 1 ? "person" : "people"} · new-order alerts`,
        rows: [
            { k: "_staff", label: "Staff and roles", help: "Invite people and choose what they can do.", type: "link", href: c => c.staffHref },
            { k: "_pushme", label: "New-order alerts on this device", help: "A notification on this phone or computer when an order is paid. Each device turns it on for itself.", type: "push-device", words: "push notification" },
            { k: "push.title", label: "Alert title", help: "Insert: {order_id} {customer_name} {amount}", type: "text", words: "push notification" },
            { k: "push.body", label: "Alert text", help: "Insert: {order_id} {customer_name} {amount}", type: "push-template", words: "push notification" },
        ],
    },
    {
        g: "Money", k: "money", t: "Plan and payouts",
        sum: () => "Plan, receipts and where Paystack pays you",
        rows: [
            { k: "_plan", label: "Plan and receipts", help: "Your Miss Tokyo plan, running costs and receipts.", type: "link", href: c => c.billingHref },
            { k: "_payout", label: "Payout account", help: "Paystack sends your money to the bank account set in your Paystack dashboard. Change it there.", type: "payout", words: "bank settlement" },
        ],
    },
    {
        g: "Admin", k: "rollout", t: "New admin rollout",
        sum: v => (v["store.admin_v2"] === true ? `New admin on · ${["store.admin_v2_products", "store.admin_v2_orders", "store.admin_v2_till"].filter(k => v[k] === true).length} of 3 extra areas` : "Everyone uses the old admin"),
        rows: [
            { k: "store.admin_v2", label: "New admin for everyone", help: "Everyone who signs in gets the new menu and the new pages that are ready. Products, Orders and the POS stay on their old pages until their own switch below is on.", type: "switch", words: "v2 redesign" },
            { k: "store.admin_v2_products", label: "New Products pages", help: "Everyone edits products, photos and stock in the new product panel.", type: "switch", needs: "store.admin_v2", words: "v2" },
            { k: "store.admin_v2_orders", label: "New Orders pages", help: "Everyone packs, sends, refunds and cancels orders in the new order panel. Run the old and new pages side by side first.", type: "switch", needs: "store.admin_v2", words: "v2" },
            { k: "store.admin_v2_till", label: "New POS", help: "Everyone at the counter uses the new POS. Try it on the tablet before turning it on.", type: "switch", needs: "store.admin_v2", words: "v2 pos" },
        ],
    },
    {
        g: "Your account", k: "account", t: "Your account", mine: true,
        sum: (_v, c) => [c.me.name, c.me.email].filter(Boolean).join(" · "),
        rows: [{ k: "_account", label: "Your account", type: "account", words: "password email name theme appearance two-step sessions sign out" }],
    },
];

export const GROUPS: Group[] = [...new Set(SECTIONS.map(s => s.g))];

export function sectionByKey(k: string): Section | undefined {
    return SECTIONS.find(s => s.k === k);
}

/** Rows that hold a saved value (not display rows), with range pairs expanded. */
export function valueKeys(sec: Section, role: Ctx["role"]): string[] {
    const out: string[] = [];
    for (const r of sec.rows) {
        if (r.k.startsWith("_")) continue;
        if (r.adminOnly && role !== "admin") continue;
        if (["head", "riders", "messages", "aiuse", "rss", "payout", "push-device", "legacy-content", "assistant-cards", "account", "status", "link"].includes(r.type)) continue;
        out.push(r.k);
        if (r.k2) out.push(r.k2);
    }
    return out;
}

/** Which section and row a key lives in. */
export function findKey(key: string): { sec: Section; row: Row } | null {
    for (const sec of SECTIONS) for (const row of sec.rows) if (row.k === key || row.k2 === key) return { sec, row };
    return null;
}

export function sameVal(a: Val | undefined, b: Val | undefined): boolean {
    if (Array.isArray(a) || Array.isArray(b)) {
        const x = Array.isArray(a) ? a : [], y = Array.isArray(b) ? b : [];
        return x.length === y.length && x.every((v, i) => v === y[i]);
    }
    return (a ?? "") === (b ?? "");
}

/** Wholesale-only categories compare as sets: order doesn't matter. */
export function sameKeyVal(key: string, a: Val | undefined, b: Val | undefined): boolean {
    if (key === "cats.wholesale") {
        const x = new Set(Array.isArray(a) ? a : []), y = new Set(Array.isArray(b) ? b : []);
        return x.size === y.size && [...x].every(v => y.has(v));
    }
    return sameVal(a, b);
}

/** The old ?tab= values, and the old page's spotlight anchors, mapped to new sections. */
export const LEGACY_TAB_SECTION: Record<string, string> = {
    business: "profile", store: "checkout", shipping: "location", cms: "content", seo: "seo",
    emails: "notifications", notifications: "team", riders: "delivery", "size-guide": "content", "product-page": "content",
};
export const ANCHOR_SECTION: Record<string, string> = {
    "settings.delivery-fees": "delivery", "settings.global-options": "options", "settings.pos-hold": "payments",
};
/** A new section opened while the area is off goes to the old page's matching tab. */
export const SECTION_LEGACY_HREF: Record<string, string> = {
    profile: "/settings?tab=business", location: "/settings?tab=shipping", checkout: "/settings?tab=store",
    payments: "/settings?tab=store", delivery: "/settings?tab=store", taxes: "/settings?tab=business",
    wholesale: "/settings?tab=store", notifications: "/settings?tab=emails", assistants: "/settings/ai",
    domain: "/settings?tab=store", status: "/settings?tab=store", pages: "/settings?tab=store", layout: "/settings?tab=store",
    options: "/settings?tab=store", seo: "/settings?tab=seo", content: "/settings?tab=cms", team: "/settings?tab=notifications",
};

export type SearchHit = { sec: Section; row: Row };

/** Search every row the viewer can see. Two letters or more. */
export function searchSettings(q: string, ctx: Ctx): SearchHit[] {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const hits: SearchHit[] = [];
    for (const sec of visibleSections(ctx)) {
        for (const row of sec.rows) {
            if (row.type === "head" && !row.help) continue;
            if (row.adminOnly && ctx.role !== "admin") continue;
            const hay = `${row.label} ${row.help ?? ""} ${row.words ?? ""} ${sec.t} ${sec.g}`.toLowerCase();
            if (hay.includes(needle)) hits.push({ sec, row });
        }
    }
    return hits;
}

export function visibleSections(ctx: Ctx): Section[] {
    const full = ctx.role !== "sales_staff";
    return SECTIONS.filter(s => (full || s.mine) && (!s.show || s.show(ctx)));
}

/** "store.platform_fee_percentage" → an element id for jumping and highlighting. */
export const rowId = (k: string) => "row-" + k.replace(/[^a-z0-9]+/gi, "-");
