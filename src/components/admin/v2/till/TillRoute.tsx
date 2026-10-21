// The new Till pages, for /till (New sale) and /till/today (Today's sales).
// Server components: check the role, load the first data, render the client page.
// Every staff role can use the till, as with the old /pos.
import { requireV2Page } from "@/lib/admin/v2/server";
import { logCause } from "@/lib/errors/apiError";
import { parseSalesQuery, type TillCustomer, type TillProduct } from "@/lib/admin/v2/till";
import {
    findTillCustomer, loadSales, loadTillCategories, loadTillSettings, loadTodayKpis, searchTillProducts,
    type SalesData, type TillCategory, type TodayKpis,
} from "@/lib/admin/v2/tillLoad";
import { DELIVERY_DEFAULTS } from "@/lib/delivery";
import { DEFAULT_POS_HOLD_MINUTES } from "@/lib/posSettlement";
import { TillHeader } from "./TillHeader";
import { NewSale } from "./NewSale";
import { TodaySales } from "./TodaySales";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function TillV2({ searchParams }: { searchParams: SP }) {
    const auth = await requireV2Page("till", "/till");
    // ?customer=<email or phone>: Customers' and Orders' "New sale" links.
    const key = one(searchParams.customer);
    const [settings, categories, products, customer] = await Promise.all([
        loadTillSettings().catch(e => {
            logCause("GEN-00", e, { where: "till.settings" });
            return { delivery: DELIVERY_DEFAULTS, liveStatus: false, holdMinutes: DEFAULT_POS_HOLD_MINUTES, feePct: 0 };
        }),
        loadTillCategories().catch((e): TillCategory[] => { logCause("GEN-00", e, { where: "till.categories" }); return []; }),
        searchTillProducts("", null).catch((e): { products: TillProduct[]; matches: number } | null => { logCause("GEN-00", e, { where: "till.products" }); return null; }),
        key ? findTillCustomer(key).catch((): TillCustomer | null => null) : Promise.resolve(null),
    ]);
    return (
        <>
            <TillHeader tab="sale" role={auth.role} />
            <NewSale settings={settings} categories={categories} initialProducts={products} initialCustomer={customer} />
        </>
    );
}

export async function TillTodayV2({ searchParams }: { searchParams: SP }) {
    const auth = await requireV2Page("till", "/till/today");
    const scope = { userId: auth.userId, role: auth.role };
    const query = parseSalesQuery(searchParams);
    const [kpis, data] = await Promise.all([
        loadTodayKpis(scope).catch((e): TodayKpis | null => { logCause("GEN-00", e, { where: "till.kpis" }); return null; }),
        loadSales(query, scope).catch((e): SalesData | null => { logCause("GEN-00", e, { where: "till.sales" }); return null; }),
    ]);
    return (
        <>
            <TillHeader tab="today" role={auth.role} />
            <TodaySales role={auth.role} query={query} kpis={kpis} data={data} />
        </>
    );
}
