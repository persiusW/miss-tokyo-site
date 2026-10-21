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
        body: `In the new admin this page is Home: "Open the till", alert banners (WhatsApp credit running low, a paid order that had been cancelled, new-order alerts on this device), a "Needs you today" card (orders waiting to pack, waiting for payment, ready for collection with days waiting, conversations that need a person, return requests, sizes low or sold out counted per size and colour at each product's warning level, default 2 or fewer, and products with no photo), "Sales so far" for Today / 7 days / 30 days (Sales, Orders, Average order with the change against the same stretch before, and Cash to count at close), then Latest orders and Team activity. In the old admin (Overview) it shows KPI tiles (Total Revenue, Cash Taken, Unfulfilled, Fulfilled, Avg. Order Value), Catalog by Category, Conversion Funnel, Order Status Breakdown, Low Stock Alert ("View All →", a product's TOTAL under 5) and Recent Activity.`,
    },
    {
        id: "analytics",
        title: "Analytics",
        route: "analytics",
        body: `New admin (Analytics): pick Today, 7 days, 30 days, 90 days or Custom (From and To dates), and "Compare with" the previous period or the same period last year. Paid orders only. KPIs: Sales, Orders, Average order and Returning customers (the share of paid orders with an email whose customer had paid before), each with its change. Then "Sales by day", Top products, Sales by channel and Reports; each report opens with its own "Export CSV": Sales by product, Sales by size and colour, Sales by channel, Discounts (tap one for its orders), Payments received (by method; Paystack can't tell card from Mobile money, so they're counted together; "These dates" or "All time"), Riders, Cash taken at the till, Stock written off (stock taken off by hand; no reason is recorded yet), Customers (unique and repeat buyers, new customers, newsletter sign-ups, bespoke inquiries, top customers), When people buy (by day, hour and day of the week) and Where orders go. "Export CSV" at the top downloads the overview. The old Payments and Rider reports links open these reports. Old admin: date presets (Today, Yesterday, Past 7/30 Days, Year to Date, Custom) and tabs Highlights, Traffic, Reports, Insights; Reports has "Export CSV" for Sales by Item, by Variant, by Channel and Discount / Promo Performance; Traffic shows peak ordering hours and days; Insights shows repeat buyers. Payments was its own page (Total Collected, This Month, every Paystack reference).`,
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
        body: `New admin (Orders): chips All, Waiting to pack (same count as Home and the side menu), Packed, Out for delivery, Ready for collection, Delivered or collected, Waiting for payment, Cancelled and refunded. "Search by order number, name or phone", a payment method and a channel filter (Online shop, Till, WhatsApp, Shop assistant), "Pre-orders only", and Placed from / to dates; 25 a page. Tick orders for "Mark as packed" (unpaid or partly packed orders are skipped and the message says how many), "Assign rider and send" (packed delivery orders), "Tell customers it's ready" (packed pickup orders), "Mark as delivered", "Print packing slips" and "Export". Tap an order to open its panel. Tabs above the list: Orders, Abandoned checkouts, Invoices and pay links (owners and admins). "Create order" opens the till. Old admin: tabs Inbox (paid only), Packed, Pickups, Shipped, Fulfilled, Cancelled, Refunds, All. Search by 8-character ref, name, email or phone — use the All tab, because Inbox shows paid orders only and "processing" orders appear only under All. Payment filter (Cash, Card/mobile money, Gift card) and From/To dates. Tick rows for bulk Mark Packed / Mark Shipped / Mark Fulfilled (on Packed: Mark Ready for Pickup, Assign Rider & Ship). Row "…" menu: Copy Order ID, Print Invoice (only opens the order), Mark Ready for Pickup / Assign Rider & Ship, Mark Fulfilled, View Details. Orders made only of pre-orders live under Pre-Orders.`,
    },
    {
        id: "order-detail",
        title: "An order's page",
        route: "orders",
        body: `New admin: the order opens as a panel over the list (Details and Timeline tabs). It shows the badges, banners (unpaid for a day or more, pre-order items, items still to send, a refund Paystack couldn't finish), progress steps, items, the Payment card (items, discounts, delivery, processing fee, total, refunded, paid by, Paystack fee and "You receive" when Paystack sent them) with "Check with Paystack", the customer (WhatsApp and Email buttons, address or pickup instructions, rider), "Staff notes" (saved when you click away) and "Send a note to the customer" (WhatsApp only works if they messaged the shop in the last 24 hours, or email). One main button by state: Check with Paystack, Mark as packed (choose how many of each item; leaving some out makes it "Partly sent"), Send remaining items, Tell customer it's ready, Assign rider and send (pick a rider, "Text the rider", "Tell the customer"), Mark as delivered, Mark as collected. "…" has Resend confirmation, Print receipt, Copy delivery details, Open customer. Bottom left: Refund (owners and admins: Everything, Choose items or An amount, "Put the items back in stock", reason, "Email the customer") and Cancel order (paid orders: "Cancel and refund" or "Cancel without a refund"; "Tell the customer"); both show what will happen before you confirm. Card and Mobile money refunds go through Paystack only when "refunds through Paystack" is switched on; while it's off (the default) refund in the Paystack dashboard first and press Record. Cash and gift card refunds are recorded only. Old admin page: header buttons appear by state: "Send Pickup Ready Notification" (packed pickup), "Assign Rider & Ship" (packed delivery), "Mark Collected", "Mark Fulfilled", "Refund", "Cancel", "Copy Details", "Resend Confirmation", "Print Receipt". The Payment card shows Order Total, Paystack Fee and Amount Paid, plus "Verify with Paystack". Verify only asks Paystack and changes nothing; on a mismatch "Mark this order paid" appears, which only admin or owner can apply (it marks paid, takes stock and emails the customer). Cancel fires immediately with no confirmation, returns exactly the stock the order took and emails the customer. Refund marks the order refunded and returns stock but sends NO money — refund in the Paystack dashboard. To ship: the order must be packed first, then Assign Rider & Ship → pick rider → choose notifications → Confirm & Ship. Pickup: packed → Send Pickup Ready Notification → Mark Collected when they collect.`,
    },
    {
        id: "cancelled-but-paid",
        title: "Order shows cancelled but the customer paid",
        body: `Unpaid online orders are cancelled automatically 20 minutes after checkout (checked every 30 minutes). A late payment reverses those automatic cancellations, and a nightly job at 23:30 repairs the rest; staff cancellations are final. To fix one now: open the order → "Check with Paystack" ("Verify with Paystack" in the old admin) → "Mark this order paid" (admin or owner).`,
    },
    {
        id: "pre-orders",
        title: "Pre-Orders",
        route: "pre_orders",
        body: `New admin: Orders › "Pre-orders only" (old Pre-Orders links land there) shows Pre-orders waiting for stock, sent and cancelled, and the orders; an order's panel says which items are on pre-order. Old admin: orders containing pre-order items, with Total Value, Awaiting Stock, Fulfilled and Cancelled. Same tabs as Orders, no payment or date filters. Regular items in mixed orders are fulfilled from Orders.`,
    },
    {
        id: "abandoned",
        title: "Abandoned Carts",
        route: "abandoned",
        body: `New admin: Orders › Abandoned checkouts: checkouts that never became a payment (including those the unpaid-order sweep cancelled), with Checkouts not finished, Value left in carts and Recovered after a reminder (paid within 7 days), for Today / 7 days / 30 days / All time. "Send reminder" / "Send again" emails the customer (owners and admins); "Paid later" means they bought since. The shop also emails one reminder on its own a day after a checkout that never reached payment. Old admin (Abandoned Carts): pending orders that never reached Paystack, filtered Today / 7 Days / 30 Days / All Time. "Send Reminder" emails the customer (disabled when there is no email).`,
    },
    {
        id: "riders",
        title: "Riders",
        route: "riders",
        body: `Read-only delivery stats per rider (orders, on the way, delivered, cancelled, order value) and each rider's orders. New admin: Analytics › Reports › Riders, for the page's dates or "All time"; tap a rider to see their orders. Old admin: Rider Reports page, "View →" per rider. Riders are added or edited in Settings › Shipping and delivery › Manage riders (old admin: Site Settings → Riders, "Add Rider"), which only admin and owner can open.`,
    },
    {
        id: "wholesalers",
        title: "Wholesalers",
        route: "wholesalers",
        roles: FULL,
        body: `New admin: wholesale customers are the "Wholesale" chip on Customers (the old Wholesalers page opens it). Open a customer and, under Wholesale, press "Give wholesale access" or "Remove wholesale access" and confirm; they're told by email (and by text when giving access, if their account has a phone number). Only owners and admins see the button. A customer needs a shop account first; team members' accounts can't be changed here. Old admin: "Manage Wholesalers" → search an email → "Promote"; "Revoke Access" per account. Wholesale prices only apply to a wholesaler who is signed in when they check out.`,
    },
    {
        id: "discounts",
        title: "Discounts (codes)",
        route: "discounts",
        body: `New admin: Discounts lists codes and automatic discounts together (chips All / Active / Scheduled / Ended, and Codes / Automatic). "Create discount" → "Discount code" → Code (or "Make one up") → Percentage, Fixed amount, Buy X get Y, Free delivery or Sale price and the value → Applies to Everything or One category (pick it), Minimum order total, Starts, "Has an end date", "Limit total uses", "One use per customer" (checked by email and phone when they pay) → "Create discount". Open a code to change it (a code that has been used keeps its name), "Switch off" / "Switch on", Delete (tap twice), or the Results tab (paid orders, sales, given away). What checkout takes off: Percentage, products only; Fixed amount, products first and any remainder off delivery (with a category: that category's items only, never delivery); Free delivery, the delivery fee; Sale price, every item the code covers priced above the sale price sells for it; Buy X get Y, for every X+Y items the code covers the cheapest Y are free. A code never touches an item that already has an automatic discount, and with a category it only covers that category. A yellow banner warns when two discounts can apply to the same items. Old admin: "New Discount" → type (Fixed Discount, Percentage Off, Free Shipping, Sale Price, Buy X Get Y) → "Coupon Code" (or "Gen") → value → optional category, Min Order, Usage Limit, Expiry Date → "Create Discount"; click a code's Active badge to pause it. In both, owners, admins and sales staff can create, change, switch off and delete codes.`,
    },
    {
        id: "auto-discounts",
        title: "Automatic discounts",
        route: "auto_discounts",
        body: `Checkout offers that need no code. New admin: Discounts → "Create discount" → "Automatic discount" → Title (customers see it) → Percentage or Fixed amount → Applies to Everything, Categories or Products → Conditions: No conditions, Minimum order total, or Minimum number of items (counted across all qualifying items or each product on its own, with an optional order total too) → Starts and "Has an end date" → "Create discount". Open one to change it, switch it off or on, delete it, or see its Results. Old admin (Auto Discounts): "New Rule" with the same fields and an Active switch. When two automatic discounts reach the same item, the one that saves more on that cart takes it; a code only comes off items no automatic discount covers.`,
    },
    {
        id: "gift-cards",
        title: "Gift Cards",
        route: "gift_cards",
        body: `New admin: Products › Gift cards. Totals: Cards issued, Value issued, Still to spend, Used up this month. Search by code, name or email; chips All, Active, Used up, Waiting for payment, Expired, Cancelled. "Issue gift card" → amount (GH₵ 100 / 300 / 500 / Other) → recipient's name and email → From and Message → "Send gift card"; the code is emailed straight away. Tap a card for its balance and every time it was spent; its … menu has "Resend to recipient" and "Cancel gift card" (a confirmation panel: the code stops working, the balance can't be spent, no money is refunded). Old admin: "Issue Gift Card" → amount → "Recipient Email *" → optional name, sender and message → "Issue & Send Email"; "View" shows the balance, "Cancel" (permanent) and "Resend". A card's amount or balance cannot be edited. Online gift-card limits are in Content → Pages → Gift cards page (Site Settings → CMS → Gift Cards in the old admin).`,
    },
    {
        id: "products",
        title: "Products",
        route: "products",
        body: `New admin: Products (tabs Products, Inventory, Categories, Gift cards). Chips All, Active, Draft, Low stock, Sold out, No photo, Pre-order, Archived; search by name or SKU (sizes' SKUs too). Columns: product, status, stock ("12 in stock", "2 sold out · 1 low", "Pre-order · 3 weeks"), category, price and, for owners and admins, margin. Tick products for the bulk bar: Edit prices, Set as draft, Make active, Archive (tap twice; Undo in the toast) and More → Assign wholesale category (keep or replace their other categories), Pre-orders (on/off with weeks), Stop tracking stock. Archived and Draft are both hidden from the shop and the till. Old admin: Search, "Low Stock", "New Product", status and stock filters. Per row: Pre-Order "Enable" with weeks, the eye icon to hide/show in the shop, edit, delete. Bulk actions: Show, Hide, Wholesale (careful: replaces all the product's categories), Untrack, Delete.`,
    },
    {
        id: "product-form",
        title: "Adding or editing a product",
        route: "product_new",
        body: `New admin: one panel for adding and editing, tabs Details (name, web address, description, category, other categories, SKU, photos and video; up to 10, the first is the main photo), Sizes and stock (tap sizes, colours and brands from Settings → Store; "Track stock"; "Separate stock for each size and colour" with an SKU and stock for each; stock typed here is saved as a correction by you, only the difference is applied; "Stock history"; "Warn me when a size drops to"), Pricing (price, was price, On sale with discount %, and for owners and admins Cost per item with the margin; wholesale prices when wholesale is on) and Visibility (Active, Draft or Archived; Take pre-orders with weeks; Wholesale customers only). "Add product" / "Save product"; Archive (tap twice) bottom left; owners and admins can "Delete for good" from the … menu. A new product starts as a Draft. Old admin: Name, slug, categories, description, SKU, price. Variants: switch on Sizes, Colors and/or Brands and tick the options — the options come ONLY from Site Settings → Store global lists (admin/owner add missing sizes, colours or brands there first). For stock per size/colour turn on "Track Inventory" and "Track Inventory by Variant", then fill the stock matrix. A product that never runs out: turn Track Inventory off. Up to 10 photos; the first is the main image. To restock, edit the product, change the stock and "Update Product" — only the difference is applied, so sales made while the form was open are kept. Editing adds Active, Compare-at Price and On Sale with Discount %.`,
    },
    {
        id: "low-stock-page",
        title: "Low Stock page",
        route: "low_stock",
        body: `New admin: Products › Inventory lists every size and colour with its stock. KPIs: Items in stock, Sizes running low, Sizes sold out (the same numbers as Home). Chips All, Running low (at or under each product's warning level, default 2), Sold out. "Adjust" asks why: "New stock arrived", "I counted it" (sets the number you counted), "Damaged or lost" (a write-off, shown in Analytics › Stock written off) or "Fix a mistake", then shows "Stock goes from X to Y" before saving. "History" shows every sale, return, delivery, count and correction in plain words. "Export stock" downloads a CSV. A warning appears if a product's total no longer matches its sizes. Old admin: Low Stock page — active tracked products whose TOTAL stock is under 5; the edit icon opens the product. A single sold-out size is not listed there — stock_report checks every size and colour.`,
    },
    {
        id: "categories",
        title: "Categories",
        route: "categories",
        body: `New admin: Products › Categories. Search and chips (All, In the shop, Hidden, On the home page, Wholesale, Pre-order); each row has an "On home page" switch (at most 3; Undo in the toast). Tap one to edit: name, web address, description, image, Show in the shop, Show on the home page, Wholesale customers only (with tier prices), Take pre-orders with weeks (saving applies it to its products), Position in the shop menu; "Delete" (tap twice) only when no product is in it; … → "Make a wholesale copy". Old admin: Search and filters; "New Category" with name, slug, description, Wholesale and Pre-Order toggles (with weeks). Per row: Active, Featured, Duplicate as Wholesale, Edit, Delete.`,
    },
    {
        id: "customers",
        title: "Customers (Contact List) and customer profiles",
        route: "contacts",
        body: `New admin: Customers lists everyone who ordered, wrote through the contact form, sent a custom request, signed up for an account or the newsletter, or was added by the team. Chips: All, Have ordered, VIP, Wholesale, Get marketing email, Never ordered; search by name, email or phone; "Came from", tag and "Added from/to" filters; sort by most recent, spent or last order. Orders and Spent count paid orders only. Tap a customer to open their panel: Overview (Spent, Average order, Last order, contact, wholesale, orders), "Tags and notes" (tags such as VIP become list filters; private notes only the team sees) and Activity (orders, WhatsApp, contact forms, custom requests, invoices). The panel's "Create order" opens the till and "WhatsApp" opens their chat in the Inbox. "Add customer" (name, phone, email, "They agreed to marketing email"), "Import" (a CSV with an Email column) and "Export" (the filtered list, or the ticked rows). "Delete customer" (tap twice) only appears for someone the team added who has never ordered. Old admin: Contact List with Export, "Add Contact", search, source and date filters; click a row for the profile (total spent, contact details, last address, orders, forms, invoices). Only manually added contacts can be deleted.`,
    },
    {
        id: "inbox",
        title: "Inbox and WhatsApp chats",
        route: "whatsapp",
        body: `New admin: Inbox has two tabs, "Conversations" and "Teach the assistant" (owners and admins). Chips: Needs a person (the default, same count as the side menu), All, WhatsApp, Contact form, Custom requests (when switched on in Store settings) and Questions for admin (admin only); a search box finds a name, number, email or words in a message. Pick a conversation to open it beside the list (one at a time on a phone, with a back arrow). A WhatsApp chat shows every message with photos, voice notes, videos and files, markers for what happened (handed over and why, handed back, marked done, team alerted again, back with the assistant after 24 hours), and under the name the customer's orders on that number and what is in the assistant's basket. "Customer" opens their customer page when an email is known. The "…" menu has Hand back to the assistant, Hand back and reply (N waiting) when the customer's messages are unanswered, Teach the assistant from this chat, Mark as done and Open in WhatsApp. Under the chat: "Reply myself" sends from the shop's WhatsApp line (the assistant then stays quiet in that chat until it is handed back) and "Tell the assistant" (owners and admins) gives it a note for this chat and can remember it as a lesson. WhatsApp only lets us write within 24 hours of the customer's last message; the box says how long is left, after that reply from the shop's phone. "Correct" under one of the assistant's replies teaches it the right answer. Chats handed to a person go back to the assistant by themselves after 24 hours. The WhatsApp chip also shows Chats, Ordered with the assistant, Handed to your team and Waiting on your team for the last 7 days. Old admin: WhatsApp Chats page with tabs Needs you, All, Assistant, Notices, Dealt with, buttons "Reply on WhatsApp", "Dealt with" (= Mark as done) and "Hand back to assistant".`,
    },
    {
        id: "teach",
        title: "Teach the assistant",
        route: "whatsapp_teach",
        roles: FULL,
        body: `Inbox › Teach the assistant (owners and admins; "Teach the assistant" button on the old WhatsApp Chats page). "Add a note" saves something the shop assistant should always know (title and up to 400 characters; no prices or times, those come from products and hours); it uses notes on WhatsApp and the website from the next message, up to 40 at a time. Tap a note to edit it or "Retire note" (tap twice). Photo flashcards: choose up to 10 photos, the assistant guesses which piece each shows, answer That's right, Wrong (pick the product) or Skip; each answer becomes a photo lesson. The card says how many active products don't have a flashcard yet. The admin also sees "Answers Miss Tokyo AI gives staff": add, edit, choose who gets each one, or switch one off.`,
    },
    {
        id: "forms-requests",
        title: "Contact forms and custom requests",
        route: "forms",
        body: `New admin: Inbox › Contact form chip. Opening a message marks it read; reply in the box to email the customer from the shop's address (it is marked replied), or "Use my email app". The "…" menu has Mark as done (replied), Mark as unread and Open in your email app. Custom requests (when switched on in Store settings): Inbox › Custom requests chip; open one and change its Status: Inquiry → Material confirmation → Production → Completed / Cancelled. Old admin: Form Submissions (search, topic and status filters, "View" marks it read, "Mark as Replied", "Reply via Email") and Custom Requests (status per row).`,
    },
    {
        id: "invoices",
        title: "Invoices and Pay Links",
        route: "invoices",
        roles: FULL,
        body: `New admin: Orders › Invoices and pay links lists invoices, quotes and pay links (chips All, Invoices, Quotes, Pay links). "New" → Invoice, Quote or Pay link → customer name and email, lines (description, quantity, amount), tax, note → "Save draft" or "Make …". Open one to "Make a Paystack pay link", "Email to …", "Copy link to view it", "Open printable copy", "Mark as paid", or "Cancel it" (tap twice). Old admin: "New Document" (invoice or quotation, line items) and a manual status dropdown; on an invoice's own page, "Paystack Link" creates a payment link. The old Pay Links page can't produce a link; use an invoice or pay link from the new admin, or the invoice page's "Paystack Link".`,
    },
    {
        id: "settings",
        title: "Site Settings",
        route: "settings",
        roles: FULL,
        body: `New admin: Settings lists sections in groups (Store, Selling, Customers, Online store, Team, Money, Your account) with a search box that finds any setting. Edits are kept until "Save changes" in the bar at the bottom; "Discard" throws them away, and leaving with unsaved changes asks first. Store details (name, contact, logo, 8 social links); Location and pickup; Checkout (processing fee %, its label, show as its own line, undo removed items); Payments (Payment Link Hold 15/30/45, live payment status at the till); Shipping and delivery (Charge for delivery, Within Greater Accra, Outside Accra, Manage riders); Taxes; Wholesale (tiers, wholesale-only categories); Messages to customers (email, SMS and WhatsApp templates with Send a test); Assistants (AI switches, limits, WhatsApp health and AI use); Shop open or closed; Shop pages; Shop layout; Product options (sizes, colours, brands); Search engines; Staff and notifications (new-order alerts on this device). Old admin (Settings tabs): Business (logo, tax, contact, social links), Store (store pickup on/off, maintenance mode, landing page, global sizes/colours/brands, Payment Link Hold, platform fee %, checkout undo, Delivery Fees, feature toggles, wholesale tiers), Shipping (pickup instructions, address, phone, wait time), CMS, SEO, Emails (email and SMS templates, test send), Notifications (desktop alerts for new orders), Riders (Add Rider), Size Guide, Product Page.`,

    },
    {
        id: "team",
        title: "Team",
        route: "team",
        roles: FULL,
        body: `Called Staff in the new admin. Tabs: People (Active Members in the old admin), Invites (Pending Invites), What each role can do, and Activity (Activity Logs; filter by person, action and day — answers "who changed this order"). "Invite staff" ("Invite Member" in the old admin) can invite Sales staff or Admin, not Owner; to make someone an owner, change their role afterwards. Tap a person to change their role, "Send reset link" ("Reset" in the old admin), "Sign out everywhere", "Deactivate" (tap twice; they can't sign in until someone taps "Reactivate"), or "Remove from staff" (they keep a shop account). The store always keeps at least one owner. Invites can be resent or revoked (tap twice); an invite link works for 7 days.`,
    },
    {
        id: "ai-settings",
        title: "AI Settings",
        route: "ai_settings",
        roles: FULL,
        body: `Settings › Assistants in the new admin (AI Settings in the old one). Switch Miss Tokyo AI and the WhatsApp agent on or off, set the daily spend limit, and see recent usage. Also switches the Miss Tokyo AI extras: Send to admin, the bell count, walkthroughs and voice input (each off until tested).`,
    },
    {
        id: "ai-inbox",
        title: "Questions for admin (AI Inbox)",
        route: "ai_inbox",
        roles: ["admin"],
        body: `New admin: Inbox › Questions for admin chip (admin only). Open a question to read the chat before they asked, write the answer and Send; switch on "Save as an answer the assistant can give next time" (with a title) so Miss Tokyo AI gives it to the next person who asks; or Dismiss (tap twice). Saved answers are under Inbox › Teach the assistant › Answers Miss Tokyo AI gives staff. Old admin: AI Inbox (admin only). Questions staff sent with "Send to admin" when Miss Tokyo AI couldn't answer. Open tab: read the chat before they asked, write a reply ("Send reply"), and tick "Also save as an answer for all staff" so the assistant gives that answer next time; or Dismiss (tap twice). The reply appears in the asker's Miss Tokyo AI chat. Saved answers tab: add, edit, choose which roles see each one, or switch one off. Nothing is deleted.`,
    },
];

/** Things the dashboard cannot do. Stops the assistant inventing workarounds. */
export const CANNOT_DO: string[] = [
    "Send a card or Mobile money refund through Paystack while refunds through Paystack are switched off (the default): refund in the Paystack dashboard, then record it on the order. In the old admin, Refund only marks the order and returns stock.",
    "Edit items, quantities, prices, address or customer details on an existing order.",
    "Change or cancel a POS sale after it is paid (cancel or refund its order instead).",
    "Delete an order.",
    "Delete a customer who came from orders, the newsletter or requests (only manual contacts).",
    "Restore a gift card's balance by cancelling or refunding an order paid with it, or edit a gift card's amount.",
    "Sell at a custom price, give a manual discount amount, or sell an item that is not in the catalogue at the till.",
    "Split one till payment between cash and card (a gift card plus a link for the rest does work).",
    "Invite an Owner from the Team page.",
    "Type a new size, colour or brand on the product form (add it to Site Settings → Store first).",
    "Import products or stock from a CSV file (Inventory can export stock, not import it).",
];

export function guideFor(role: StaffRole): GuideEntry[] {
    return GUIDE.filter(e => !e.roles || e.roles.includes(role));
}
