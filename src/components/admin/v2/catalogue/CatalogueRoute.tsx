// The new Products area, for /catalogue (+ /catalogue/<id> and /catalogue/new
// with the panel open), /catalogue/inventory, /catalogue/categories and
// /catalogue/gift-cards. Server components: each checks the role, loads its
// tab with the service role and renders the client page. Every role that
// could open the old Catalogue pages opens these.
import { Suspense } from "react";
import { requireV2Page } from "@/lib/admin/v2/server";
import { logCause } from "@/lib/errors/apiError";
import { getAiSettings } from "@/lib/ai/settings";
import { parseInventoryQuery, parseProductQuery } from "@/lib/admin/v2/catalogue";
import {
    loadCategories, loadCategoryOptions, loadGiftCards, loadInventory, loadProduct, loadProductList, loadStoreOptions, parseGiftQuery,
    type InventoryData, type ProductListData,
} from "@/lib/admin/v2/catalogueLoad";
import { ProductsPage } from "./ProductsPage";
import { InventoryPage } from "./InventoryPage";
import { CategoriesPage } from "./CategoriesPage";
import { GiftCardsPage } from "./GiftCardsPage";
import type { PanelData } from "./actions";

type SP = Record<string, string | string[] | undefined>;
const FULL = ["owner", "admin"];

export async function ProductsV2({ searchParams, openId, isNew }: { searchParams: SP; openId: string | null; isNew?: boolean }) {
    const path = isNew ? "/catalogue/new" : openId ? `/catalogue/${encodeURIComponent(openId)}` : "/catalogue";
    const auth = await requireV2Page("products", path);
    const canCost = FULL.includes(auth.role);
    const query = parseProductQuery(searchParams);
    let data: ProductListData | null = null;
    let preload: PanelData | null = null;
    let missing = false;
    try {
        const [list, bundle, store, categories] = await Promise.all([
            loadProductList(query, canCost),
            openId ? loadProduct(openId, canCost) : Promise.resolve(null),
            openId ? loadStoreOptions() : Promise.resolve(null),
            openId ? loadCategoryOptions() : Promise.resolve(null),
        ]);
        data = list;
        if (openId && bundle && store && categories) preload = { bundle, store, categories, canCost, canDelete: canCost };
        if (openId && !bundle) missing = true;
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.products" });
    }
    return <Suspense><ProductsPage query={query} data={data} preload={preload} missing={missing} /></Suspense>;
}

export async function InventoryV2({ searchParams }: { searchParams: SP }) {
    await requireV2Page("products", "/catalogue/inventory");
    const query = parseInventoryQuery(searchParams);
    let data: InventoryData | null = null;
    let alertsOn = false;
    try {
        const [d, ai] = await Promise.all([loadInventory(query), getAiSettings().catch(() => null)]);
        data = d;
        alertsOn = !!(ai?.whatsappEnabled && ai?.whatsappRestockAlerts);
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.inventory" });
    }
    return <InventoryPage query={query} data={data} restockAlertsOn={alertsOn} />;
}

export async function CategoriesV2() {
    await requireV2Page("products", "/catalogue/categories");
    let data: Awaited<ReturnType<typeof loadCategories>> | null = null;
    try {
        data = await loadCategories();
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.categories" });
    }
    return <CategoriesPage data={data} />;
}

export async function GiftCardsV2({ searchParams }: { searchParams: SP }) {
    await requireV2Page("products", "/catalogue/gift-cards");
    const query = parseGiftQuery(searchParams);
    let data: Awaited<ReturnType<typeof loadGiftCards>> | null = null;
    try {
        data = await loadGiftCards(query);
    } catch (e) {
        logCause("GEN-00", e, { where: "catalogue.giftcards" });
    }
    return <GiftCardsPage query={query} data={data} />;
}
