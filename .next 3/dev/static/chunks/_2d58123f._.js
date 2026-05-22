(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/app/(shop)/account/orders/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AccountOrdersPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
// ── Status timeline ───────────────────────────────────────────────────────────
const DELIVERY_STEPS = [
    {
        key: "ordered",
        label: "Ordered"
    },
    {
        key: "processing",
        label: "Processing"
    },
    {
        key: "packed",
        label: "Packed"
    },
    {
        key: "shipped",
        label: "Shipped"
    },
    {
        key: "delivered",
        label: "Delivered"
    }
];
const PICKUP_STEPS = [
    {
        key: "ordered",
        label: "Ordered"
    },
    {
        key: "processing",
        label: "Processing"
    },
    {
        key: "packed",
        label: "Packed"
    },
    {
        key: "ready_for_pickup",
        label: "Ready"
    },
    {
        key: "collected",
        label: "Collected"
    }
];
function deliveryStatusToStep(status) {
    switch(status){
        case "pending":
            return 0;
        case "paid":
        case "processing":
            return 1;
        case "packed":
            return 2;
        case "shipped":
            return 3;
        case "delivered":
        case "fulfilled":
            return 4;
        default:
            return 0;
    }
}
function pickupStatusToStep(status) {
    switch(status){
        case "pending":
            return 0;
        case "paid":
        case "processing":
            return 1;
        case "packed":
            return 2;
        case "ready_for_pickup":
            return 3;
        case "fulfilled":
        case "delivered":
            return 4;
        default:
            return 0;
    }
}
function isCancelled(status) {
    return status === "cancelled" || status === "refunded";
}
function isPickupOrder(deliveryMethod) {
    return deliveryMethod?.toLowerCase().includes("pickup") ?? false;
}
function StatusTimeline(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(17);
    if ($[0] !== "72c101b815bea8078bf5bda7587a62daa7c2daca6a02213b8c10ffe87f27c7e8") {
        for(let $i = 0; $i < 17; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "72c101b815bea8078bf5bda7587a62daa7c2daca6a02213b8c10ffe87f27c7e8";
    }
    const { status, deliveryMethod } = t0;
    if (isCancelled(status)) {
        let t1;
        if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
            t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "inline-block w-2 h-2 rounded-full bg-red-400"
            }, void 0, false, {
                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                lineNumber: 100,
                columnNumber: 12
            }, this);
            $[1] = t1;
        } else {
            t1 = $[1];
        }
        const t2 = status === "refunded" ? "Refunded" : "Cancelled";
        let t3;
        if ($[2] !== t2) {
            t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-4 flex items-center gap-2",
                children: [
                    t1,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-[10px] uppercase tracking-widest text-red-500 font-semibold",
                        children: t2
                    }, void 0, false, {
                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                        lineNumber: 108,
                        columnNumber: 62
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                lineNumber: 108,
                columnNumber: 12
            }, this);
            $[2] = t2;
            $[3] = t3;
        } else {
            t3 = $[3];
        }
        return t3;
    }
    let t1;
    if ($[4] !== deliveryMethod) {
        t1 = isPickupOrder(deliveryMethod);
        $[4] = deliveryMethod;
        $[5] = t1;
    } else {
        t1 = $[5];
    }
    const pickup = t1;
    const steps = pickup ? PICKUP_STEPS : DELIVERY_STEPS;
    let t2;
    if ($[6] !== pickup || $[7] !== status) {
        t2 = pickup ? pickupStatusToStep(status) : deliveryStatusToStep(status);
        $[6] = pickup;
        $[7] = status;
        $[8] = t2;
    } else {
        t2 = $[8];
    }
    const active = t2;
    let t3;
    if ($[9] !== active || $[10] !== steps) {
        let t4;
        if ($[12] !== active || $[13] !== steps.length) {
            t4 = ({
                "StatusTimeline[steps.map()]": (step, i)=>{
                    const done = i < active;
                    const current = i === active;
                    const future = i > active;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center min-w-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center shrink-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${done ? "bg-black border-black" : current ? "bg-white border-black" : "bg-white border-neutral-300"}`,
                                        children: done ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                            size: 11,
                                            className: "text-white",
                                            strokeWidth: 3
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                            lineNumber: 145,
                                            columnNumber: 339
                                        }, this) : current ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-2 h-2 rounded-full bg-black"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                            lineNumber: 145,
                                            columnNumber: 410
                                        }, this) : null
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                        lineNumber: 145,
                                        columnNumber: 129
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `mt-1.5 text-[9px] uppercase tracking-wider whitespace-nowrap font-semibold ${future ? "text-neutral-300" : "text-black"}`,
                                        children: step.label
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                        lineNumber: 145,
                                        columnNumber: 473
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                lineNumber: 145,
                                columnNumber: 76
                            }, this),
                            i < steps.length - 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `h-[2px] w-8 md:w-14 shrink-0 mx-1 ${done ? "bg-black" : "bg-neutral-200"}`
                            }, void 0, false, {
                                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                lineNumber: 145,
                                columnNumber: 664
                            }, this)
                        ]
                    }, step.key, true, {
                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                        lineNumber: 145,
                        columnNumber: 18
                    }, this);
                }
            })["StatusTimeline[steps.map()]"];
            $[12] = active;
            $[13] = steps.length;
            $[14] = t4;
        } else {
            t4 = $[14];
        }
        t3 = steps.map(t4);
        $[9] = active;
        $[10] = steps;
        $[11] = t3;
    } else {
        t3 = $[11];
    }
    let t4;
    if ($[15] !== t3) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "mt-4 flex items-center gap-0 overflow-x-auto",
            children: t3
        }, void 0, false, {
            fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
            lineNumber: 163,
            columnNumber: 10
        }, this);
        $[15] = t3;
        $[16] = t4;
    } else {
        t4 = $[16];
    }
    return t4;
}
_c = StatusTimeline;
// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
    paid: "bg-green-50 text-green-700",
    packed: "bg-blue-50 text-blue-700",
    shipped: "bg-indigo-50 text-indigo-700",
    processing: "bg-blue-50 text-blue-700",
    pending: "bg-amber-50 text-amber-700",
    fulfilled: "bg-emerald-50 text-emerald-800",
    delivered: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-50 text-red-600",
    refunded: "bg-neutral-100 text-neutral-600",
    ready_for_pickup: "bg-neutral-900 text-white"
};
function statusLabel(status) {
    if (status === "ready_for_pickup") return "Ready for Pickup";
    return status;
}
function AccountOrdersPage() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(10);
    if ($[0] !== "72c101b815bea8078bf5bda7587a62daa7c2daca6a02213b8c10ffe87f27c7e8") {
        for(let $i = 0; $i < 10; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "72c101b815bea8078bf5bda7587a62daa7c2daca6a02213b8c10ffe87f27c7e8";
    }
    let t0;
    if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
        t0 = [];
        $[1] = t0;
    } else {
        t0 = $[1];
    }
    const [orders, setOrders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(t0);
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = {};
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    const [riders, setRiders] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(t1);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    let t2;
    let t3;
    if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
        t2 = ({
            "AccountOrdersPage[useEffect()]": ()=>{
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getUser().then({
                    "AccountOrdersPage[useEffect() > (anonymous)()]": async (t4)=>{
                        const { data: t5 } = t4;
                        const { user } = t5;
                        if (!user) {
                            return;
                        }
                        const [t6, t7] = await Promise.all([
                            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("orders").select("id, created_at, total_amount, status, assigned_rider_id, paystack_reference, delivery_method").eq("customer_id", user.id).order("created_at", {
                                ascending: false
                            }),
                            user.email ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("orders").select("id, created_at, total_amount, status, assigned_rider_id, paystack_reference, delivery_method").eq("customer_email", user.email).order("created_at", {
                                ascending: false
                            }) : Promise.resolve({
                                data: []
                            })
                        ]);
                        const { data: byId } = t6;
                        const { data: byEmail } = t7;
                        const seen = new Set();
                        const allOrders = [
                            ...byId ?? [],
                            ...byEmail ?? []
                        ].filter({
                            "AccountOrdersPage[useEffect() > (anonymous)() > (anonymous)()]": (o)=>{
                                if (seen.has(o.id)) {
                                    return false;
                                }
                                seen.add(o.id);
                                return true;
                            }
                        }["AccountOrdersPage[useEffect() > (anonymous)() > (anonymous)()]"]).sort(_AccountOrdersPageUseEffectAnonymousAnonymous);
                        setOrders(allOrders);
                        const riderIds = [
                            ...new Set(allOrders.map(_AccountOrdersPageUseEffectAnonymousAllOrdersMap).filter(Boolean))
                        ];
                        if (riderIds.length > 0) {
                            const { data: riderData } = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].from("riders").select("id, full_name, phone_number").in("id", riderIds);
                            const map = {};
                            (riderData ?? []).forEach({
                                "AccountOrdersPage[useEffect() > (anonymous)() > (anonymous)()]": (r)=>{
                                    map[r.id] = r;
                                }
                            }["AccountOrdersPage[useEffect() > (anonymous)() > (anonymous)()]"]);
                            setRiders(map);
                        }
                        setLoading(false);
                    }
                }["AccountOrdersPage[useEffect() > (anonymous)()]"]);
            }
        })["AccountOrdersPage[useEffect()]"];
        t3 = [];
        $[3] = t2;
        $[4] = t3;
    } else {
        t2 = $[3];
        t3 = $[4];
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])(t2, t3);
    if (loading) {
        let t4;
        if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
            t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-neutral-400 italic font-serif",
                children: "Loading..."
            }, void 0, false, {
                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                lineNumber: 303,
                columnNumber: 12
            }, this);
            $[5] = t4;
        } else {
            t4 = $[5];
        }
        return t4;
    }
    let t4;
    if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "font-serif text-xl tracking-widest uppercase mb-8",
            children: "Order History"
        }, void 0, false, {
            fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
            lineNumber: 312,
            columnNumber: 10
        }, this);
        $[6] = t4;
    } else {
        t4 = $[6];
    }
    let t5;
    if ($[7] !== orders || $[8] !== riders) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t4,
                orders.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-neutral-500 italic font-serif text-center py-16",
                    children: "You have no orders yet."
                }, void 0, false, {
                    fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                    lineNumber: 319,
                    columnNumber: 42
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: orders.map({
                        "AccountOrdersPage[orders.map()]": (order)=>{
                            const rider = order.assigned_rider_id ? riders[order.assigned_rider_id] : null;
                            const isShipped = order.status === "shipped" || order.status === "processing";
                            const isReadyPickup = order.status === "ready_for_pickup";
                            const pickup = isPickupOrder(order.delivery_method);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border border-neutral-200 bg-white p-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-wrap items-start justify-between gap-4 mb-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "font-mono text-xs text-neutral-500 mb-1",
                                                        children: [
                                                            "ORDER #",
                                                            order.id.substring(0, 8).toUpperCase()
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                        lineNumber: 325,
                                                        columnNumber: 167
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-neutral-400",
                                                        children: new Date(order.created_at).toLocaleDateString("en-GH", {
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric"
                                                        })
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                        lineNumber: 325,
                                                        columnNumber: 273
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                lineNumber: 325,
                                                columnNumber: 162
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-3 flex-wrap",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `px-2 py-0.5 text-[10px] uppercase tracking-widest font-semibold rounded-sm ${pickup ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`,
                                                        children: pickup ? "Pickup" : "Delivery"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                        lineNumber: 329,
                                                        columnNumber: 85
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-medium text-sm",
                                                        children: [
                                                            "GH₵ ",
                                                            Number(order.total_amount ?? 0).toFixed(2)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                        lineNumber: 329,
                                                        columnNumber: 295
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: `px-2 py-1 text-[10px] uppercase tracking-widest rounded ${STATUS_STYLES[order.status] ?? "bg-neutral-100 text-neutral-600"}`,
                                                        children: statusLabel(order.status)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                        lineNumber: 329,
                                                        columnNumber: 388
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                lineNumber: 329,
                                                columnNumber: 34
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                        lineNumber: 325,
                                        columnNumber: 91
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(StatusTimeline, {
                                        status: order.status,
                                        deliveryMethod: order.delivery_method
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                        lineNumber: 329,
                                        columnNumber: 578
                                    }, this),
                                    isReadyPickup && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-neutral-900 text-white px-4 py-3 mt-4 text-xs",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "font-semibold uppercase tracking-widest mb-1",
                                                children: "Ready for Collection"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                lineNumber: 329,
                                                columnNumber: 741
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-neutral-300",
                                                children: "Your order is packed and waiting at our store. Please bring your order number when you arrive."
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                lineNumber: 329,
                                                columnNumber: 825
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                        lineNumber: 329,
                                        columnNumber: 675
                                    }, this),
                                    isShipped && rider && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "bg-indigo-50 border border-indigo-100 px-4 py-3 mt-4 text-xs",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "font-semibold uppercase tracking-widest text-indigo-700 mb-1",
                                                children: "Dispatch Rider"
                                            }, void 0, false, {
                                                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                lineNumber: 329,
                                                columnNumber: 1063
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-indigo-600",
                                                children: [
                                                    rider.full_name,
                                                    " · ",
                                                    rider.phone_number
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                                lineNumber: 329,
                                                columnNumber: 1157
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                        lineNumber: 329,
                                        columnNumber: 985
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-4 flex justify-end",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: `/account/orders/${order.id}`,
                                            className: "text-[10px] uppercase tracking-widest font-semibold text-neutral-500 hover:text-black transition-colors border-b border-neutral-300 hover:border-black pb-0.5",
                                            children: "View Details →"
                                        }, void 0, false, {
                                            fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                            lineNumber: 329,
                                            columnNumber: 1278
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                        lineNumber: 329,
                                        columnNumber: 1239
                                    }, this)
                                ]
                            }, order.id, true, {
                                fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                                lineNumber: 325,
                                columnNumber: 20
                            }, this);
                        }
                    }["AccountOrdersPage[orders.map()]"])
                }, void 0, false, {
                    fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
                    lineNumber: 319,
                    columnNumber: 140
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/app/(shop)/account/orders/page.tsx",
            lineNumber: 319,
            columnNumber: 10
        }, this);
        $[7] = orders;
        $[8] = riders;
        $[9] = t5;
    } else {
        t5 = $[9];
    }
    return t5;
}
_s(AccountOrdersPage, "sdqSA1Cnk5tI0J4ijnlmgjmhTO8=");
_c1 = AccountOrdersPage;
function _AccountOrdersPageUseEffectAnonymousAllOrdersMap(o_0) {
    return o_0.assigned_rider_id;
}
function _AccountOrdersPageUseEffectAnonymousAnonymous(a, b) {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}
var _c, _c1;
__turbopack_context__.k.register(_c, "StatusTimeline");
__turbopack_context__.k.register(_c1, "AccountOrdersPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>Check
]);
/**
 * @license lucide-react v0.577.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M20 6 9 17l-5-5",
            key: "1gmf2c"
        }
    ]
];
const Check = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("check", __iconNode);
;
 //# sourceMappingURL=check.js.map
}),
"[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Check",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_2d58123f._.js.map