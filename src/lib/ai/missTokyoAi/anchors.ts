// Registered Show me targets. Each id must appear exactly as
// data-assist="<id>" on a real element; tests/e2e/unit/mtai-registry.spec.ts
// fails in both directions if they drift.
import type { RouteKey } from "@/lib/ai/missTokyoAi/routes";

type AnchorDef = { route: RouteKey; label: string; tab?: string };

export const ANCHORS = {
    "topbar.search": { route: "overview", label: "Search orders, products… (top bar, any page)" },
    "pos.search": { route: "pos", label: "Product search on the till" },
    "pos.phone": { route: "pos", label: "Customer phone (needed for a pay link)" },
    "pos.code": { route: "pos", label: "Gift card / discount code" },
    "pos.send-link": { route: "pos", label: "Send Link button" },
    "pos.cash": { route: "pos", label: "Cash Received button" },
    "orders.tabs": { route: "orders", label: "Order tabs (Inbox, Packed, … All)" },
    "orders.search": { route: "orders", label: "Order search" },
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
