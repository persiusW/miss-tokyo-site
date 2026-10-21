// Registered Show me targets. Each id must appear exactly as
// data-assist="<id>" on a real element; tests/e2e/unit/mtai-registry.spec.ts
// fails in both directions if they drift. During the admin v2 rollout the old
// and the new page each carry the control once: ANCHORS describe the old
// admin, V2_ANCHORS the new one, and anchorFor picks by the area's view.
import { ROUTES, findRoute, type LegacyRouteKey, type RouteKey, type V2RouteKey } from "@/lib/ai/missTokyoAi/routes";
import { OLD_VIEW, isOn, type AdminView } from "@/lib/ai/missTokyoAi/view";

/** orderPage: the control is on an order's own page (/sales/orders/<id>, or the
 *  order panel at /orders/<id> in the new admin), which has no fixed address.
 *  Only walkthroughs use these; Show me can't open them. */
export type AnchorDef = { route: RouteKey; label: string; tab?: string; orderPage?: true };
type LegacyAnchorDef = AnchorDef & { route: LegacyRouteKey };
type V2AnchorDef = AnchorDef & { route: V2RouteKey };

export const ANCHORS = {
    "topbar.search": { route: "overview", label: "Search orders, products… (top bar, any page)" },
    "pos.search": { route: "pos", label: "Product search on the till (Search by name or SKU…)" },
    "pos.phone": { route: "pos", label: "Customer phone (Phone *, needed for a pay link)" },
    "pos.code": { route: "pos", label: "Gift card or discount code (Enter code)" },
    "pos.send-link": { route: "pos", label: "Send Link button" },
    "pos.cash": { route: "pos", label: "Cash Received button" },
    "orders.tabs": { route: "orders", label: "Order tabs (Inbox … All)" },
    "orders.search": { route: "orders", label: "Order search (ref, name, email or phone)" },
    "orders.row-select": { route: "orders", label: "Tick an order" },
    "orders.row-menu": { route: "orders", label: "Order actions (… on each row)" },
    "orders.bulk-pack": { route: "orders", label: "Mark Packed (ticked orders)" },
    "orders.bulk-pickup": { route: "orders", label: "Mark Ready for Pickup (ticked orders)" },
    "orders.bulk-ship": { route: "orders", label: "Assign Rider & Ship (ticked orders)" },
    "orders.dispatch-confirm": { route: "orders", label: "Confirm Dispatch" },
    "order.assign-rider": { route: "orders", label: "Assign Rider & Ship", orderPage: true },
    "order.confirm-ship": { route: "orders", label: "Confirm & Ship", orderPage: true },
    "order.pickup-ready": { route: "orders", label: "Send Pickup Ready Notification", orderPage: true },
    "order.mark-collected": { route: "orders", label: "Mark Collected", orderPage: true },
    "order.mark-fulfilled": { route: "orders", label: "Mark Fulfilled", orderPage: true },
    "order.refund": { route: "orders", label: "Refund", orderPage: true },
    "order.cancel": { route: "orders", label: "Cancel", orderPage: true },
    "order.verify": { route: "orders", label: "Verify with Paystack", orderPage: true },
    "order.fulfillment-status": { route: "orders", label: "Fulfillment Status", orderPage: true },
    "poshistory.cancel": { route: "pos_history", label: "Cancel Session" },
    "products.new": { route: "products", label: "New Product button" },
    "products.low-stock": { route: "products", label: "Low Stock button" },
    "discounts.new": { route: "discounts", label: "New Discount button" },
    "giftcards.issue": { route: "gift_cards", label: "Issue Gift Card button" },
    "settings.tabs": { route: "settings", label: "Settings tabs" },
    "settings.delivery-fees": { route: "settings", label: "Delivery Fees", tab: "store" },
    "settings.global-options": { route: "settings", label: "Global sizes, colours and brands", tab: "store" },
    "settings.pos-hold": { route: "settings", label: "Payment Link Hold", tab: "store" },
} satisfies Record<string, LegacyAnchorDef>;

export type AnchorId = keyof typeof ANCHORS;

/** The same controls in the new admin, with its labels and pages. */
export const V2_ANCHORS = {
    "topbar.search": { route: "home", label: "Search orders, products, customers (top bar, any page, or ⌘K)" },
    "pos.search": { route: "till", label: "Product search on the till (Search by name or SKU)" },
    "pos.phone": { route: "till", label: "Customer phone (a pay link needs it)" },
    "pos.code": { route: "till", label: "Discount or gift card code" },
    "pos.send-link": { route: "till", label: "Send a pay link (under Payment)" },
    "pos.cash": { route: "till", label: "Cash (under Payment)" },
    "orders.tabs": { route: "orders", label: "Order views (All, Waiting to pack … Cancelled and refunded)" },
    "orders.search": { route: "orders", label: "Order search (by order number, name or phone)" },
    "orders.row-select": { route: "orders", label: "Tick an order" },
    "orders.row-menu": { route: "orders", label: "More order actions (… at the bottom of the order)", orderPage: true },
    "orders.bulk-pack": { route: "orders", label: "Mark as packed (ticked orders)" },
    "orders.bulk-pickup": { route: "orders", label: "Tell customers it's ready (ticked orders)" },
    "orders.bulk-ship": { route: "orders", label: "Assign rider and send (ticked orders)" },
    "orders.dispatch-confirm": { route: "orders", label: "Send with the rider" },
    "order.assign-rider": { route: "orders", label: "Assign rider and send", orderPage: true },
    "order.confirm-ship": { route: "orders", label: "Send with the rider", orderPage: true },
    "order.pickup-ready": { route: "orders", label: "Tell customer it's ready", orderPage: true },
    "order.mark-collected": { route: "orders", label: "Mark as collected", orderPage: true },
    "order.mark-fulfilled": { route: "orders", label: "Mark as delivered", orderPage: true },
    "order.refund": { route: "orders", label: "Refund", orderPage: true },
    "order.cancel": { route: "orders", label: "Cancel order", orderPage: true },
    "order.verify": { route: "orders", label: "Check with Paystack", orderPage: true },
    "order.fulfillment-status": { route: "orders", label: "Order progress", orderPage: true },
    "poshistory.cancel": { route: "till_today", label: "Cancel sale (open the sale first)" },
    "products.new": { route: "catalogue", label: "Add product button" },
    "products.low-stock": { route: "catalogue", label: "Low stock chip" },
    "discounts.new": { route: "discounts", label: "Create discount button" },
    "giftcards.issue": { route: "gift_cards", label: "Issue gift card button" },
    "settings.tabs": { route: "settings", label: "Settings sections" },
    "settings.delivery-fees": { route: "settings", label: "Shipping and delivery fees", tab: "delivery" },
    "settings.global-options": { route: "settings", label: "Product options: sizes, colours and brands", tab: "options" },
    "settings.pos-hold": { route: "settings", label: "Pay links hold the stock for", tab: "payments" },
} satisfies Record<AnchorId, V2AnchorDef>;

/** The control as this view shows it, or null when its page isn't in this view. */
export function anchorFor(id: string, view: AdminView = OLD_VIEW): AnchorDef | null {
    if (!Object.prototype.hasOwnProperty.call(ANCHORS, id)) return null;
    // Both tables use some of the same route keys, so the area decides, not the key.
    const old: AnchorDef = ANCHORS[id as AnchorId];
    const def: AnchorDef = isOn(view, ROUTES[old.route as LegacyRouteKey].area) ? V2_ANCHORS[id as AnchorId] : old;
    return findRoute(def.route, view) ? def : null;
}

export const isOrderPageAnchor = (id: string, view: AdminView = OLD_VIEW): boolean => !!anchorFor(id, view)?.orderPage;

/** Anchors Show me may use in this view: everything with a fixed address. */
export function showMeAnchors(view: AdminView = OLD_VIEW): AnchorId[] {
    return (Object.keys(ANCHORS) as AnchorId[]).filter(id => anchorFor(id, view) && !isOrderPageAnchor(id, view));
}

/** The old admin's Show me list. */
export const SHOW_ME_ANCHORS = showMeAnchors(OLD_VIEW);
