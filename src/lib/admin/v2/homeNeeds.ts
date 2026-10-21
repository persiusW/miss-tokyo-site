// "Needs you today": the counts Home read, turned into rows. Pure, so the
// wording and the links are unit-tested. Each link opens the view whose count
// the row shows (lib/admin/v2/orderViews.ts, lib/admin/v2/counts.ts).
import { plural } from "@/components/admin/ui/format";
import { inboxText, readyText, toPackText, unpaidText, type InboxBreakdown, type RefAt } from "./homeText";
import { lowStockText, type LowRow } from "./lowStock";

export type NeedsData = {
    toPack: { count: number; oldest: { paid_at: string | null; created_at: string } | null };
    unpaid: { count: number; staleCount: number; stale: RefAt[] };
    ready: { count: number; undated: number; oldest: RefAt | null };
    inbox: InboxBreakdown & { total: number };
    returns: { count: number; orderId: string | null };
    lowStock: { count: number; soldOut: number; levels: number[]; example: LowRow | null };
    noPhoto: { count: number; example: { name: string; active: boolean } | null };
};

export type NeedRow = {
    key: "to-pack" | "unpaid" | "ready" | "inbox" | "returns" | "low-stock" | "no-photo";
    n: number;
    title: string;
    body: string;
    action: string;
    href: string;
    tone?: "warn";
};

export function needsRows(d: NeedsData, now: Date): NeedRow[] {
    const rows: NeedRow[] = [
        {
            key: "to-pack", n: d.toPack.count, tone: "warn",
            title: d.toPack.count === 1 ? "order waiting to pack" : "orders waiting to pack",
            body: toPackText(d.toPack.oldest, now), action: "Pack orders", href: "/orders?view=to-pack",
        },
        {
            key: "unpaid", n: d.unpaid.count,
            title: d.unpaid.count === 1 ? "order waiting for payment" : "orders waiting for payment",
            body: unpaidText(d.unpaid.stale, d.unpaid.staleCount, now), action: "Check payments", href: "/orders?view=unpaid",
        },
        {
            key: "ready", n: d.ready.count,
            title: d.ready.count === 1 ? "order ready for collection" : "orders ready for collection",
            body: readyText(d.ready.oldest, d.ready.count, d.ready.undated, now),
            action: d.ready.count === 1 && d.ready.oldest ? "View order" : "View orders",
            href: d.ready.count === 1 && d.ready.oldest ? `/orders/${d.ready.oldest.id}` : "/orders?view=ready",
        },
        {
            key: "inbox", n: d.inbox.total,
            title: d.inbox.total === 1 ? "conversation needs a person" : "conversations need a person",
            body: inboxText(d.inbox), action: "Open inbox", href: "/inbox",
        },
        {
            key: "returns", n: d.returns.count,
            title: d.returns.count === 1 ? "return request is open" : "return requests are open",
            body: `Asked for on WhatsApp. The assistant handed ${d.returns.count === 1 ? "the chat" : "each chat"} to the team to arrange it.`,
            action: d.returns.count === 1 && d.returns.orderId ? "View order" : "Open inbox",
            href: d.returns.count === 1 && d.returns.orderId ? `/orders/${d.returns.orderId}` : "/inbox",
        },
        {
            key: "low-stock", n: d.lowStock.count,
            title: d.lowStock.count === 1 ? "size is low or sold out" : "sizes are low or sold out",
            body: lowStockText(d.lowStock.count, d.lowStock.soldOut, d.lowStock.levels, d.lowStock.example),
            action: "Restock", href: "/catalogue/inventory?view=low",
        },
        {
            key: "no-photo", n: d.noPhoto.count,
            title: d.noPhoto.count === 1 ? "product has no photo" : "products have no photo",
            body: d.noPhoto.example
                ? (d.noPhoto.example.active ? `${d.noPhoto.example.name} is live in the shop without one.` : `${d.noPhoto.example.name} doesn't have one yet.`)
                : "Add one so customers can see what they're buying.",
            action: "Add photos", href: "/catalogue?view=nophoto",
        },
    ];
    return rows.filter(r => r.n > 0);
}

/** "3 items" for the card's corner. */
export const needsCount = (rows: NeedRow[]) => plural(rows.length, "item");

/** What the empty state promises. */
export const NEEDS_EMPTY_BODY = "Orders to pack, payments to check, pickups waiting, conversations that need a person, return requests, low stock and products without photos will show up here.";
