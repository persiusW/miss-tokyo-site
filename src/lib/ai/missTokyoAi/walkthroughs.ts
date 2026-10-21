// Step-by-step tours Miss Tokyo AI can start. Each step names the page it is
// on and, where one exists, a registered control to ring. A step with no
// anchor just shows its text. tests/e2e/unit/mtai-walkthroughs.spec.ts checks
// every step's page and control against the registries and the roles.
import type { AnchorId } from "@/lib/ai/missTokyoAi/anchors";
import type { RouteKey, StaffRole } from "@/lib/ai/missTokyoAi/routes";

/** orderPage: the step happens on any order's own page (/sales/orders/<id>). */
export type WalkStep = { route: RouteKey; anchor?: AnchorId; text: string; orderPage?: true };
export type Walkthrough = { id: string; title: string; roles: StaffRole[]; steps: WalkStep[] };

const ALL: StaffRole[] = ["admin", "owner", "sales_staff"];

export const WALKTHROUGHS = [
    {
        id: "pos-sale",
        title: "Ring up a sale at the till",
        roles: ALL,
        steps: [
            { route: "pos", anchor: "pos.search", text: "Search for the product by name or SKU. Pick its size, colour or brand on the card, then press Add." },
            { route: "pos", anchor: "pos.phone", text: "Attach the customer (Existing or New). A phone number is needed to send a pay link." },
            { route: "pos", anchor: "pos.code", text: "Optional: enter a gift card or discount code. Then choose Store Pickup or Delivery." },
            { route: "pos", anchor: "pos.send-link", text: "To take payment by link, press Send Link. The customer gets it by SMS and email, and the stock is held while they pay." },
            { route: "pos", anchor: "pos.cash", text: "For cash, press Cash Received, then press it again within 4 seconds to confirm." },
        ],
    },
    {
        id: "check-paid",
        title: "Find an order and check it's paid",
        roles: ALL,
        steps: [
            { route: "orders", anchor: "topbar.search", text: "From any page, search the order's 8-character ref, the customer's name or phone." },
            { route: "orders", anchor: "orders.tabs", text: "Or on Orders, choose the All chip (All tab in the old admin), so unpaid and cancelled orders are included too." },
            { route: "orders", anchor: "orders.search", text: "Search by order number, name or phone, then open the order." },
            { route: "orders", orderPage: true, anchor: "order.verify", text: "On the order, press Check with Paystack (Verify with Paystack in the old admin). It only checks and changes nothing. If Paystack says paid but the order doesn't, an admin or owner can mark it paid." },
        ],
    },
    {
        id: "dispatch",
        title: "Dispatch orders to a rider",
        roles: ALL,
        steps: [
            { route: "orders", anchor: "orders.row-select", text: "In Waiting to pack (the Inbox tab in the old admin), tick the delivery orders you have packed." },
            { route: "orders", anchor: "orders.bulk-pack", text: "Press Mark as packed (Mark Packed in the old admin). They move to Packed." },
            { route: "orders", anchor: "orders.tabs", text: "Open Packed and tick the delivery orders going out now." },
            { route: "orders", anchor: "orders.bulk-ship", text: "Press Assign rider and send (Assign Rider & Ship in the old admin). For one order, use the button on the order." },
            { route: "orders", anchor: "orders.dispatch-confirm", text: "Choose the rider and whether to text the rider and tell the customer, then press Send with the rider's name (Confirm Dispatch in the old admin)." },
            { route: "orders", anchor: "orders.row-menu", text: "When the rider has delivered, open the order and press Mark as delivered (old admin: the order's … menu, Mark Fulfilled)." },
        ],
    },
    {
        id: "pickup-ready",
        title: "Get a pickup order ready for collection",
        roles: ALL,
        steps: [
            { route: "orders", anchor: "orders.row-select", text: "In Waiting to pack (the Inbox tab in the old admin), tick the pickup orders you have packed." },
            { route: "orders", anchor: "orders.bulk-pack", text: "Press Mark as packed (Mark Packed in the old admin). They move to Packed." },
            { route: "orders", anchor: "orders.tabs", text: "Open Packed and tick the pickup orders." },
            { route: "orders", anchor: "orders.bulk-pickup", text: "Press Tell customers it's ready (Mark Ready for Pickup in the old admin). The customer gets an email and SMS saying it's ready." },
            { route: "orders", anchor: "orders.tabs", text: "They now wait in Ready for collection (Pickups in the old admin) until collected." },
            { route: "orders", orderPage: true, anchor: "order.mark-collected", text: "When the customer collects, open the order and press Mark as collected (Mark Collected in the old admin)." },
        ],
    },
    {
        id: "cancel-refund",
        title: "Cancel or refund an order",
        roles: ALL,
        steps: [
            { route: "orders", orderPage: true, anchor: "order.cancel", text: "Open the order and press Cancel order. The new admin asks first (cancel and refund, or cancel without a refund, and whether to tell the customer); the old admin's Cancel works at once. Either way the stock the order took goes back." },
            { route: "orders", orderPage: true, anchor: "order.refund", text: "Refund (owners and admins) refunds everything, chosen items or an amount, and can put items back in stock. While refunds through Paystack are off, refund in the Paystack dashboard first, then press Record. The old admin's Refund only marks the order and returns stock." },
            { route: "pos_history", anchor: "poshistory.cancel", text: "For an unpaid till link, open the session in POS History and press Cancel Session. A paid till sale is cancelled or refunded from its order instead." },
        ],
    },
    {
        id: "add-product",
        title: "Add a new product",
        roles: ALL,
        steps: [
            { route: "products", anchor: "products.new", text: "Press Add product (New Product in the old admin)." },
            { route: "product_new", text: "Fill in the name and category (Details), then the price (Pricing)." },
            { route: "product_new", text: "Under Sizes and stock, tap the sizes, colours or brands you stock (old admin: switch on Sizes, Colors or Brands and tick them). Missing an option? An admin or owner adds it in Settings → Store first." },
            { route: "product_new", text: "Switch on \"Separate stock for each size and colour\" (Track Inventory by Variant in the old admin) and enter each one's stock, add the photos on Details (the first is the main image), choose Active or Draft under Visibility, then press Add product." },
        ],
    },
    {
        id: "restock",
        title: "Restock from the low-stock list",
        roles: ALL,
        steps: [
            { route: "products", anchor: "products.low-stock", text: "Tap the Low stock chip to see what is running out (the Low Stock button in the old admin). Products › Inventory › Running low lists each size." },
            { route: "low_stock", text: "In Products › Inventory, press Adjust on the size, choose \"New stock arrived\" and enter how many came in (old admin: Edit the product, enter the new count and save; only the difference is applied)." },
        ],
    },
    {
        id: "discount-code",
        title: "Create a discount code",
        roles: ALL,
        steps: [
            { route: "discounts", anchor: "discounts.new", text: "Press Create discount (New Discount in the old admin)." },
            { route: "discounts", text: "Pick Discount code, then enter the code and value, add any limits and dates, and create it." },
        ],
    },
    {
        id: "gift-card",
        title: "Issue a gift card",
        roles: ALL,
        steps: [
            { route: "gift_cards", anchor: "giftcards.issue", text: "Press Issue gift card (Issue Gift Card in the old admin)." },
            { route: "gift_cards", text: "Pick the amount, enter the recipient's email, then press Send gift card (Issue & Send Email in the old admin). The code is emailed to them." },
        ],
    },
    {
        id: "delivery-fees",
        title: "Change delivery fees",
        roles: ["admin", "owner"],
        steps: [
            { route: "settings", anchor: "settings.tabs", text: "Settings lists its sections here. Open Shipping and delivery (the Store tab in the old admin)." },
            { route: "settings", anchor: "settings.delivery-fees", text: "Set the Within Accra and Outside Accra fees here, then press Save changes (Save Store Settings in the old admin)." },
        ],
    },
] as const satisfies readonly Walkthrough[];

export type WalkthroughId = (typeof WALKTHROUGHS)[number]["id"];

export function walkthroughsFor(role: StaffRole): Walkthrough[] {
    return (WALKTHROUGHS as readonly Walkthrough[]).filter(w => w.roles.includes(role));
}

export function findWalkthrough(id: string, role: StaffRole): Walkthrough | null {
    return walkthroughsFor(role).find(w => w.id === id) ?? null;
}
