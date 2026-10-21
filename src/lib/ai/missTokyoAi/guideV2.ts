// The new admin's guide (admin v2), written from its page code in
// src/components/admin/v2/** and src/components/admin/shell/**. Only new-admin
// names: an entry shows only while its area is on (guide.ts guideFor), and a
// test fails if an old label creeps in. Places in other areas come from
// placeNames, because Products, Orders and the Till switch on separately.
import type { GuideEntry } from "@/lib/ai/missTokyoAi/guide";
import type { StaffRole, V2RouteKey } from "@/lib/ai/missTokyoAi/routes";
import { placeNames } from "@/lib/ai/missTokyoAi/guideNames";
import { isOn, type AdminView } from "@/lib/ai/missTokyoAi/view";

const FULL: StaffRole[] = ["admin", "owner"];

type V2Entry = GuideEntry & { route?: V2RouteKey };

const refundRule = (v: AdminView) => v.refundsLive
    ? `Card and Mobile money refunds go back to the customer through Paystack ("Refund through Paystack": the money returns to their card or Mobile money; the button says Refund GH₵ X). Cash refunds are recorded only (give the money back yourself) and gift card refunds are recorded only (nothing goes back on the card). If Paystack can't finish a refund, the order shows "Paystack couldn't complete the refund".`
    : `Refunds through Paystack are switched off: refund the card or Mobile money payment in the Paystack dashboard first, then record it on the order (the button says Record GH₵ X). Cash and gift card refunds are recorded only.`;

export const V2_GUIDE: V2Entry[] = [
    {
        id: "everywhere",
        title: "Anywhere in the dashboard",
        area: "shell",
        body: v => `The side menu: Home, Inbox, Orders, Till, Products, Customers, Discounts, Content and Analytics, then a General group with Staff, Billing and Settings. Content, Staff, Billing and Settings are for owners and admins only. Inbox shows how many conversations need a person and Orders how many orders are waiting to pack. At the bottom of the menu: View store (opens the shop) and Collapse the menu (Expand the menu brings it back); on a phone the menu opens from the ☰ button. The top bar's "Search orders, products, customers" (or ⌘K / Ctrl K) finds orders by receipt number, products by name or SKU and customers by name, email or phone, and its "Go to" list opens any page in the menu. The bell in the top bar (when "Bell count" is on in Settings › Assistants) shows unread replies to questions sent to the admin, or, for the admin, the open Questions for admin. Your name at the top right opens your account menu: Your account, Light theme, Dark theme, Match this device and Sign out.${v.preview ? ` This device is only previewing the new admin; that menu also has "Back to the old admin", which takes this device back to the old pages.` : ""}`,
    },
    {
        id: "home",
        title: "Home",
        area: "home",
        route: "home",
        body: `Home is the first page after signing in. "Open the till" at the top; banners when WhatsApp credit is running low ("Top up"), when a paid order had been cancelled, and to turn on new-order alerts on this device ("Turn on"). "Needs you today": orders waiting to pack ("Pack orders"), checkouts waiting for payment ("Check payments"), orders ready for collection with how long the oldest has waited, conversations that need a person ("Open inbox"), return requests from WhatsApp, sizes running low or sold out (counted per size and colour at each product's warning level, default 2 or fewer; "Restock") and products with no photo ("Add photos"); "You're all caught up" when nothing needs you. "Sales so far" for Today / 7 days / 30 days: Sales, Orders and Average order, each with the change against the same stretch before, and Cash to count at close. Then Latest orders ("All orders") and Team activity.`,
    },
    {
        id: "inbox",
        title: "Inbox and WhatsApp chats",
        area: "inbox",
        route: "inbox",
        body: v => `Inbox has the tabs Conversations and Teach the assistant (owners and admins). Chips: Needs a person (the default, the same count as the side menu), All, WhatsApp, Contact form, Custom requests (only while ${placeNames(v).requestsSwitch} is on) and Questions for admin (admin only); "Search name, number, email or message" searches everything. Pick a conversation to open it beside the list (one at a time on a phone, with a back arrow). The WhatsApp chip has its own chips All, Needs a person, With the assistant, Order updates only and Done, and shows Chats, Ordered with the assistant, Handed to your team and Waiting on your team for the last 7 days. A WhatsApp chat shows every message with photos, voice notes, videos and files, markers for what happened (handed over and why, handed back, marked done, back with the assistant after 24 hours), and under the name the customer's orders on that number and what is in the assistant's basket. "Customer" opens their customer page when an email is known. The chat's "…" menu: Hand back to the assistant, "Hand back and reply (N waiting)" when the customer's messages are unanswered (or "Assistant: reply (N waiting)" while it's with the assistant), Teach the assistant from this chat (owners and admins), Mark as done and Open in WhatsApp. Under the chat: "Reply myself" sends from the shop's WhatsApp line (the assistant then stays quiet in that chat until it is handed back) and "Tell the assistant" (owners and admins) gives it a note for this chat, with "Remember this for next time" to save it as a lesson. WhatsApp only lets the shop write within 24 hours of the customer's last message; the box says how long is left, and after that "WhatsApp won't deliver a message from here": reply from the shop's phone. "Correct" under one of the assistant's replies (owners and admins) teaches it the right answer and can send it to the customer now. Chats handed to a person go back to the assistant by themselves after 24 hours.`,
    },
    {
        id: "teach",
        title: "Teach the assistant",
        area: "inbox",
        route: "inbox_teach",
        roles: FULL,
        body: `Inbox › Teach the assistant (owners and admins). "Notes the assistant uses": "Add a note" saves something the shop assistant should always know (title and up to 400 characters; keep prices and times out, those come from products and hours); it uses notes on WhatsApp and the website from the next message, up to 40 at a time. Tap a note to edit it or "Retire note" (tap twice). "Photo flashcards": "Choose photos" (up to 10), the assistant guesses which piece each shows, answer That's right, Wrong (pick the product) or Skip; each answer becomes a photo lesson; the card says how many active products don't have a flashcard yet. The admin also sees "Answers Miss Tokyo AI gives staff": "Add an answer", edit one, choose who gets it (Admin, Owner, Sales staff), or switch "In use" off (kept, never deleted).`,
    },
    {
        id: "forms-requests",
        title: "Contact forms and custom requests",
        area: "inbox",
        route: "inbox_forms",
        body: v => `Inbox › Contact form chip: messages sent from the shop's Contact page. Opening one marks it read. Type in "Reply by email" and press Send to email the customer from the shop's address (it is marked replied), or "Use my email app". The "…" menu has Mark as done, Mark as unread, Mark as read, not replied, and Open in your email app. Custom requests chip (while ${placeNames(v).requestsSwitch} is on): bespoke requests from the website; open one and change its Status (Inquiry, Material confirmation, Production, Completed, Cancelled); changes save straight away; reply to the customer by email.`,
    },
    {
        id: "ai-inbox",
        title: "Questions for admin",
        area: "inbox",
        route: "inbox_questions",
        roles: ["admin"],
        body: `Inbox › Questions for admin chip (admin only): questions staff sent with "Send to admin" when Miss Tokyo AI couldn't answer. Open one to read "Their chat with Miss Tokyo AI before they asked", write the answer and press Send; switch on "Save as an answer the assistant can give next time" (with a title) so Miss Tokyo AI gives it to the next person who asks; or Dismiss (tap twice). The answer appears in the asker's Miss Tokyo AI chat. Saved answers are under Inbox › Teach the assistant › Answers Miss Tokyo AI gives staff.`,
    },
    {
        id: "orders",
        title: "Orders",
        area: "orders",
        route: "orders",
        body: `Orders has the tabs Orders, Abandoned checkouts and Invoices and pay links (owners and admins), and "Create order" (opens the till). Chips: All, Waiting to pack (the same count as Home and the side menu), Packed, Out for delivery, Ready for collection, Delivered or collected, Waiting for payment, Cancelled and refunded. "Search by order number, name or phone", a Payment method filter (Card or Mobile money, Cash, Gift card), a Channel filter (Online shop, Till, WhatsApp, Shop assistant), "Pre-orders only", Placed from / to dates and "Clear filters"; 25 a page. Tick orders for the bar: "Mark as packed" (unpaid or partly packed orders are skipped and the message says how many), "Assign rider and send" (packed delivery orders), "Tell customers it's ready" (packed pickup orders), "Mark as delivered", "Print packing slips" and "Export". Tap an order to open its panel.`,
    },
    {
        id: "order-detail",
        title: "An order's panel",
        area: "orders",
        route: "orders",
        body: v => `An order opens as a panel over the list, with Details and Timeline tabs (Timeline: payments, packing, messages to the customer and refunds as they happened). It shows the payment and delivery badges, banners (unpaid for a day or more, pre-order items, items still to send, a refund Paystack couldn't finish), the Order progress steps, the items, the Payment card (items, discounts, delivery, processing fee, total, refunded, paid by, and the Paystack fee and "You receive" when Paystack sent them) with "Check with Paystack", the customer (WhatsApp and Email buttons, the address or pickup, the rider), "Staff notes" (only the team sees them; saved when you click away) and "Send a note to the customer" (by WhatsApp, which only arrives if they messaged the shop in the last 24 hours, or Email; it shows in the timeline). One main button at the bottom by state: Check with Paystack, Mark as packed (choose how many of each item go in the parcel; anything left out stays as still to send and the order shows "Partly sent"), Send remaining items, Tell customer it's ready, Assign rider and send (pick a rider, "Text the rider", "Tell the customer", then "Send with <rider>"), Mark as delivered, Mark as collected. The "…" menu: Mark as paid (unpaid orders, anyone on staff: for money seen another way such as cash, bank transfer or Mobile money outside Paystack; Paystack isn't checked, the items are taken from stock, no email goes out), Resend confirmation, Print receipt, Copy delivery details, Open customer, New sale for this customer. When Check with Paystack finds a payment the order doesn't show, "Mark this order paid" appears (anyone on staff; the customer gets the confirmation email). Bottom left: Refund (owners and admins only: Everything, Choose items or An amount; "Put the items back in stock"; a Reason; "Email the customer"; it shows what will happen before you confirm) and Cancel order (asks first: for a paid order "Cancel and refund" (owners and admins) or "Cancel without a refund", and "Tell the customer"; the stock goes back). ${refundRule(v)}`,
    },
    {
        id: "cancelled-but-paid",
        title: "Order shows cancelled but the customer paid",
        area: "orders",
        body: `Unpaid online orders are cancelled automatically 20 minutes after checkout (checked every 30 minutes). A late payment reverses those automatic cancellations, and a nightly job at 23:30 repairs the rest; staff cancellations are final. To fix one now: open the order → "Check with Paystack" → "Mark this order paid" (anyone on staff).`,
    },
    {
        id: "pre-orders",
        title: "Pre-orders",
        area: "orders",
        route: "pre_orders",
        body: `Orders › "Pre-orders only" shows Pre-orders waiting for stock, Pre-orders sent and Pre-orders cancelled, and the orders with a pre-order item. An order's panel says which items are on pre-order: send the regular items now and the rest when the stock arrives.`,
    },
    {
        id: "abandoned",
        title: "Abandoned checkouts",
        area: "orders",
        route: "abandoned",
        body: `Orders › Abandoned checkouts: checkouts that never became a payment (including those the unpaid-order sweep cancelled), with Checkouts not finished, Value left in carts and Recovered after a reminder (paid within 7 days), for Today / 7 days / 30 days / All time. "Send reminder" / "Send again" emails the customer (owners and admins); "Paid later" means they bought since. The shop also emails one reminder on its own, a day after a checkout that never reached payment.`,
    },
    {
        id: "invoices",
        title: "Invoices and pay links",
        area: "orders",
        route: "invoices",
        roles: FULL,
        body: `Orders › Invoices and pay links (owners and admins) lists invoices, quotes and pay links (chips All, Invoices, Quotes, Pay links). "New" → Invoice (a bill the customer pays online), Quote (a price to approve; nothing is charged) or Pay link (a one-off amount; no stock is held) → customer name and email, lines (description, quantity, amount), Tax (the default comes from Settings › Taxes), a note → "Save draft" or "Make …". Open one to "Make a Paystack pay link", email it to the customer, "Copy link to view it", "Copy pay link", "Open printable copy", "Mark as paid" or "Cancel it" (tap twice). The processing fee is added when the customer pays by pay link. To send one on WhatsApp or by SMS, copy a link and paste it into your message.`,
    },
    {
        id: "till",
        title: "Till",
        area: "till",
        route: "till",
        body: v => `Till › New sale: products on the left with "Search by name or SKU" and category chips; each tile shows its price and "N left", "Pre-order" or "Sold out" (sold-out tiles can't be tapped). Tap a product to pick its Size, Colour and Brand, then "Add to sale". The Sale card on the right: quantity steppers, Customer ("Find a customer" or "New customer" with name and optional email), Phone (their order number goes there by text; a pay link needs it), "How they get it" (Taking it now, Deliver in Accra or Outside Accra, then the address), "Discount or gift card code" and Apply, "Staff notes (optional)", then the totals. Payment: Cash ("Counted into the drawer at close"; cash has NO processing fee), "Send a pay link" (card or Mobile money; needs the phone; goes by text and, with an email, by email; the processing fee from ${placeNames(v).fee} is added; the items are held for the time in ${placeNames(v).payHold}) or Gift card (enter its code under Discount or gift card; if it doesn't cover everything, pay the rest by Cash or Send a pay link). Every till sale needs a customer with a phone or email. Cash opens "Take GH₵ X cash": type what you were handed (or tap a quick amount or Exact) to see the change, then "Record GH₵ X cash". A pay link shows "Waiting for … to pay" with the hold counting down, "Copy link", "Send on WhatsApp" (opens WhatsApp on this device), "Send again", "Cancel sale" (tap twice) and "Start another sale" (the link stays open in Today's sales). When a code covers everything the button is "Complete sale · nothing to pay". "Reprint last receipt" at the top, "Print receipt" after a sale. A customer's "Create order" and an order's "New sale for this customer" open the till with them already chosen.`,
    },
    {
        id: "till-today",
        title: "Today's sales (till history)",
        area: "till",
        route: "till_today",
        body: `Till › Today's sales (sales staff see "My sales today", only their own): Cash to count at close (paid cash sales today), Till sales today and Pay links waiting, then the sales with a search (sale ref, name, email or phone), When (Today, Yesterday, Last 7 days, All dates, Choose dates), Sold by (owners and admins) and status chips All, Waiting for payment, Paid, Not sent, Expired, Cancelled; 50 a page. Tap a sale for its items, totals, customer and how they get it, with "Copy pay link" (waiting), "Open order" (paid), "Print receipt" and "Cancel sale" (tap twice; only unpaid sales, and sales staff only their own). A paid sale can't be cancelled here: cancel or refund its order instead.`,
    },
    {
        id: "products",
        title: "Products",
        area: "products",
        route: "catalogue",
        body: `Products has the tabs Products, Inventory, Categories and Gift cards. Chips All, Active, Draft, Low stock, Sold out, No photo, Pre-order, Archived; search by name or SKU (sizes' SKUs too). Columns: product, status, stock ("12 in stock", "2 sold out · 1 low", "Pre-order · 3 weeks"), category, price and, for owners and admins, margin. "Add product" opens the product panel. Tick products for the bar: Edit prices, Set as draft, Make active, Archive (tap twice; Undo in the toast) and More → Assign wholesale category (keep or replace their other categories), Pre-orders (on/off with weeks), Stop tracking stock. Archived and Draft are both hidden from the shop and the till.`,
    },
    {
        id: "product-form",
        title: "Adding or editing a product",
        area: "products",
        route: "product_new",
        body: v => `One panel for adding and editing, tabs Details (name, web address, description, category, other categories, SKU, photos and video; up to 10, the first is the main photo), Sizes and stock (tap the sizes, colours and brands from ${placeNames(v).options}; "Track stock"; "Separate stock for each size and colour" with an SKU and stock for each; stock typed here is saved as a correction by you and only the difference is applied; "Stock history"; "Warn me when a size drops to"), Pricing (price, was price, On sale with discount %, and for owners and admins "Cost per item" with the margin; wholesale prices when wholesale is on) and Visibility (Active, Draft or Archived; Take pre-orders with weeks; Wholesale customers only). "Add product" / "Save product"; Archive (tap twice) bottom left; owners and admins can "Delete for good" from the … menu. A new product starts as a Draft.`,
    },
    {
        id: "inventory",
        title: "Inventory (stock counts and adjustments)",
        area: "products",
        route: "inventory",
        body: v => `Products › Inventory lists every size and colour with its stock. KPIs: Items in stock, Sizes running low, Sizes sold out (the same numbers as Home). Chips All, Running low (at or under each product's warning level, default 2), Sold out. "Adjust" asks why: "New stock arrived" (adds to what's there), "I counted it" (replaces the number with what you counted on the shelf), "Damaged or lost" (a write-off, shown in ${placeNames(v).writeOffs}) or "Fix a mistake" (adds or removes a few), then shows "Stock goes from X to Y" before saving. "History" shows every sale, return, delivery, count and correction in plain words. "Export stock" downloads a CSV. A warning appears if a product's total no longer matches its sizes.`,
    },
    {
        id: "categories",
        title: "Categories",
        area: "products",
        route: "categories",
        body: `Products › Categories. Search and chips (All, In the shop, Hidden, On the home page, Wholesale, Pre-order); each row has an "On home page" switch (at most 3; Undo in the toast). Tap one to edit: name, web address, description, image, Show in the shop, Show on the home page, Wholesale customers only (with tier prices), Take pre-orders with weeks (saving applies it to its products), Position in the shop menu; "Delete" (tap twice) only when no product is in it; … → "Make a wholesale copy".`,
    },
    {
        id: "gift-cards",
        title: "Gift cards",
        area: "products",
        route: "gift_cards",
        body: v => `Products › Gift cards. Totals: Cards issued, Value issued, Still to spend, Used up this month. Search by code, name or email; chips All, Active, Used up, Waiting for payment, Expired, Cancelled. "Issue gift card" → amount (GH₵ 100 / 300 / 500 / Other) → recipient's name and email → From and Message → "Send gift card"; the code is emailed straight away. Tap a card for its balance and every time it was spent; its … menu has "Resend to recipient" and "Cancel gift card" (the code stops working, the balance can't be spent, no money is refunded). A card's amount or balance cannot be edited. Online gift-card limits are in ${placeNames(v).giftCardPage}.`,
    },
    {
        id: "customers",
        title: "Customers and customer profiles",
        area: "customers",
        route: "customers",
        body: v => `Customers lists everyone who ordered, wrote through the contact form, sent a custom request, signed up for an account or the newsletter, or was added by the team. Chips: All, Have ordered, VIP, Wholesale, Get marketing email, Never ordered; "Search by name, email or phone"; Came from, Tag and Added from filters; Sort by most recent, spent or last order. Orders and Spent count paid orders only. Tap a customer to open their panel: first their Spent, Average order, Last order, contact details, wholesale and orders, then the tabs "Tags and notes" (tags such as VIP become list filters; private notes only the team sees) and Activity (orders, WhatsApp, contact forms, custom requests, invoices). The panel's "Create order" opens ${placeNames(v).till} with them chosen and "WhatsApp" opens their chat in ${placeNames(v).inbox}. "Add customer" (name, phone, email, "They agreed to marketing email"), "Import" (a CSV with an Email column) and "Export" (the filtered list, or "Export selected" for ticked rows). "Delete customer" (tap twice) only appears for someone the team added who has never ordered.`,
    },
    {
        id: "wholesale",
        title: "Wholesale customers",
        area: "customers",
        route: "wholesale",
        body: `Wholesale customers are the "Wholesale" chip on Customers. To give someone wholesale access: open the customer and, under Wholesale, press "Give wholesale access" (or "Remove wholesale access") and confirm; they're told by email (and by text when giving access, if their account has a phone number). Only owners and admins see that button. A customer needs a shop account first; team members' accounts can't be changed here. Wholesale prices only apply to a wholesaler who is signed in when they check out; the tiers and wholesale-only categories are in Settings › Wholesale.`,
    },
    {
        id: "discounts",
        title: "Discounts (codes)",
        area: "discounts",
        route: "discounts",
        body: `Discounts lists codes and automatic discounts together (status chips All / Active / Scheduled / Ended, and All types / Codes / Automatic). "Create discount" → "Discount code" → Code (or "Make one up") → Percentage, Fixed amount, Buy X get Y, Free delivery or Sale price and the value → Applies to Everything or One category (pick it), Minimum order total, Starts, "Has an end date", "Limit total uses", "One use per customer" (checked by email and phone when they pay) → "Create discount". Open a discount for the tabs "Set up" (change it; a code that has been used keeps its name; "Switch off" / "Switch on"; Delete, tap twice) and Results (paid orders, sales, given away). Owners, admins and sales staff can create, change, switch off and delete discounts. What checkout takes off: Percentage, products only; Fixed amount, products first and any remainder off delivery (with a category: that category's items only, never delivery); Free delivery, the delivery fee; Sale price, every item the code covers priced above the sale price sells for it; Buy X get Y, for every X+Y items the code covers the cheapest Y are free. A code never touches an item that already has an automatic discount, and with a category it only covers that category. A banner warns when two discounts can apply to the same items.`,
    },
    {
        id: "auto-discounts",
        title: "Automatic discounts",
        area: "discounts",
        route: "auto_discounts",
        body: `Checkout offers that need no code. Discounts → "Create discount" → "Automatic discount" → Title (customers see it) → Percentage or Fixed amount → Applies to Everything, Categories or Products → Conditions: No conditions, Minimum order total, or Minimum number of items (counted across all qualifying items or each product on its own, with an optional order total too) → Starts and "Has an end date" → "Create discount". Open one to change it, switch it off or on, delete it, or see its Results. When two automatic discounts reach the same item, the one that saves more on that cart takes it; a code only comes off items no automatic discount covers.`,
    },
    {
        id: "content",
        title: "Content (the shop's pages, menu, reviews and wording)",
        area: "content",
        route: "content",
        roles: FULL,
        body: `Content (owners and admins) changes what the shop shows; changes are live on the shop. Tabs: Home page, Pages, Menu, Reviews, Shop wording, and "View shop". Home page: Hero slides ("Add slide", Edit, drag to reorder) and "Home page sections" in order (Hero slides, Promise strip, Featured categories, New arrivals, Customer reviews, Newsletter sign-up, Instagram posts), each with a switch and a move; switches and moves take effect straight away (Undo in the toast). Pages: Shop page, About, Size guide, Shipping policy, Refund policy, Privacy policy, Terms and conditions, FAQ and Gift cards page; tap one to edit its text (a policy has an opening paragraph and sections with headings; "Original wording" puts the old text back) and its Search engine text; below, "Product page" switches for Product details, Care instructions, Delivery and returns, Promise icons and Customer reviews. Menu: the shop menu's links (Home, Shop, New arrivals, Sale, Gallery, Gift cards, About, Contact…), each with a switch; keep at least one. Reviews: "Add review" (name, where they're from, rating, what they said, initials and avatar colour), edit, hide or delete the reviews the home page shows. Shop wording: "Text and copy" and "Images", "Search shop wording", change any wording or image a shop page reads, or "Use the original wording".`,
    },
    {
        id: "analytics",
        title: "Analytics",
        area: "analytics",
        route: "analytics",
        body: `Analytics: pick Today, 7 days, 30 days, 90 days or Custom (From and To dates), and "Compare with" the previous period or the same period last year. Paid orders only. KPIs: Sales, Orders, Average order and Returning customers (the share of paid orders with an email whose customer had paid before), each with its change. Then "Sales by day" (or by hour), Top products, Sales by channel and Reports; each report opens with its own "Export CSV": Sales by product, Sales by size and colour, Sales by channel, Discounts (tap one for its orders), Payments received (every payment by method; Paystack can't tell card from Mobile money, so they're counted together; "These dates" or "All time"), Riders (deliveries per rider; tap a rider for their orders; "These dates" or "All time"), Cash taken at the till, Stock written off (stock taken off by hand), Customers (unique and repeat buyers, new customers, newsletter sign-ups, bespoke inquiries, top customers), When people buy (by day, hour and day of the week) and Where orders go. "Export CSV" at the top downloads the page's summary.`,
    },
    {
        id: "riders",
        title: "Riders",
        area: "analytics",
        route: "analytics",
        body: v => `Rider delivery stats are Analytics › Reports › Riders (orders, on the way, delivered, cancelled, order value), for the page's dates or "All time"; tap a rider to see their orders. Riders are added or edited in ${placeNames(v).riders} (owners and admins).`,
    },
    {
        id: "staff",
        title: "Staff",
        area: "staff",
        route: "staff",
        roles: FULL,
        body: `Staff (owners and admins): tabs People, Invites, What each role can do, and Activity (filter by person, action and day — answers "who changed this order"). "Invite staff" (name, email, optional phone: the invite link is texted too) can invite Sales staff or Admin, not Owner; to make someone an owner, change their role afterwards. Tap a person to change their role, "Send reset link", "Sign out everywhere" (ends their session on every phone and computer), "Deactivate" (tap twice; they can't sign in until someone taps "Reactivate"), or "Remove from staff" (they keep a shop account). The store always keeps at least one owner. Invites can be resent ("Send again") or revoked (tap twice); an invite link works for 7 days.`,
    },
    {
        id: "billing",
        title: "Billing",
        area: "billing",
        route: "billing",
        roles: FULL,
        body: `Billing (owners and admins) is a preview and isn't connected yet: the page says "Billing isn't connected yet". Its plan, running costs (Paystack fees, WhatsApp messages, AI use), payment method and payment history are sample figures, not the shop's real numbers: never quote them, and say plainly that billing isn't connected yet. Nothing can be paid or changed there. Real takings are in Analytics (Payments received) and the Paystack dashboard; payouts go to the bank account set in Paystack (Settings › Plan and payouts).`,
    },
    {
        id: "settings",
        title: "Settings",
        area: "settings",
        route: "settings",
        roles: FULL,
        body: `Settings (owners and admins) lists sections in groups, with a search box that finds any setting. Store: Store details (name, contact email and phone, address, logo, tagline, social links, Instagram feed key), Location and pickup (Let customers collect orders, pickup address, phone, "Usually ready in", pickup instructions), Policies (links to Content › Pages, where the policy text is edited). Selling: Checkout (Processing fee %, what the fee is called, show it as its own line, let customers undo a removed item), Payments (Paystack status, cash at the till, "Pay links hold the stock for" 15/30/45 minutes, "Show live payment status at the till"), Shipping and delivery (Charge for delivery, Within Greater Accra, Outside Accra, and "Manage riders" to add, edit or switch off riders), Taxes (tax on new invoices), Wholesale (Wholesale prices, Tier 1–3, Wholesale-only categories). Customers: Customer accounts, Messages to customers (the email, SMS and WhatsApp template for each order step, with a test send; Order updates on WhatsApp, Unpaid order reminder, Back-in-stock alerts), Assistants (Ask Miss Tokyo on the shop, WhatsApp assistant, Miss Tokyo AI for staff, the daily AI spending limit and AI use, WhatsApp handover and alerts, and the Miss Tokyo AI extras: Send to admin, Bell count, Walkthroughs, Voice input, Help on payment errors, Error log). Online store: Domain and home page (first page visitors see), Shop open or closed, Shop pages (Gift cards, Gallery, The craft, White label, Custom requests), Shop layout, Product options (the sizes, colours and brands products can use), Search engines. Team: Staff and notifications (new-order alerts on this device). Money: Plan and payouts. Admin: New admin rollout (the switches for the new admin). Your account. Edits are kept until "Save changes" in the bar at the bottom; "Discard" throws them away, and leaving with unsaved changes asks first ("Leave without saving?").`,
    },
    {
        id: "account",
        title: "Your account",
        area: "settings",
        route: "account",
        body: `Settings › Your account (everyone, sales staff too; also in the account menu under your name at the top right): your name, sign-in email and password, Appearance (light, dark or match this device), "Two-step sign-in" (set it up with an authenticator app: scan the code or type the key, then enter the 6-digit code; "Turn off" to stop), and "Where you're signed in" with "Sign out other devices".`,
    },
];

/** Things the new dashboard cannot do. Each returns null when it doesn't apply to this view. */
export const V2_CANNOT_DO: ((v: AdminView) => string | null)[] = [
    v => (isOn(v, "orders") && !v.refundsLive ? "Send a card or Mobile money refund through Paystack while refunds through Paystack are switched off: refund in the Paystack dashboard, then record it on the order." : null),
    v => (isOn(v, "orders") ? null : "Send a refund through Paystack from the order page: Refund only marks the order and returns stock. Refund in the Paystack dashboard."),
    () => "Edit items, quantities, prices, address or customer details on an existing order.",
    () => "Change or cancel a till sale after it is paid (cancel or refund its order instead).",
    () => "Delete an order.",
    v => (isOn(v, "customers")
        ? "Delete a customer who ordered or came from the newsletter, a form or a request (only customers the team added who never ordered)."
        : "Delete a customer who came from orders, the newsletter or requests (only manual contacts)."),
    () => "Restore a gift card's balance by cancelling or refunding an order paid with it, or edit a gift card's amount.",
    () => "Sell at a custom price, give a manual discount amount, or sell an item that is not in the catalogue at the till.",
    () => "Split one till payment between cash and card (a gift card plus a pay link or cash for the rest does work).",
    v => (isOn(v, "staff") ? "Invite an Owner from Staff (invite them as Admin, then change their role)." : "Invite an Owner from the Team page."),
    v => `Type a new size, colour or brand on the product form (add it to ${placeNames(v).options} first).`,
    v => (isOn(v, "products") ? "Import products or stock from a CSV file (Inventory can export stock, not import it)." : "Import products or stock from a CSV file."),
    v => (isOn(v, "billing") ? "Pay for the plan, change the payment method or download real receipts in Billing: it isn't connected yet." : null),
];
