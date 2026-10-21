// Registered Show me targets. Each id must appear exactly as
// data-assist="<id>" on a real element; tests/e2e/unit/mtai-registry.spec.ts
// fails in both directions if they drift.
import type { RouteKey } from "@/lib/ai/missTokyoAi/routes";

/** orderPage: the control is on an order's own page (/sales/orders/<id>), which
 *  has no fixed address. Only walkthroughs use these; Show me can't open them. */
type AnchorDef = { route: RouteKey; label: string; tab?: string; orderPage?: true };

export const ANCHORS = {
    "topbar.search": { route: "overview", label: "Search orders, products… (top bar, any page)" },
    "pos.search": { route: "pos", label: "Product search on the till" },
    "pos.phone": { route: "pos", label: "Customer phone (needed for a pay link)" },
    "pos.code": { route: "pos", label: "Gift card / discount code" },
    "pos.send-link": { route: "pos", label: "Send Link button" },
    "pos.cash": { route: "pos", label: "Cash Received button" },
    "orders.tabs": { route: "orders", label: "Order views (Waiting to pack … All; tabs Inbox … All in the old admin)" },
    "orders.search": { route: "orders", label: "Order search (by order number, name or phone)" },
    "orders.row-select": { route: "orders", label: "Tick an order" },
    "orders.row-menu": { route: "orders", label: "Order actions (… on the order; on each row in the old admin)" },
    "orders.bulk-pack": { route: "orders", label: "Mark as packed, ticked orders (Mark Packed in the old admin)" },
    "orders.bulk-pickup": { route: "orders", label: "Tell customers it's ready, ticked orders (Mark Ready for Pickup in the old admin)" },
    "orders.bulk-ship": { route: "orders", label: "Assign rider and send, ticked orders (Assign Rider & Ship in the old admin)" },
    "orders.dispatch-confirm": { route: "orders", label: "Send with the rider (Confirm Dispatch in the old admin)" },
    "order.assign-rider": { route: "orders", label: "Assign rider and send (Assign Rider & Ship in the old admin)", orderPage: true },
    "order.confirm-ship": { route: "orders", label: "Send with the rider (Confirm & Ship in the old admin)", orderPage: true },
    "order.pickup-ready": { route: "orders", label: "Tell customer it's ready (Send Pickup Ready Notification in the old admin)", orderPage: true },
    "order.mark-collected": { route: "orders", label: "Mark as collected (Mark Collected in the old admin)", orderPage: true },
    "order.mark-fulfilled": { route: "orders", label: "Mark as delivered (Mark Fulfilled in the old admin)", orderPage: true },
    "order.refund": { route: "orders", label: "Refund", orderPage: true },
    "order.cancel": { route: "orders", label: "Cancel order (Cancel in the old admin)", orderPage: true },
    "order.verify": { route: "orders", label: "Check with Paystack (Verify with Paystack in the old admin)", orderPage: true },
    "order.fulfillment-status": { route: "orders", label: "Order progress (Fulfillment Status in the old admin)", orderPage: true },
    "poshistory.cancel": { route: "pos_history", label: "Cancel Session" },
    "products.new": { route: "products", label: "Add product button (New Product in the old admin)" },
    "products.low-stock": { route: "products", label: "Low stock chip (Low Stock button in the old admin)" },
    "discounts.new": { route: "discounts", label: "Create discount button (New Discount in the old admin)" },
    "giftcards.issue": { route: "gift_cards", label: "Issue gift card button" },
    "settings.tabs": { route: "settings", label: "Settings tabs" },
    "settings.delivery-fees": { route: "settings", label: "Delivery Fees", tab: "store" },
    "settings.global-options": { route: "settings", label: "Global sizes, colours and brands", tab: "store" },
    "settings.pos-hold": { route: "settings", label: "Payment Link Hold", tab: "store" },
} satisfies Record<string, AnchorDef>;

export type AnchorId = keyof typeof ANCHORS;

export const isOrderPageAnchor = (id: string): boolean => {
    const a: AnchorDef | undefined = ANCHORS[id as AnchorId];
    return !!a?.orderPage;
};

/** Anchors Show me may use: everything with a fixed address. */
export const SHOW_ME_ANCHORS = (Object.keys(ANCHORS) as AnchorId[]).filter(id => !isOrderPageAnchor(id));
