// Step-by-step tours Miss Tokyo AI can start. Each step names the page it is
// on and, where one exists, a registered control to ring. A step with no
// anchor just shows its text. tests/e2e/unit/mtai-walkthroughs.spec.ts checks
// every step's page and control against the registries and the roles, in
// every admin view.
//
// Each tour has the old admin's steps and the new admin's, picked by the tour's
// area (stepsFor). A step on another area's page carries `alt`: the same step
// in the other admin, shown while that area is on its other page.
import { ROUTES, V2_ROUTES, findRoute, type LegacyRouteKey, type RouteKey, type StaffRole, type V2RouteKey } from "@/lib/ai/missTokyoAi/routes";
import type { AnchorId } from "@/lib/ai/missTokyoAi/anchors";
import { OLD_VIEW, isOn, type AdminView, type V2Area } from "@/lib/ai/missTokyoAi/view";

/** orderPage: the step happens on any order's own page (/sales/orders/<id>, or the panel at /orders/<id>). */
export type WalkStep = { route: RouteKey; anchor?: AnchorId; text: string; orderPage?: true };
type LegacyOnly = WalkStep & { route: LegacyRouteKey };
type V2Only = WalkStep & { route: V2RouteKey };
type LegacyStep = LegacyOnly & { alt?: V2Only };
type V2Step = V2Only & { alt?: LegacyOnly };
export type Walkthrough = { id: string; title: string; roles: StaffRole[]; steps: WalkStep[] };
type TourDef = { id: string; title: string; roles: StaffRole[]; area: V2Area; steps: readonly LegacyStep[]; v2: readonly V2Step[] };

const ALL: StaffRole[] = ["admin", "owner", "sales_staff"];

export const WALKTHROUGHS = [
    {
        id: "pos-sale",
        title: "Ring up a sale at the POS",
        roles: ALL,
        area: "till",
        steps: [
            { route: "pos", anchor: "pos.search", text: "Search for the product by name or SKU, pick its size, colour or brand on the card, then press Add." },
            { route: "pos", anchor: "pos.phone", text: "Attach the customer (Existing or New) and add their phone. A pay link needs the phone." },
            { route: "pos", anchor: "pos.code", text: "Optional: enter a gift card or discount code. Choose Store Pickup or Delivery." },
            { route: "pos", anchor: "pos.send-link", text: "To take payment by link, press Send Link. The customer gets it by SMS and email, and the stock is held while they pay." },
            { route: "pos", anchor: "pos.cash", text: "For cash, press Cash Received, then press it again within 4 seconds to confirm." },
        ],
        v2: [
            { route: "till", anchor: "pos.search", text: "Search for the product by name or SKU. Tap it, pick its size, colour or brand, then press Add to sale." },
            { route: "till", anchor: "pos.phone", text: "Choose the customer (Find a customer or New customer) and add their phone. A pay link needs the phone." },
            { route: "till", anchor: "pos.code", text: "Optional: enter a gift card or discount code. Choose how they get it: Taking it now, Deliver in Accra or Outside Accra." },
            { route: "till", anchor: "pos.send-link", text: "To take payment by link, choose Send a pay link, then press Send pay link. The customer gets it by text (and email when they have one), and the items are held while they pay. Pay links add the processing fee." },
            { route: "till", anchor: "pos.cash", text: "For cash, choose Cash (no processing fee), press Take GH₵ X cash, type what you were handed to see the change, then press Record GH₵ X cash." },
        ],
    },
    {
        id: "check-paid",
        title: "Find an order and check it's paid",
        roles: ALL,
        area: "orders",
        steps: [
            { route: "orders", anchor: "topbar.search", text: "From any page, search the order's 8-character ref, the customer's name or phone." },
            { route: "orders", anchor: "orders.tabs", text: "Or on Orders, open the All tab, so unpaid and cancelled orders are included too." },
            { route: "orders", anchor: "orders.search", text: "Search by ref, name, email or phone, then open the order." },
            { route: "orders", orderPage: true, anchor: "order.verify", text: "On the order, press Verify with Paystack. It only checks and changes nothing. If Paystack says paid but the order doesn't, press Mark this order paid." },
        ],
        v2: [
            { route: "orders", anchor: "topbar.search", text: "From any page, search the order number, the customer's name or phone in the top bar (or ⌘K)." },
            { route: "orders", anchor: "orders.tabs", text: "Or on Orders, choose the All chip, so unpaid and cancelled orders are included too." },
            { route: "orders", anchor: "orders.search", text: "Search by order number, name or phone, then tap the order to open it." },
            { route: "orders", orderPage: true, anchor: "order.verify", text: "In the order, press Check with Paystack. It only checks and changes nothing. If Paystack says paid but the order doesn't, press Mark this order paid." },
        ],
    },
    {
        id: "dispatch",
        title: "Dispatch orders to a rider",
        roles: ALL,
        area: "orders",
        steps: [
            { route: "orders", anchor: "orders.row-select", text: "In the Inbox tab, tick the delivery orders you have packed." },
            { route: "orders", anchor: "orders.bulk-pack", text: "Press Mark Packed. They move to Packed." },
            { route: "orders", anchor: "orders.tabs", text: "Open Packed and tick the delivery orders going out now." },
            { route: "orders", anchor: "orders.bulk-ship", text: "Press Assign Rider & Ship. For one order, use the button on the order's page." },
            { route: "orders", anchor: "orders.dispatch-confirm", text: "Choose the rider and the notifications, then press Confirm Dispatch." },
            { route: "orders", anchor: "orders.row-menu", text: "When the rider has delivered, use the order's … menu: Mark Fulfilled." },
        ],
        v2: [
            { route: "orders", anchor: "orders.row-select", text: "In Waiting to pack, tick the delivery orders you have packed." },
            { route: "orders", anchor: "orders.bulk-pack", text: "Press Mark as packed. They move to Packed." },
            { route: "orders", anchor: "orders.tabs", text: "Open Packed and tick the delivery orders going out now." },
            { route: "orders", anchor: "orders.bulk-ship", text: "Press Assign rider and send. For one order, use the button at the bottom of the order." },
            { route: "orders", anchor: "orders.dispatch-confirm", text: "Choose the rider and whether to text the rider and tell the customer, then press Send with the rider's name." },
            { route: "orders", orderPage: true, anchor: "order.mark-fulfilled", text: "When the rider has delivered, open the order and press Mark as delivered (or tick orders in Out for delivery and press Mark as delivered)." },
        ],
    },
    {
        id: "pickup-ready",
        title: "Get a pickup order ready for collection",
        roles: ALL,
        area: "orders",
        steps: [
            { route: "orders", anchor: "orders.row-select", text: "In the Inbox tab, tick the pickup orders you have packed." },
            { route: "orders", anchor: "orders.bulk-pack", text: "Press Mark Packed. They move to Packed." },
            { route: "orders", anchor: "orders.tabs", text: "Open Packed and tick the pickup orders." },
            { route: "orders", anchor: "orders.bulk-pickup", text: "Press Mark Ready for Pickup. The customer gets an email and SMS saying it's ready." },
            { route: "orders", anchor: "orders.tabs", text: "They now wait in Pickups until collected." },
            { route: "orders", orderPage: true, anchor: "order.mark-collected", text: "When the customer collects, open the order and press Mark Collected." },
        ],
        v2: [
            { route: "orders", anchor: "orders.row-select", text: "In Waiting to pack, tick the pickup orders you have packed." },
            { route: "orders", anchor: "orders.bulk-pack", text: "Press Mark as packed. They move to Packed." },
            { route: "orders", anchor: "orders.tabs", text: "Open Packed and tick the pickup orders." },
            { route: "orders", anchor: "orders.bulk-pickup", text: "Press Tell customers it's ready. The customer gets an email and SMS saying it's ready." },
            { route: "orders", anchor: "orders.tabs", text: "They now wait in Ready for collection until collected." },
            { route: "orders", orderPage: true, anchor: "order.mark-collected", text: "When the customer collects, open the order and press Mark as collected." },
        ],
    },
    {
        id: "cancel-refund",
        title: "Cancel or refund an order",
        roles: ALL,
        area: "orders",
        steps: [
            { route: "orders", orderPage: true, anchor: "order.cancel", text: "Open the order and press Cancel. It works at once, with no confirmation: the stock the order took goes back and the customer is emailed." },
            { route: "orders", orderPage: true, anchor: "order.refund", text: "Refund marks the order refunded and returns its stock, but sends no money: refund the customer in the Paystack dashboard first." },
            {
                route: "pos_history", anchor: "poshistory.cancel",
                text: "For an unpaid POS link, open the session in POS History and press Cancel Session. A paid POS sale is cancelled or refunded from its order instead.",
                alt: { route: "till_today", anchor: "poshistory.cancel", text: "For an unpaid POS pay link, open the sale in Today's sales and tap Cancel sale twice. A paid POS sale is cancelled or refunded from its order instead." },
            },
        ],
        v2: [
            { route: "orders", orderPage: true, anchor: "order.cancel", text: "Open the order and press Cancel order. It asks first: Cancel and refund, or Cancel without a refund, and whether to tell the customer. The stock the order took goes back." },
            { route: "orders", orderPage: true, anchor: "order.refund", text: "Refund (owners and admins): Everything, Choose items or An amount, whether to put the items back in stock, a reason and whether to email the customer. It shows what will happen before you confirm." },
            {
                route: "till_today", anchor: "poshistory.cancel",
                text: "For an unpaid POS pay link, open the sale in Today's sales and tap Cancel sale twice. A paid POS sale is cancelled or refunded from its order instead.",
                alt: { route: "pos_history", anchor: "poshistory.cancel", text: "For an unpaid POS link, open the session in POS History and press Cancel Session. A paid POS sale is cancelled or refunded from its order instead." },
            },
        ],
    },
    {
        id: "add-product",
        title: "Add a new product",
        roles: ALL,
        area: "products",
        steps: [
            { route: "products", anchor: "products.new", text: "Press New Product." },
            { route: "product_new", text: "Fill in the name, categories and price." },
            { route: "product_new", text: "Switch on Sizes, Colors or Brands and tick the options you stock. Missing an option? An admin or owner adds it in Site Settings → Store first." },
            { route: "product_new", text: "Turn on Track Inventory and Track Inventory by Variant and fill in each one's stock, add the photos (the first is the main image), then save the product." },
        ],
        v2: [
            { route: "catalogue", anchor: "products.new", text: "Press Add product." },
            { route: "product_new", text: "Fill in the name and category (Details), then the price (Pricing)." },
            { route: "product_new", text: "Under Sizes and stock, tap the sizes, colours or brands you stock. Missing an option? An admin or owner adds it in Settings › Product options first." },
            { route: "product_new", text: "Switch on \"Separate stock for each size and colour\" and enter each one's stock, add the photos on Details (the first is the main photo), choose Active or Draft under Visibility, then press Add product." },
        ],
    },
    {
        id: "restock",
        title: "Restock from the low-stock list",
        roles: ALL,
        area: "products",
        steps: [
            { route: "products", anchor: "products.low-stock", text: "Press Low Stock to see what is running out." },
            { route: "low_stock", text: "Edit the product, enter the new count and save. Only the difference is applied, so sales made meanwhile are kept." },
        ],
        v2: [
            { route: "catalogue", anchor: "products.low-stock", text: "Tap the Low stock chip to see what is running out. Products › Inventory › Running low lists each size." },
            { route: "low_stock", text: "In Inventory, press Adjust on the size, choose \"New stock arrived\" and enter how many came in. It shows \"Stock goes from X to Y\" before you save." },
        ],
    },
    {
        id: "discount-code",
        title: "Create a discount code",
        roles: ALL,
        area: "discounts",
        steps: [
            { route: "discounts", anchor: "discounts.new", text: "Press New Discount." },
            { route: "discounts", text: "Pick the type, enter the Coupon Code (or Gen) and value, add any limits and an expiry date, then press Create Discount." },
        ],
        v2: [
            { route: "discounts", anchor: "discounts.new", text: "Press Create discount." },
            { route: "discounts", text: "Pick Discount code, then enter the code (or Make one up) and value, add any limits and dates, and press Create discount." },
        ],
    },
    {
        id: "gift-card",
        title: "Issue a gift card",
        roles: ALL,
        area: "products",
        steps: [
            { route: "gift_cards", anchor: "giftcards.issue", text: "Press Issue Gift Card." },
            { route: "gift_cards", text: "Pick the amount, enter the Recipient Email, then press Issue & Send Email. The code is emailed to them." },
        ],
        v2: [
            { route: "gift_cards", anchor: "giftcards.issue", text: "Press Issue gift card." },
            { route: "gift_cards", text: "Pick the amount, enter the recipient's name and email, then press Send gift card. The code is emailed to them." },
        ],
    },
    {
        id: "delivery-fees",
        title: "Change delivery fees",
        roles: ["admin", "owner"],
        area: "settings",
        steps: [
            { route: "settings", anchor: "settings.tabs", text: "Open the Store tab." },
            { route: "settings", anchor: "settings.delivery-fees", text: "Set the Within Accra and Outside Accra fees under Delivery Fees, then press Save Store Settings." },
        ],
        v2: [
            { route: "settings", anchor: "settings.tabs", text: "Settings lists its sections here. Open Shipping and delivery." },
            { route: "settings", anchor: "settings.delivery-fees", text: "Set Within Greater Accra and Outside Accra (Charge for delivery must be on), then press Save changes in the bar at the bottom." },
        ],
    },
] as const satisfies readonly TourDef[];

export type WalkthroughId = (typeof WALKTHROUGHS)[number]["id"];

/** True when the step's route key means, in this view, the page of the table the step was written for. */
function resolves(step: WalkStep, table: Record<string, unknown>, view: AdminView): boolean {
    const r = findRoute(step.route, view);
    return !!r && r === table[step.route];
}

/** The tour's steps as this view shows them. */
export function stepsFor(tour: TourDef, view: AdminView = OLD_VIEW): WalkStep[] {
    const v2 = isOn(view, tour.area);
    const [list, own, other] = v2
        ? [tour.v2 as readonly (WalkStep & { alt?: WalkStep })[], V2_ROUTES, ROUTES]
        : [tour.steps as readonly (WalkStep & { alt?: WalkStep })[], ROUTES, V2_ROUTES];
    return list.map(({ alt, ...step }) =>
        resolves(step, own, view) || !alt || !resolves(alt, other, view) ? step : alt);
}

export function walkthroughsFor(role: StaffRole, view: AdminView = OLD_VIEW): Walkthrough[] {
    return (WALKTHROUGHS as readonly TourDef[])
        .filter(w => w.roles.includes(role))
        .map(w => ({ id: w.id, title: w.title, roles: w.roles, steps: stepsFor(w, view) }));
}

export function findWalkthrough(id: string, role: StaffRole, view: AdminView = OLD_VIEW): Walkthrough | null {
    return walkthroughsFor(role, view).find(w => w.id === id) ?? null;
}
