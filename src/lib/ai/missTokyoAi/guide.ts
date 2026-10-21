// The Miss Tokyo dashboard guide: what each page is for, where things are, and
// the answers staff most often need. Written from the page code and describes
// CURRENT behaviour — update an entry in the same PR that changes its page.
// Role-filtered into the system prompt.
//
// Two guides during the admin v2 rollout: GUIDE is the old admin, V2_GUIDE
// (guideV2.ts) the new one. guideFor picks each area's entries from the admin
// this person sees, so someone on the new admin never hears an old label, and a
// device still on the old admin is told the truth about its pages.
import type { LegacyRouteKey, RouteKey, StaffRole } from "@/lib/ai/missTokyoAi/routes";
import { OLD_VIEW, isOn, type AdminView, type V2Area } from "@/lib/ai/missTokyoAi/view";
import { placeNames } from "@/lib/ai/missTokyoAi/guideNames";
import { V2_CANNOT_DO, V2_GUIDE } from "@/lib/ai/missTokyoAi/guideV2";

/** "shell": the side menu and top bar (on with the store switch, or a preview). */
export type GuideArea = V2Area | "shell";

export type GuideEntry = {
    id: string;
    title: string;
    area: GuideArea;
    route?: RouteKey;
    roles?: StaffRole[];      // omitted = all staff
    body: string | ((view: AdminView) => string);
};

/** An entry as one view reads it. */
export type ResolvedEntry = { id: string; title: string; area: GuideArea; route?: RouteKey; roles?: StaffRole[]; body: string };

const FULL: StaffRole[] = ["admin", "owner"];

type LegacyEntry = GuideEntry & { route?: LegacyRouteKey };

export const GUIDE: LegacyEntry[] = [
    {
        id: "everywhere",
        title: "Anywhere in the dashboard",
        area: "shell",
        body: `Top bar "Search orders, products…" (or Ctrl/⌘ K) searches orders by ref, name, email, phone or Paystack ref, plus products and contacts. The sidebar groups pages under Overview, Sales, Catalogue, Customers and Settings.`,
    },
    {
        id: "overview",
        title: "Dashboard",
        area: "home",
        route: "overview",
        body: `The Overview page shows KPI tiles (Total Revenue, Cash Taken, Unfulfilled, Fulfilled, Avg. Order Value), Catalog by Category, Conversion Funnel, Order Status Breakdown, Low Stock Alert ("View All →", a product's TOTAL under 5) and Recent Activity.`,
    },
    {
        id: "analytics",
        title: "Analytics",
        area: "analytics",
        route: "analytics",
        body: `Date presets (Today, Yesterday, Past 7/30 Days, Year to Date, Custom) and tabs Highlights, Traffic, Reports, Insights. Reports has "Export CSV" for Sales by Item, by Variant, by Channel and Discount / Promo Performance; Traffic shows peak ordering hours and days; Insights shows repeat buyers. Payments is its own page (Total Collected, This Month, every Paystack reference).`,
    },
    {
        id: "pos",
        title: "Point of Sale (till)",
        area: "till",
        route: "pos",
        body: v => `Search "Search by name or SKU…", pick Size/Colour/Brand on the card, then Add. Attach a customer: Existing (search name, email or phone) or New. "Phone * (link is sent by SMS)" is required for a pay link. Optional "Enter code" for a gift card or discount. Choose Store Pickup or Delivery (address, country, region, then "Within Accra" or "Outside Accra"). Then either "Send Link — GH₵x" (sends the Paystack link by SMS and email; the toast says which went out; "Copy Link" if one failed) or "Cash Received — GH₵x" (tap, then tap again within 4 seconds; needs a phone or email so the customer gets their order number). A gift card that covers everything completes the sale with no link. Link stock is held for ${placeNames(v).payHold} (15, 30 or 45 minutes). Products tracked per size/colour are only stock-checked when you press Send or Cash.`,
    },
    {
        id: "pos-history",
        title: "POS History",
        area: "till",
        route: "pos_history",
        body: `Till sessions with tabs All, Draft, Pending, Paid, Expired, Cancelled, a search and date filters (admin/owner also get a staff filter; sales staff only see their own sales). Open a row for Session Detail: "View Order", "Copy Link" and "Cancel Session" (only for Draft or Pending; frees the held stock; sales staff can cancel only their own). A paid session cannot be cancelled here — cancel or refund its order instead. Note: History's "Copy Link" currently builds a broken link; use the link from the till or the customer's SMS.`,
    },
    {
        id: "orders",
        title: "Orders",
        area: "orders",
        route: "orders",
        body: `Tabs Inbox (paid only), Packed, Pickups, Shipped, Fulfilled, Cancelled, Refunds, All. Search by 8-character ref, name, email or phone — use the All tab, because Inbox shows paid orders only and "processing" orders appear only under All. Payment filter (Cash, Card/mobile money, Gift card) and From/To dates. Tick rows for bulk Mark Packed / Mark Shipped / Mark Fulfilled (on Packed: Mark Ready for Pickup, Assign Rider & Ship). Row "…" menu: Copy Order ID, Print Invoice (only opens the order), Mark Ready for Pickup / Assign Rider & Ship, Mark Fulfilled, View Details. Orders made only of pre-orders live under Pre-Orders.`,
    },
    {
        id: "order-detail",
        title: "An order's page",
        area: "orders",
        route: "orders",
        body: `Header buttons appear by state: "Send Pickup Ready Notification" (packed pickup), "Assign Rider & Ship" (packed delivery), "Mark Collected", "Mark Fulfilled", "Refund", "Cancel", "Copy Details", "Resend Confirmation", "Print Receipt". The Payment card shows Order Total, Paystack Fee and Amount Paid, plus "Verify with Paystack". Verify only asks Paystack and changes nothing; on a mismatch "Mark this order paid" appears, which anyone on staff can apply (it marks paid, takes stock and emails the customer). Cancel fires immediately with no confirmation, returns exactly the stock the order took and emails the customer. Refund marks the order refunded and returns stock but sends NO money — refund in the Paystack dashboard. To ship: the order must be packed first, then Assign Rider & Ship → pick rider → choose notifications → Confirm & Ship. Pickup: packed → Send Pickup Ready Notification → Mark Collected when they collect.`,
    },
    {
        id: "cancelled-but-paid",
        title: "Order shows cancelled but the customer paid",
        area: "orders",
        body: `Unpaid online orders are cancelled automatically 20 minutes after checkout (checked every 30 minutes). A late payment reverses those automatic cancellations, and a nightly job at 23:30 repairs the rest; staff cancellations are final. To fix one now: open the order → "Verify with Paystack" → "Mark this order paid" (anyone on staff).`,
    },
    {
        id: "pre-orders",
        title: "Pre-Orders",
        area: "orders",
        route: "pre_orders",
        body: `Orders containing pre-order items, with Total Value, Awaiting Stock, Fulfilled and Cancelled. Same tabs as Orders, no payment or date filters. Regular items in mixed orders are fulfilled from Orders.`,
    },
    {
        id: "abandoned",
        title: "Abandoned Carts",
        area: "orders",
        route: "abandoned",
        body: `Pending orders that never reached Paystack, filtered Today / 7 Days / 30 Days / All Time. "Send Reminder" emails the customer (disabled when there is no email). The shop also emails one reminder on its own a day after a checkout that never reached payment.`,
    },
    {
        id: "riders",
        title: "Riders",
        area: "analytics",
        route: "riders",
        body: v => `Read-only delivery stats per rider (orders, on the way, delivered, cancelled, order value) on the Rider Reports page; "View →" per rider lists their orders. Riders are added or edited in ${placeNames(v).riders}, which only admin and owner can open.`,
    },
    {
        id: "wholesalers",
        title: "Wholesalers",
        area: "customers",
        route: "wholesalers",
        roles: FULL,
        body: `"Manage Wholesalers" → search an email → "Promote"; "Revoke Access" per account. Wholesale prices only apply to a wholesaler who is signed in when they check out.`,
    },
    {
        id: "discounts",
        title: "Discounts (codes)",
        area: "discounts",
        route: "discounts",
        body: `"New Discount" → type (Fixed Discount, Percentage Off, Free Shipping, Sale Price, Buy X Get Y) → "Coupon Code" (or "Gen") → value → optional category, Min Order, Usage Limit, Expiry Date → "Create Discount"; click a code's Active badge to pause it. Owners, admins and sales staff can create, change, pause and delete codes. What checkout takes off: Percentage, products only; Fixed amount, products first and any remainder off delivery (with a category: that category's items only, never delivery); Free delivery, the delivery fee; Sale price, every item the code covers priced above the sale price sells for it; Buy X get Y, for every X+Y items the code covers the cheapest Y are free. A code never touches an item that already has an automatic discount, and with a category it only covers that category.`,
    },
    {
        id: "auto-discounts",
        title: "Automatic discounts",
        area: "discounts",
        route: "auto_discounts",
        body: `Checkout offers that need no code. Auto Discounts page: "New Rule" with a title, Percentage or Fixed amount, what it applies to (everything, categories or products), conditions (minimum order total or number of items), dates and an Active switch. When two automatic discounts reach the same item, the one that saves more on that cart takes it; a code only comes off items no automatic discount covers.`,
    },
    {
        id: "gift-cards",
        title: "Gift Cards",
        area: "products",
        route: "gift_cards",
        body: v => `"Issue Gift Card" → amount → "Recipient Email *" → optional name, sender and message → "Issue & Send Email"; "View" shows the balance, "Cancel" (permanent) and "Resend". A card's amount or balance cannot be edited. Online gift-card limits are in ${placeNames(v).giftCardPage}.`,
    },
    {
        id: "products",
        title: "Products",
        area: "products",
        route: "products",
        body: `Search, "Low Stock", "New Product", status and stock filters. Per row: Pre-Order "Enable" with weeks, the eye icon to hide/show in the shop, edit, delete. Bulk actions: Show, Hide, Wholesale (careful: replaces all the product's categories), Untrack, Delete.`,
    },
    {
        id: "product-form",
        title: "Adding or editing a product",
        area: "products",
        route: "product_new",
        body: v => `Name, slug, categories, description, SKU, price. Variants: switch on Sizes, Colors and/or Brands and tick the options — the options come ONLY from ${placeNames(v).options} (admin/owner add missing sizes, colours or brands there first). For stock per size/colour turn on "Track Inventory" and "Track Inventory by Variant", then fill the stock matrix. A product that never runs out: turn Track Inventory off. Up to 10 photos; the first is the main image. To restock, edit the product, change the stock and "Update Product" — only the difference is applied, so sales made while the form was open are kept. Editing adds Active, Compare-at Price and On Sale with Discount %.`,
    },
    {
        id: "low-stock-page",
        title: "Low Stock page",
        area: "products",
        route: "low_stock",
        body: `Active tracked products whose TOTAL stock is under 5; the edit icon opens the product. A single sold-out size is not listed there — stock_report checks every size and colour.`,
    },
    {
        id: "categories",
        title: "Categories",
        area: "products",
        route: "categories",
        body: `Search and filters; "New Category" with name, slug, description, Wholesale and Pre-Order toggles (with weeks). Per row: Active, Featured, Duplicate as Wholesale, Edit, Delete.`,
    },
    {
        id: "customers",
        title: "Customers (Contact List) and customer profiles",
        area: "customers",
        route: "contacts",
        body: `Contact List with Export, "Add Contact", search, source and date filters; click a row for the profile (total spent, contact details, last address, orders, forms, invoices). Only manually added contacts can be deleted.`,
    },
    {
        id: "inbox",
        title: "WhatsApp chats",
        area: "inbox",
        route: "whatsapp",
        body: `WhatsApp Chats page with tabs Needs you, All, Assistant, Notices, Dealt with, and buttons "Reply on WhatsApp", "Dealt with" and "Hand back to assistant". WhatsApp only lets the shop write within 24 hours of the customer's last message; after that, reply from the shop's phone. Chats handed to a person go back to the assistant by themselves after 24 hours.`,
    },
    {
        id: "teach",
        title: "Teach the assistant",
        area: "inbox",
        route: "whatsapp_teach",
        roles: FULL,
        body: `The Teach the assistant page (owners and admins; the "Teach the assistant" button on WhatsApp Chats). "Add a note" saves something the shop assistant should always know (title and up to 400 characters; no prices or times, those come from products and hours); it uses notes on WhatsApp and the website from the next message, up to 40 at a time. Tap a note to edit it or retire it. Photo flashcards: choose up to 10 photos, the assistant guesses which piece each shows, answer That's right, Wrong (pick the product) or Skip; each answer becomes a photo lesson.`,
    },
    {
        id: "forms-requests",
        title: "Contact forms and custom requests",
        area: "inbox",
        route: "forms",
        body: `Form Submissions (search, topic and status filters, "View" marks it read, "Mark as Replied", "Reply via Email") and Custom Requests (status per row).`,
    },
    {
        id: "invoices",
        title: "Invoices and Pay Links",
        area: "orders",
        route: "invoices",
        roles: FULL,
        body: `"New Document" (invoice or quotation, line items) and a manual status dropdown; on an invoice's own page, "Paystack Link" creates a payment link. The Pay Links page can't produce a link; use the invoice page's "Paystack Link".`,
    },
    {
        id: "settings",
        title: "Site Settings",
        area: "settings",
        route: "settings",
        roles: FULL,
        body: `Settings tabs: Business (logo, tax, contact, social links), Store (store pickup on/off, maintenance mode, landing page, global sizes/colours/brands, Payment Link Hold, platform fee %, checkout undo, Delivery Fees, feature toggles, wholesale tiers), Shipping (pickup instructions, address, phone, wait time), CMS, SEO, Emails (email and SMS templates, test send), Notifications (desktop alerts for new orders), Riders (Add Rider), Size Guide, Product Page.`,
    },
    {
        id: "team",
        title: "Team",
        area: "staff",
        route: "team",
        roles: FULL,
        body: `Team page: members, pending invites and the activity log (filter by member, action and day — answers "who changed this order"). "Invite New Member" can invite Sales Staff or Admin, not Owner; to make someone an owner, change their role afterwards. Per member: change the role, "Reset" (sends a password reset link) or "Remove" (they keep a shop account). The store always keeps at least one owner. An invite link works for 7 days.`,
    },
    {
        id: "ai-settings",
        title: "AI Settings",
        area: "settings",
        route: "ai_settings",
        roles: FULL,
        body: `AI Settings page: switch Miss Tokyo AI and the WhatsApp agent on or off, set the daily spend limit, and see recent usage. Also switches the Miss Tokyo AI extras: Send to admin, the bell count, walkthroughs and voice input (each off until tested).`,
    },
    {
        id: "ai-inbox",
        title: "Questions for admin (AI Inbox)",
        area: "inbox",
        route: "ai_inbox",
        roles: ["admin"],
        body: `AI Inbox (admin only): questions staff sent with "Send to admin" when Miss Tokyo AI couldn't answer. Open tab: read the chat before they asked, write a reply ("Send reply"), and tick "Also save as an answer for all staff" so the assistant gives that answer next time; or Dismiss (tap twice). The reply appears in the asker's Miss Tokyo AI chat. Saved answers tab: add, edit, choose which roles see each one, or switch one off. Nothing is deleted.`,
    },
];

/** Things the old dashboard cannot do. Stops the assistant inventing workarounds. */
export const CANNOT_DO: string[] = [
    "Send a refund through Paystack: Refund only marks the order and returns stock. Refund in the Paystack dashboard.",
    "Edit items, quantities, prices, address or customer details on an existing order.",
    "Change or cancel a POS sale after it is paid (cancel or refund its order instead).",
    "Delete an order.",
    "Delete a customer who came from orders, the newsletter or requests (only manual contacts).",
    "Restore a gift card's balance by cancelling or refunding an order paid with it, or edit a gift card's amount.",
    "Sell at a custom price, give a manual discount amount, or sell an item that is not in the catalogue at the till.",
    "Split one till payment between cash and card (a gift card plus a link for the rest does work).",
    "Invite an Owner from the Team page.",
    "Type a new size, colour or brand on the product form (add it to Site Settings → Store first).",
    "Import products or stock from a CSV file.",
];

const shows = (e: GuideEntry, view: AdminView) => (e.area === "shell" ? view.shell : isOn(view, e.area));

const resolve = (e: GuideEntry, view: AdminView): ResolvedEntry => ({
    id: e.id, title: e.title, area: e.area, route: e.route, roles: e.roles, body: typeof e.body === "function" ? e.body(view) : e.body,
});

/** The guide this person reads: old entries for areas on their old page, new entries for areas on their new page. */
export function guideFor(role: StaffRole, view: AdminView = OLD_VIEW): ResolvedEntry[] {
    const allowed = (e: GuideEntry) => !e.roles || e.roles.includes(role);
    return [
        ...GUIDE.filter(e => !shows(e, view) && allowed(e)),
        ...V2_GUIDE.filter(e => shows(e, view) && allowed(e)),
    ].map(e => resolve(e, view));
}

/** What cannot be done, worded for this view. */
export function cannotDoFor(view: AdminView = OLD_VIEW): string[] {
    if (view.areas.length === 0) return CANNOT_DO;
    return V2_CANNOT_DO.map(c => c(view)).filter((c): c is string => !!c);
}

/** The pages sales staff don't have, by the names this view uses. */
export function salesStaffMissing(view: AdminView = OLD_VIEW): string {
    const on = (a: V2Area) => isOn(view, a);
    const parts = [
        on("settings") ? "Settings (all but Your account)" : "Site Settings",
        on("staff") ? "Staff" : "Team",
        on("customers") ? null : "Wholesalers",
        ...(on("orders") ? ["Orders › Invoices and pay links"] : ["Invoices", "Pay Links"]),
        on("settings") ? null : "AI Settings",
        on("content") ? "Content" : null,
        on("billing") ? "Billing" : null,
        on("inbox") ? "Inbox › Teach the assistant" : null,
    ].filter((p): p is string => !!p);
    return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
