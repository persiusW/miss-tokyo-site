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
    "orders.tabs": { route: "orders", label: "Order tabs (Inbox, Packed, … All)" },
    "orders.search": { route: "orders", label: "Order search" },
    "orders.row-select": { route: "orders", label: "Tick an order" },
    "orders.row-menu": { route: "orders", label: "Order actions (…)" },
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
} satisfies Record<string, AnchorDef>;

export type AnchorId = keyof typeof ANCHORS;

export const isOrderPageAnchor = (id: string): boolean => {
    const a: AnchorDef | undefined = ANCHORS[id as AnchorId];
    return !!a?.orderPage;
};

/** Anchors Show me may use: everything with a fixed address. */
export const SHOW_ME_ANCHORS = (Object.keys(ANCHORS) as AnchorId[]).filter(id => !isOrderPageAnchor(id));
