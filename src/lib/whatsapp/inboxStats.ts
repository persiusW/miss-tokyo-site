// The figures over the WhatsApp inbox for a chosen period. Pure, so paging and
// counting are unit-tested; the route does the reading.

const PAGE = 1000;

/**
 * Every row of a query. A select stops at 1000 rows with no error, which would
 * quietly shrink the all-time figures, so this pages until a short page. A
 * failed page throws: the page shows a calm error, never a smaller number.
 */
export async function readAllPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await page(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if ((data ?? []).length < PAGE) return rows;
    }
}

export type PeriodStats = { chats: number; assistantOrders: number; assistantSalesGhs: number; handedOver: number };

export function summariseStats(
    inbound: { conversation_id: string }[],
    paidOrders: { total_amount: number | string }[],
    handed: { conversation_id: string }[],
): PeriodStats {
    return {
        chats: new Set(inbound.map(m => m.conversation_id)).size,
        assistantOrders: paidOrders.length,
        assistantSalesGhs: Math.round(paidOrders.reduce((n, o) => n + (Number(o.total_amount) || 0), 0) * 100) / 100,
        handedOver: new Set(handed.map(h => h.conversation_id)).size,
    };
}
