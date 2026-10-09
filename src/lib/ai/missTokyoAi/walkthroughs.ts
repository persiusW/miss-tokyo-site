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
            { route: "orders", anchor: "orders.tabs", text: "Or on Orders, choose the All tab, so unpaid and cancelled orders are included too." },
            { route: "orders", anchor: "orders.search", text: "Search here, then open the order." },
            { route: "orders", orderPage: true, anchor: "order.verify", text: "On the order page, press Verify with Paystack. It only checks and changes nothing. If Paystack says paid but the order doesn't, an admin or owner can apply it." },
        ],
    },
    {
        id: "dispatch",
        title: "Dispatch orders to a rider",
        roles: ALL,
        steps: [
            { route: "orders", anchor: "orders.row-select", text: "In the Inbox tab, tick the delivery orders you have packed." },
            { route: "orders", anchor: "orders.bulk-pack", text: "Press Mark Packed. They move to the Packed tab." },
            { route: "orders", anchor: "orders.tabs", text: "Open the Packed tab and tick the delivery orders going out now." },
            { route: "orders", anchor: "orders.bulk-ship", text: "Press Assign Rider & Ship. (For one order, use its … menu or the button on its page.)" },
            { route: "orders", anchor: "orders.dispatch-confirm", text: "Choose the rider and whether to SMS the rider and notify the customer, then press Confirm Dispatch." },
            { route: "orders", orderPage: true, anchor: "order.mark-fulfilled", text: "When the rider has delivered, open the order and press Mark Fulfilled." },
        ],
    },
    {
        id: "pickup-ready",
        title: "Get a pickup order ready for collection",
        roles: ALL,
        steps: [
            { route: "orders", anchor: "orders.row-select", text: "In the Inbox tab, tick the pickup orders you have packed." },
            { route: "orders", anchor: "orders.bulk-pack", text: "Press Mark Packed. They move to the Packed tab." },
            { route: "orders", anchor: "orders.tabs", text: "Open the Packed tab and tick the pickup orders." },
            { route: "orders", anchor: "orders.bulk-pickup", text: "Press Mark Ready for Pickup. The customer gets an email and SMS saying it's ready." },
            { route: "orders", anchor: "orders.tabs", text: "They now wait in the Pickups tab until collected." },
            { route: "orders", orderPage: true, anchor: "order.mark-collected", text: "When the customer collects, open the order and press Mark Collected." },
        ],
    },
    {
        id: "cancel-refund",
        title: "Cancel or refund an order",
        roles: ALL,
        steps: [
            { route: "orders", orderPage: true, anchor: "order.cancel", text: "Open the order. Cancel works at once with no second check: it puts back the stock the order took and emails the customer." },
            { route: "orders", orderPage: true, anchor: "order.refund", text: "Refund marks the order refunded and puts the stock back, but sends no money. Refund the customer in the Paystack dashboard." },
            { route: "pos_history", anchor: "poshistory.cancel", text: "For an unpaid till link, open the session in POS History and press Cancel Session. A paid till sale is cancelled or refunded from its order instead." },
        ],
    },
    {
        id: "add-product",
        title: "Add a new product",
        roles: ALL,
        steps: [
            { route: "products", anchor: "products.new", text: "Press New Product." },
            { route: "product_new", text: "Fill in the name, category and price." },
            { route: "product_new", text: "Switch on Sizes, Colors or Brands and tick what you stock. Missing an option? An admin or owner adds it in Site Settings → Store first." },
            { route: "product_new", text: "Turn on per-variant stock and enter the stock for each combination, add the photos (the first is the main image), then save." },
        ],
    },
    {
        id: "restock",
        title: "Restock from the low-stock list",
        roles: ALL,
        steps: [
            { route: "products", anchor: "products.low-stock", text: "Press Low Stock to see what is running out." },
            { route: "low_stock", text: "Press Edit on the product, enter the new on-hand count (per size and colour where it has them) and save. Only the difference is applied." },
        ],
    },
    {
        id: "discount-code",
        title: "Create a discount code",
        roles: ["owner", "sales_staff"],
        steps: [
            { route: "discounts", anchor: "discounts.new", text: "Press New Discount." },
            { route: "discounts", text: "Choose the type, enter the code and value, add any limits, then create it." },
        ],
    },
    {
        id: "gift-card",
        title: "Issue a gift card",
        roles: ALL,
        steps: [
            { route: "gift_cards", anchor: "giftcards.issue", text: "Press Issue Gift Card." },
            { route: "gift_cards", text: "Enter the amount and the recipient's email, then issue it. The code is emailed to them." },
        ],
    },
    {
        id: "delivery-fees",
        title: "Change delivery fees",
        roles: ["admin", "owner"],
        steps: [
            { route: "settings", anchor: "settings.tabs", text: "Site Settings has tabs across the top. Open Store." },
            { route: "settings", anchor: "settings.delivery-fees", text: "Set the Within Accra and Outside Accra fees here, then save the store settings." },
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
