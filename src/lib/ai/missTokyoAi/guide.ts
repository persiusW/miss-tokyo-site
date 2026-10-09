// The Miss Tokyo dashboard guide: what each page is for, where things are, and
// the answers staff most often need. Written from the page code (spec A,
// appendix A, 2026-10-08) and describes CURRENT behaviour — update an entry in
// the same PR that changes its page. Role-filtered into the system prompt.
import type { RouteKey, StaffRole } from "@/lib/ai/missTokyoAi/routes";

export type GuideEntry = {
    id: string;
    title: string;
    route?: RouteKey;
    roles?: StaffRole[];      // omitted = all staff
    body: string;
};

const FULL: StaffRole[] = ["admin", "owner"];

export const GUIDE: GuideEntry[] = [
    {
        id: "everywhere",
        title: "Anywhere in the dashboard",
        body: `Top bar "Search orders, products…" (or Ctrl/⌘ K) searches orders by ref, name, email, phone or Paystack ref, plus products and contacts. The sidebar groups pages under Overview, Sales, Catalogue, Customers and Settings.`,
    },
    {
        id: "overview",
        title: "Dashboard",
        route: "overview",
        body: `KPI tiles (Total Revenue, Cash Taken, Unfulfilled, Fulfilled, Avg. Order Value) and cards for Catalog by Category, Conversion Funnel, Order Status Breakdown, Low Stock Alert ("View All →") and Recent Activity. The Low Stock Alert counts a product as low when its TOTAL is under 5, so one sold-out size does not show there — use stock_report for per-size stock.`,
    },
    {
        id: "analytics",
        title: "Analytics",
        route: "analytics",
        body: `Date range presets (Today, Yesterday, Past 7/30 Days, Year to Date, Custom) and tabs Highlights, Traffic, Reports, Insights. Reports has "Export CSV" for Sales by Item, by Variant, by Channel and Discount / Promo Performance. Traffic shows peak ordering hours and days. Insights shows repeat buyers.`,
    },
    {
        id: "pos",
        title: "Point of Sale (till)",
        route: "pos",
        body: `Search "Search by name or SKU…", pick Size/Colour/Brand on the card, then Add. Attach a customer: Existing (search name, email or phone) or New. "Phone * (link is sent by SMS)" is required for a pay link. Optional "Enter code" for a gift card or discount. Choose Store Pickup or Delivery (address, country, region, then "Within Accra" or "Outside Accra"). Then either "Send Link — GH₵x" (sends the Paystack link by SMS and email; the toast says which went out; "Copy Link" if one failed) or "Cash Received — GH₵x" (tap, then tap again within 4 seconds; needs a phone or email so the customer gets their order number). A gift card that covers everything completes the sale with no link. Link stock is held for Settings → Store → "Payment Link Hold" (15, 30 or 45 minutes). Products tracked per size/colour are only stock-checked when you press Send or Cash.`,
    },
    {
        id: "pos-history",
        title: "POS History",
        route: "pos_history",
        body: `Till sessions with tabs All, Draft, Pending, Paid, Expired, Cancelled, a search and date filters (admin/owner also get a staff filter; sales staff only see their own sales). Open a row for Session Detail: "View Order", "Copy Link" and "Cancel Session" (only for Draft or Pending; frees the held stock; sales staff can cancel only their own). A paid session cannot be cancelled here — cancel or refund its order instead. Note: History's "Copy Link" currently builds a broken link; use the link from the till or the customer's SMS.`,
    },
    {
        id: "orders",
        title: "Orders",
        route: "orders",
        body: `Tabs: Inbox (paid only), Packed, Pickups, Shipped, Fulfilled, Cancelled, Refunds, All. Search by 8-character ref, name, email or phone — use the All tab, because Inbox shows paid orders only and "processing" orders appear only under All. Payment filter (Cash, Card/mobile money, Gift card) and From/To dates. Tick rows for bulk Mark Packed / Mark Shipped / Mark Fulfilled (on Packed: Mark Ready for Pickup, Assign Rider & Ship). Row "…" menu: Copy Order ID, Print Invoice (only opens the order), Mark Ready for Pickup / Assign Rider & Ship, Mark Fulfilled, View Details. Orders made only of pre-orders live under Pre-Orders.`,
    },
    {
        id: "order-detail",
        title: "An order's page",
        route: "orders",
        body: `Header buttons appear by state: "Send Pickup Ready Notification" (packed pickup), "Assign Rider & Ship" (packed delivery), "Mark Collected", "Mark Fulfilled", "Refund", "Cancel", "Copy Details", "Resend Confirmation", "Print Receipt". The Payment card shows Order Total, Paystack Fee and Amount Paid, plus "Verify with Paystack". Verify only asks Paystack and changes nothing; on a mismatch "Mark this order paid" appears, which only admin or owner can apply (it marks paid, takes stock and emails the customer). Cancel fires immediately with no confirmation, returns exactly the stock the order took and emails the customer. Refund marks the order refunded and returns stock but sends NO money — refund in the Paystack dashboard. To ship: the order must be packed first, then Assign Rider & Ship → pick rider → choose notifications → Confirm & Ship. Pickup: packed → Send Pickup Ready Notification → Mark Collected when they collect.`,
    },
    {
        id: "cancelled-but-paid",
        title: "Order shows cancelled but the customer paid",
        body: `Unpaid online orders are cancelled automatically 20 minutes after checkout (checked every 30 minutes). A late payment reverses those automatic cancellations, and a nightly job at 23:30 repairs the rest; staff cancellations are final. To fix one now: open the order → "Verify with Paystack" → "Mark this order paid" (admin or owner).`,
    },
    {
        id: "pre-orders",
        title: "Pre-Orders",
        route: "pre_orders",
        body: `Orders containing pre-order items, with Total Value, Awaiting Stock, Fulfilled and Cancelled. Same tabs as Orders, no payment or date filters. Regular items in mixed orders are fulfilled from Orders.`,
    },
    {
        id: "abandoned",
        title: "Abandoned Carts",
        route: "abandoned",
        body: `Pending orders that never reached Paystack, filtered Today / 7 Days / 30 Days / All Time. "Send Reminder" emails the customer (disabled when there is no email).`,
    },
    {
        id: "riders",
        title: "Riders",
        route: "riders",
        body: `Read-only delivery stats per rider and each rider's orders. Riders are added or edited in Site Settings → Riders ("Add Rider"), which only admin and owner have in their sidebar.`,
    },
    {
        id: "wholesalers",
        title: "Wholesalers",
        route: "wholesalers",
        roles: FULL,
        body: `"Manage Wholesalers" → search an email → "Promote". "Revoke Access" per account. Wholesale prices only apply to a wholesaler who is signed in when they check out.`,
    },
    {
        id: "discounts",
        title: "Discounts (coupon codes)",
        route: "discounts",
        body: `"New Discount" → type (Fixed Discount, Percentage Off, Free Shipping, Sale Price, Buy X Get Y) → "Coupon Code" (or "Gen") → value → optional category, Min Order, Usage Limit, Expiry Date → "Create Discount". Click a code's Active badge to pause it. Today only owners and sales staff can create or change codes; the admin role gets "Unauthorized".`,
    },
    {
        id: "auto-discounts",
        title: "Auto Discounts",
        route: "auto_discounts",
        body: `Checkout rules that need no code. "New Rule": title (customers see it), percentage or fixed, applies to all / specific categories / specific products, minimum quantity, minimum order amount, start and end dates, Active.`,
    },
    {
        id: "gift-cards",
        title: "Gift Cards",
        route: "gift_cards",
        body: `"Issue Gift Card" → amount → "Recipient Email *" → optional name, sender and message → "Issue & Send Email". "View" shows the balance, "Cancel" (permanent) and "Resend". A card's amount or balance cannot be edited. Online gift-card limits are in Site Settings → CMS → Gift Cards.`,
    },
    {
        id: "products",
        title: "Products",
        route: "products",
        body: `Search, "Low Stock", "New Product", status and stock filters. Per row: Pre-Order "Enable" with weeks, the eye icon to hide/show in the shop, edit, delete. Bulk actions: Show, Hide, Wholesale (careful: replaces all the product's categories), Untrack, Delete.`,
    },
    {
        id: "product-form",
        title: "Adding or editing a product",
        route: "product_new",
        body: `Name, slug, categories, description, SKU, price. Variants: switch on Sizes, Colors and/or Brands and tick the options — the options come ONLY from Site Settings → Store global lists (admin/owner add missing sizes, colours or brands there first). For stock per size/colour turn on "Track Inventory" and "Track Inventory by Variant", then fill the stock matrix. A product that never runs out: turn Track Inventory off. Up to 10 photos; the first is the main image. To restock, edit the product, change the stock and "Update Product" — only the difference is applied, so sales made while the form was open are kept. Editing adds Active, Compare-at Price and On Sale with Discount %.`,
    },
    {
        id: "low-stock-page",
        title: "Low Stock page",
        route: "low_stock",
        body: `Active tracked products whose TOTAL stock is under 5; the edit icon opens the product. A single sold-out size is not listed there — stock_report checks every size and colour.`,
    },
    {
        id: "categories",
        title: "Categories",
        route: "categories",
        body: `Search and filters; "New Category" with name, slug, description, Wholesale and Pre-Order toggles (with weeks). Per row: Active, Featured, Duplicate as Wholesale, Edit, Delete.`,
    },
    {
        id: "customers",
        title: "Contact List and customer profiles",
        route: "contacts",
        body: `Export, "Add Contact", search, source and date filters; click a row for the profile (total spent, contact details, last address, orders, forms, invoices). Only manually added contacts can be deleted.`,
    },
    {
        id: "forms-requests",
        title: "Form Submissions and Custom Requests",
        route: "forms",
        body: `Form Submissions: search, topic and status filters; "View" marks it read; "Mark as Replied"; "Reply via Email". Custom Requests (when switched on in Store settings): status per row Inquiry → Material Confirmation → Production → Completed / Cancelled.`,
    },
    {
        id: "invoices",
        title: "Invoices and Pay Links",
        route: "invoices",
        roles: FULL,
        body: `Invoices: "New Document" (invoice or quotation, line items) and a manual status dropdown. On an invoice's own page, "Paystack Link" creates a working payment link. The invoice list's "Pay Link" and the Pay Links page currently cannot produce a link — use the invoice page's "Paystack Link" instead.`,
    },
    {
        id: "settings",
        title: "Site Settings",
        route: "settings",
        roles: FULL,
        body: `Tabs (Take me there can open each one): Business (logo, tax, contact, social links), Store (store pickup on/off, maintenance mode, landing page, global sizes/colours/brands, Payment Link Hold 15/30/45, platform fee %, checkout undo, Delivery Fees — Charge Delivery, Within Accra, Outside Accra — feature toggles, wholesale tiers), Shipping (pickup instructions, address, phone, wait time only; delivery fees are in Store), CMS (hero slides, trust bar, sections, navigation, reviews, about page, gift cards, site assets), SEO, Emails (email and SMS templates, test send), Notifications (desktop alerts for new orders), Riders (Add Rider), Size Guide, Product Page.`,
    },
    {
        id: "team",
        title: "Team",
        route: "team",
        roles: FULL,
        body: `Active Members, Pending Invites, Activity Logs (filter by date, staff and action — answers "who changed this order"). "Invite Member" can invite Sales Staff or Admin (not Owner). "Reset" sends a password link.`,
    },
    {
        id: "ai-settings",
        title: "AI Settings",
        route: "ai_settings",
        roles: FULL,
        body: `Switch Miss Tokyo AI and the WhatsApp agent on or off, set the daily spend limit, and see recent usage.`,
    },
];

/** Things the dashboard cannot do. Stops the assistant inventing workarounds. */
export const CANNOT_DO: string[] = [
    "Refund money to a customer from the dashboard. Refund marks the order and returns stock; the money is refunded in the Paystack dashboard.",
    "Edit items, quantities, prices, address or customer details on an existing order.",
    "Change or cancel a POS sale after it is paid (cancel or refund its order instead).",
    "Delete an order.",
    "Delete a customer who came from orders, the newsletter or requests (only manual contacts).",
    "Restore a gift card's balance by cancelling or refunding an order paid with it, or edit a gift card's amount.",
    "Sell at a custom price, give a manual discount amount, or sell an item that is not in the catalogue at the till.",
    "Split one till payment between cash and card (a gift card plus a link for the rest does work).",
    "Invite an Owner from the Team page.",
    "Type a new size, colour or brand on the product form (add it to Site Settings → Store first).",
    "Import stock in bulk.",
];

export function guideFor(role: StaffRole): GuideEntry[] {
    return GUIDE.filter(e => !e.roles || e.roles.includes(role));
}
