module.exports = [
"[project]/src/app/favicon.ico.mjs { IMAGE => \"[project]/src/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/favicon.ico.mjs { IMAGE => \"[project]/src/app/favicon.ico (static in ecmascript, tag client)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/src/app/global-error.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/global-error.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/error.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/error.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/app/(dashboard)/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/(dashboard)/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/src/lib/utils/metrics.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "REVENUE_STATUSES",
    ()=>REVENUE_STATUSES,
    "fetchMonthlyRevenue",
    ()=>fetchMonthlyRevenue,
    "fetchOrderStats",
    ()=>fetchOrderStats,
    "fetchRecentActivity",
    ()=>fetchRecentActivity,
    "fetchSalesByCategory",
    ()=>fetchSalesByCategory,
    "fetchTotalRevenue",
    ()=>fetchTotalRevenue
]);
/**
 * Shared server-side data-fetching utilities for dashboard metrics.
 * Single source of truth — import these into any dashboard page instead of
 * writing inline Supabase queries.
 *
 * Revenue definition: orders WHERE status IN ('paid', 'processing', 'fulfilled', 'delivered')
 * Explicitly excluded: 'pending', 'cancelled', 'refunded'
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseAdmin.ts [app-rsc] (ecmascript)");
;
const REVENUE_STATUSES = [
    "paid",
    "processing",
    "fulfilled",
    "delivered"
];
async function fetchTotalRevenue() {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("orders").select("total_amount, status, payment_status");
    if (error) {
        console.error("[metrics] fetchTotalRevenue:", error.message, error.details);
        return 0;
    }
    const LEGACY_PAID = [
        "paid",
        "processing",
        "fulfilled",
        "delivered",
        "packed",
        "ready_for_pickup",
        "shipped"
    ];
    return (data || []).filter((o)=>o.payment_status === "paid" || !o.payment_status && LEGACY_PAID.includes(o.status ?? "")).reduce((sum, o)=>sum + Number(o.total_amount ?? 0), 0);
}
async function fetchOrderStats() {
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("orders").select("status, payment_status, fulfillment_status, total_amount");
    if (error) {
        console.error("[metrics] fetchOrderStats:", error.message, error.details);
    }
    const orders = data ?? [];
    const totalOrders = orders.length;
    // Revenue: prefer payment_status='paid'; fall back to legacy status for orders
    // created before the dual-status migration (payment_status may still be null).
    const LEGACY_PAID = [
        "paid",
        "processing",
        "fulfilled",
        "delivered",
        "packed",
        "ready_for_pickup",
        "shipped"
    ];
    const paidOrders = orders.filter((o)=>o.payment_status === "paid" || !o.payment_status && LEGACY_PAID.includes(o.status));
    const totalRevenue = paidOrders.reduce((sum, o)=>sum + Number(o.total_amount ?? 0), 0);
    const revenueOrderCount = paidOrders.length;
    // Paid but not yet delivered
    const unfulfilledPaidCount = paidOrders.filter((o)=>o.fulfillment_status !== "delivered").length;
    // Delivered orders
    const fulfilledCount = orders.filter((o)=>o.fulfillment_status === "delivered" || [
            "fulfilled",
            "delivered"
        ].includes(o.status)).length;
    return {
        totalRevenue,
        revenueOrderCount,
        pendingCount: unfulfilledPaidCount,
        processingCount: 0,
        fulfilledCount,
        cancelledCount: orders.filter((o)=>[
                "cancelled",
                "refunded"
            ].includes(o.status)).length,
        totalOrders,
        avgOrderValue: revenueOrderCount > 0 ? totalRevenue / revenueOrderCount : 0,
        conversionRate: totalOrders > 0 ? (fulfilledCount / totalOrders * 100).toFixed(1) : "0.0"
    };
}
async function fetchSalesByCategory() {
    const [ordersRes, productsRes] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("orders").select("items, total_amount, status, payment_status"),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("products").select("id, category_type")
    ]);
    if (ordersRes.error) {
        console.error("[metrics] fetchSalesByCategory (orders):", ordersRes.error.message, ordersRes.error.details);
    }
    if (productsRes.error) {
        console.error("[metrics] fetchSalesByCategory (products):", productsRes.error.message, productsRes.error.details);
    }
    // Build productId → category lookup
    const catMap = {};
    for (const p of productsRes.data ?? []){
        catMap[p.id] = p.category_type?.trim() || "Uncategorised";
    }
    const LEGACY_PAID = [
        "paid",
        "processing",
        "fulfilled",
        "delivered",
        "packed",
        "ready_for_pickup",
        "shipped"
    ];
    const paidOrders = (ordersRes.data ?? []).filter((o)=>o.payment_status === "paid" || !o.payment_status && LEGACY_PAID.includes(o.status ?? ""));
    const categoryRevenue = {};
    for (const order of paidOrders){
        const items = Array.isArray(order.items) ? order.items : [];
        const orderAmt = Number(order.total_amount ?? 0);
        if (items.length === 0) {
            // No line-item data — attribute entire order to Uncategorised
            categoryRevenue["Uncategorised"] = (categoryRevenue["Uncategorised"] ?? 0) + orderAmt;
            continue;
        }
        // Proportionally attribute by line-item subtotal
        const lineSum = items.reduce((s, item)=>s + Number(item.price ?? 0) * Number(item.quantity ?? 1), 0);
        for (const item of items){
            const cat = catMap[item.productId] ?? "Uncategorised";
            const lineAmt = Number(item.price ?? 0) * Number(item.quantity ?? 1);
            const proportion = lineSum > 0 ? lineAmt / lineSum : 1 / items.length;
            categoryRevenue[cat] = (categoryRevenue[cat] ?? 0) + orderAmt * proportion;
        }
    }
    return Object.entries(categoryRevenue).map(([category, revenue])=>({
            category,
            revenue
        })).sort((a, b)=>b.revenue - a.revenue);
}
async function fetchMonthlyRevenue(monthsBack = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - monthsBack);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("orders").select("total_amount, created_at, status, payment_status").gte("created_at", since.toISOString()).order("created_at", {
        ascending: true
    });
    if (error) {
        console.error("[metrics] fetchMonthlyRevenue:", error.message, error.details);
    }
    const LEGACY_PAID = [
        "paid",
        "processing",
        "fulfilled",
        "delivered",
        "packed",
        "ready_for_pickup",
        "shipped"
    ];
    const orders = (data ?? []).filter((o)=>o.payment_status === "paid" || !o.payment_status && LEGACY_PAID.includes(o.status ?? ""));
    const now = new Date();
    return Array.from({
        length: monthsBack
    }, (_, i)=>{
        const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
        const revenue = orders.filter((o)=>{
            const od = new Date(o.created_at);
            return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
        }).reduce((sum, o)=>sum + Number(o.total_amount ?? 0), 0);
        return {
            label: d.toLocaleDateString("en-US", {
                month: "short",
                year: "2-digit"
            }),
            revenue,
            month: d.getMonth(),
            year: d.getFullYear()
        };
    });
}
async function fetchRecentActivity(limit = 5) {
    const [ordersRes, requestsRes] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("orders").select("id, customer_name, customer_email, status, total_amount, created_at").order("created_at", {
            ascending: false
        }).limit(limit),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("custom_requests").select("id, customer_name, customer_email, status, created_at").order("created_at", {
            ascending: false
        }).limit(limit)
    ]);
    if (ordersRes.error) {
        console.error("[metrics] fetchRecentActivity (orders):", ordersRes.error.message);
    }
    if (requestsRes.error) {
        console.error("[metrics] fetchRecentActivity (requests):", requestsRes.error.message);
    }
    const items = [
        ...(ordersRes.data ?? []).map((o)=>({
                id: o.id,
                type: "order",
                label: o.customer_name || o.customer_email || "A customer",
                sub: `GH₵ ${Number(o.total_amount ?? 0).toFixed(2)}`,
                status: o.status,
                created_at: o.created_at
            })),
        ...(requestsRes.data ?? []).map((r)=>({
                id: r.id,
                type: "custom_request",
                label: r.customer_name || r.customer_email || "A client",
                sub: "Custom request",
                status: r.status || "inquiry",
                created_at: r.created_at
            }))
    ];
    return items.sort((a, b)=>new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
}
}),
"[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CategoryDonutChart",
    ()=>CategoryDonutChart,
    "ConversionFunnelChart",
    ()=>ConversionFunnelChart
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const CategoryDonutChart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call CategoryDonutChart() from the server but CategoryDonutChart is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx <module evaluation>", "CategoryDonutChart");
const ConversionFunnelChart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ConversionFunnelChart() from the server but ConversionFunnelChart is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx <module evaluation>", "ConversionFunnelChart");
}),
"[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CategoryDonutChart",
    ()=>CategoryDonutChart,
    "ConversionFunnelChart",
    ()=>ConversionFunnelChart
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const CategoryDonutChart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call CategoryDonutChart() from the server but CategoryDonutChart is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx", "CategoryDonutChart");
const ConversionFunnelChart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call ConversionFunnelChart() from the server but ConversionFunnelChart is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx", "ConversionFunnelChart");
}),
"[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$OverviewCharts$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$OverviewCharts$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$OverviewCharts$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/components/ui/PushNotificationBanner.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PushNotificationBanner",
    ()=>PushNotificationBanner
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const PushNotificationBanner = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call PushNotificationBanner() from the server but PushNotificationBanner is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/ui/PushNotificationBanner.tsx <module evaluation>", "PushNotificationBanner");
}),
"[project]/src/components/ui/PushNotificationBanner.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PushNotificationBanner",
    ()=>PushNotificationBanner
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const PushNotificationBanner = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call PushNotificationBanner() from the server but PushNotificationBanner is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/src/components/ui/PushNotificationBanner.tsx", "PushNotificationBanner");
}),
"[project]/src/components/ui/PushNotificationBanner.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$PushNotificationBanner$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/src/components/ui/PushNotificationBanner.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$PushNotificationBanner$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/src/components/ui/PushNotificationBanner.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$PushNotificationBanner$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/src/app/(dashboard)/overview/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DashboardOverviewPage,
    "dynamic",
    ()=>dynamic,
    "revalidate",
    ()=>revalidate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabaseAdmin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$metrics$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/metrics.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wallet.js [app-rsc] (ecmascript) <export default as Wallet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/package.js [app-rsc] (ecmascript) <export default as Package>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-rsc] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-rsc] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-rsc] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$OverviewCharts$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$PushNotificationBanner$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/PushNotificationBanner.tsx [app-rsc] (ecmascript)");
;
;
;
;
;
;
const dynamic = "force-dynamic";
const revalidate = 0;
const STATUS_STYLES = {
    paid: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        dot: "bg-emerald-400"
    },
    fulfilled: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        dot: "bg-blue-400"
    },
    delivered: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        dot: "bg-blue-400"
    },
    processing: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        dot: "bg-blue-400"
    },
    pending: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        dot: "bg-amber-400"
    },
    packed: {
        bg: "bg-purple-50",
        text: "text-purple-700",
        dot: "bg-purple-400"
    },
    cancelled: {
        bg: "bg-rose-50",
        text: "text-rose-700",
        dot: "bg-rose-400"
    },
    refunded: {
        bg: "bg-rose-50",
        text: "text-rose-700",
        dot: "bg-rose-400"
    }
};
async function DashboardOverviewPage() {
    const [stats, recentActivity, productRowsRes, orderStatusesRes, lowStockProductsRes] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$metrics$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fetchOrderStats"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$metrics$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["fetchRecentActivity"])(5),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("products").select("id, category_type").eq("is_active", true),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("orders").select("status"),
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabaseAdmin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabaseAdmin"].from("products").select("id, name, inventory_count").eq("is_active", true).eq("track_inventory", true).lt("inventory_count", 5).order("inventory_count")
    ]);
    const { data: productRows, error: productRowsError } = productRowsRes;
    const { data: orderStatuses, error: orderStatusesError } = orderStatusesRes;
    const { data: lowStockProducts, error: lowStockProductsError } = lowStockProductsRes;
    if (orderStatusesError) {
        console.error("Supabase Fetch Error (orders):", orderStatusesError.message, orderStatusesError.details, orderStatusesError.hint);
    }
    if (productRowsError) {
        console.error("Supabase Fetch Error (productRows):", productRowsError.message, productRowsError.details, productRowsError.hint);
    }
    if (lowStockProductsError) {
        console.error("Supabase Fetch Error (lowStockProducts):", lowStockProductsError.message, lowStockProductsError.details, lowStockProductsError.hint);
    }
    // Products by category (catalog distribution, not revenue)
    const categoryMap = {};
    for (const p of productRows ?? []){
        const key = p.category_type || "Uncategorised";
        categoryMap[key] = (categoryMap[key] ?? 0) + 1;
    }
    const totalProducts = productRows?.length ?? 0;
    const categoryEntries = Object.entries(categoryMap).sort((a, b)=>b[1] - a[1]);
    // Order status counts
    const statusMap = {};
    for (const o of orderStatuses ?? []){
        statusMap[o.status] = (statusMap[o.status] ?? 0) + 1;
    }
    // Conversion funnel
    const funnelMax = Math.max(stats.totalOrders, 1);
    const funnelSteps = [
        {
            label: "Orders",
            value: stats.totalOrders,
            h: 100
        },
        {
            label: "Paid",
            value: stats.revenueOrderCount,
            h: Math.round(stats.revenueOrderCount / funnelMax * 100)
        },
        {
            label: "Fulfilled",
            value: stats.fulfilledCount,
            h: Math.round(stats.fulfilledCount / funnelMax * 100)
        }
    ];
    const kpiCards = [
        {
            label: "Total Revenue",
            value: `GH₵ ${stats.totalRevenue.toFixed(2)}`,
            sub: "Lifetime Sales",
            Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"],
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600"
        },
        {
            label: "Unfulfilled",
            value: String(stats.pendingCount + stats.processingCount),
            sub: "Paid · Awaiting Ship",
            Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$package$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__Package$3e$__["Package"],
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            valueColor: "text-amber-600"
        },
        {
            label: "Fulfilled",
            value: String(stats.fulfilledCount),
            sub: "Shipped · Delivered",
            Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"],
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            valueColor: "text-blue-600"
        },
        {
            label: "Avg. Order Value",
            value: `GH₵ ${stats.avgOrderValue.toFixed(2)}`,
            sub: "Per Paid Order",
            Icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"],
            iconBg: "bg-purple-50",
            iconColor: "text-purple-600"
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-10",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "font-serif text-3xl tracking-widest uppercase mb-2",
                        children: "Overview"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 118,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-neutral-500",
                        children: "Welcome back. Here is what is happening at the atelier today."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 119,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                lineNumber: 117,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$PushNotificationBanner$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PushNotificationBanner"], {}, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                lineNumber: 122,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                children: kpiCards.map(({ label, value, sub, Icon, iconBg, iconColor, valueColor })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-2xl shadow-sm p-6 flex flex-col justify-between relative overflow-hidden hover:shadow-md transition-shadow duration-200",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center ${iconBg}`,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                    size: 16,
                                    className: iconColor
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                    lineNumber: 132,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 131,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs font-semibold text-neutral-400 mb-6 block",
                                children: label
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 134,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: `text-3xl font-serif ${valueColor ?? "text-neutral-900"}`,
                                children: value
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 135,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[10px] text-neutral-400 mt-2 block uppercase tracking-wider",
                                children: sub
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 136,
                                columnNumber: 25
                            }, this)
                        ]
                    }, label, true, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 127,
                        columnNumber: 21
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                lineNumber: 125,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-2xl shadow-sm p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6",
                                children: "Catalog by Category"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 144,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$OverviewCharts$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CategoryDonutChart"], {
                                categoryEntries: categoryEntries,
                                totalProducts: totalProducts
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 145,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 143,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white rounded-2xl shadow-sm p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6",
                                children: "Conversion Funnel"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 150,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$OverviewCharts$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ConversionFunnelChart"], {
                                funnelSteps: funnelSteps,
                                conversionRate: stats.conversionRate
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 151,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 149,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                lineNumber: 141,
                columnNumber: 13
            }, this),
            Object.keys(statusMap).length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white rounded-2xl shadow-sm p-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-6",
                        children: "Order Status Breakdown"
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 158,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-2 md:grid-cols-4 gap-4",
                        children: Object.entries(statusMap).map(([status, count])=>{
                            const style = STATUS_STYLES[status] ?? {
                                bg: "bg-neutral-50",
                                text: "text-neutral-600",
                                dot: "bg-neutral-400"
                            };
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `p-5 rounded-xl ${style.bg} hover:shadow-md transition-all duration-200 cursor-default`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2 mb-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: `w-2 h-2 rounded-full ${style.dot}`
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                                lineNumber: 168,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: `text-[10px] uppercase tracking-widest font-semibold ${style.text} capitalize`,
                                                children: status
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                                lineNumber: 169,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                        lineNumber: 167,
                                        columnNumber: 37
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `text-3xl font-serif ${style.text}`,
                                        children: count
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                        lineNumber: 173,
                                        columnNumber: 37
                                    }, this)
                                ]
                            }, status, true, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 163,
                                columnNumber: 33
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 159,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                lineNumber: 157,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white rounded-2xl shadow-sm overflow-hidden",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-6 py-4 border-b border-neutral-100",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-xs font-semibold uppercase tracking-widest text-neutral-500",
                            children: "Recent Activity"
                        }, void 0, false, {
                            fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                            lineNumber: 184,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 183,
                        columnNumber: 17
                    }, this),
                    recentActivity.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-6 py-12 text-center text-neutral-400 italic font-serif",
                        children: "No recent activity to display."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 187,
                        columnNumber: 21
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                        className: "divide-y divide-neutral-50",
                        children: recentActivity.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                className: "px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm text-neutral-900",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-medium",
                                                        children: item.label
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                                        lineNumber: 199,
                                                        columnNumber: 41
                                                    }, this),
                                                    " ",
                                                    "placed an order."
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                                lineNumber: 198,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-neutral-400 mt-0.5",
                                                children: item.sub
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                                lineNumber: 202,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                        lineNumber: 197,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-right flex-shrink-0 ml-4",
                                        children: [
                                            (()=>{
                                                const style = STATUS_STYLES[item.status] ?? {
                                                    bg: "bg-neutral-100",
                                                    text: "text-neutral-600"
                                                };
                                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: `text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full font-medium ${style.bg} ${style.text}`,
                                                    children: item.status
                                                }, void 0, false, {
                                                    fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                                    lineNumber: 208,
                                                    columnNumber: 45
                                                }, this);
                                            })(),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-neutral-400 mt-2",
                                                children: new Date(item.created_at).toLocaleDateString()
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                                lineNumber: 213,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                        lineNumber: 204,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, `${item.type}-${item.id}`, true, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 193,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 191,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                lineNumber: 182,
                columnNumber: 13
            }, this),
            lowStockProducts && lowStockProducts.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-amber-50 rounded-2xl border border-amber-100 p-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between mb-5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                        size: 16,
                                        className: "text-amber-600"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                        lineNumber: 228,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] uppercase tracking-widest font-semibold text-amber-700",
                                        children: "Low Stock Alert"
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                        lineNumber: 229,
                                        columnNumber: 29
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "bg-amber-200 text-amber-800 text-[10px] px-2 py-0.5 font-semibold rounded-full",
                                        children: [
                                            lowStockProducts.length,
                                            lowStockProducts.length === 15 ? "+" : ""
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                        lineNumber: 230,
                                        columnNumber: 29
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 227,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/catalog/products/low-stock",
                                className: "text-[10px] uppercase tracking-widest font-semibold text-amber-700 hover:text-amber-900 border-b border-amber-400 hover:border-amber-700 transition-colors pb-0.5",
                                children: "View All →"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 234,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 226,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-2 md:grid-cols-4 gap-3",
                        children: lowStockProducts.slice(0, 15).map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-white rounded-xl border border-amber-100 px-4 py-3 hover:shadow-sm transition-shadow",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-sm font-medium text-neutral-800 truncate",
                                        children: p.name
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                        lineNumber: 244,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `text-xs mt-1 font-semibold ${p.inventory_count === 0 ? "text-rose-600" : "text-amber-600"}`,
                                        children: p.inventory_count === 0 ? "Out of stock" : `${p.inventory_count} remaining`
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                        lineNumber: 245,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, p.id, true, {
                                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                                lineNumber: 243,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                        lineNumber: 241,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
                lineNumber: 225,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(dashboard)/overview/page.tsx",
        lineNumber: 116,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/app/(dashboard)/overview/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/src/app/(dashboard)/overview/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__49dd3963._.js.map