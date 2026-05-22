(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CategoryDonutChart",
    ()=>CategoryDonutChart,
    "ConversionFunnelChart",
    ()=>ConversionFunnelChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$PieChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/PieChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$polar$2f$Pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/polar/Pie.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Cell.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/ResponsiveContainer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Legend.js [app-client] (ecmascript)");
"use client";
;
;
;
const DONUT_COLORS = [
    "#1a1a1a",
    "#525252",
    "#737373",
    "#a3a3a3",
    "#c5c5c5",
    "#e5e5e5"
];
function CustomLegend(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(5);
    if ($[0] !== "ec456a4faa9f568cd52f22319243d8163ce1887a3133416d9707de8ccfd7d8ab") {
        for(let $i = 0; $i < 5; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "ec456a4faa9f568cd52f22319243d8163ce1887a3133416d9707de8ccfd7d8ab";
    }
    const { payload } = t0;
    if (!payload) {
        return null;
    }
    let t1;
    if ($[1] !== payload) {
        t1 = payload.map(_CustomLegendPayloadMap);
        $[1] = payload;
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    let t2;
    if ($[3] !== t1) {
        t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2",
            children: t1
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 36,
            columnNumber: 10
        }, this);
        $[3] = t1;
        $[4] = t2;
    } else {
        t2 = $[4];
    }
    return t2;
}
_c = CustomLegend;
function _CustomLegendPayloadMap(entry, i) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "flex items-center gap-1.5 text-[10px] text-neutral-500 capitalize",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "inline-block w-2 h-2 rounded-full",
                style: {
                    backgroundColor: entry.color
                }
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                lineNumber: 45,
                columnNumber: 102
            }, this),
            entry.name
        ]
    }, i, true, {
        fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
        lineNumber: 45,
        columnNumber: 10
    }, this);
}
function CategoryDonutChart(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(48);
    if ($[0] !== "ec456a4faa9f568cd52f22319243d8163ce1887a3133416d9707de8ccfd7d8ab") {
        for(let $i = 0; $i < 48; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "ec456a4faa9f568cd52f22319243d8163ce1887a3133416d9707de8ccfd7d8ab";
    }
    const { categoryEntries, totalProducts } = t0;
    let T0;
    let T1;
    let T2;
    let t1;
    let t10;
    let t11;
    let t12;
    let t2;
    let t3;
    let t4;
    let t5;
    let t6;
    let t7;
    let t8;
    let t9;
    if ($[1] !== categoryEntries) {
        t12 = Symbol.for("react.early_return_sentinel");
        bb0: {
            const data = categoryEntries.map(_CategoryDonutChartCategoryEntriesMap);
            if (data.length === 0) {
                let t13;
                if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
                    t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-neutral-400 italic text-sm font-serif",
                        children: "No active products yet."
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                        lineNumber: 83,
                        columnNumber: 17
                    }, this);
                    $[17] = t13;
                } else {
                    t13 = $[17];
                }
                t12 = t13;
                break bb0;
            }
            t11 = "relative";
            T2 = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"];
            t9 = "100%";
            t10 = 240;
            T1 = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$PieChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PieChart"];
            T0 = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$polar$2f$Pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Pie"];
            t1 = data;
            t2 = "50%";
            t3 = "50%";
            t4 = 68;
            t5 = 100;
            t6 = "value";
            t7 = 2;
            t8 = data.map(_CategoryDonutChartDataMap);
        }
        $[1] = categoryEntries;
        $[2] = T0;
        $[3] = T1;
        $[4] = T2;
        $[5] = t1;
        $[6] = t10;
        $[7] = t11;
        $[8] = t12;
        $[9] = t2;
        $[10] = t3;
        $[11] = t4;
        $[12] = t5;
        $[13] = t6;
        $[14] = t7;
        $[15] = t8;
        $[16] = t9;
    } else {
        T0 = $[2];
        T1 = $[3];
        T2 = $[4];
        t1 = $[5];
        t10 = $[6];
        t11 = $[7];
        t12 = $[8];
        t2 = $[9];
        t3 = $[10];
        t4 = $[11];
        t5 = $[12];
        t6 = $[13];
        t7 = $[14];
        t8 = $[15];
        t9 = $[16];
    }
    if (t12 !== Symbol.for("react.early_return_sentinel")) {
        return t12;
    }
    let t13;
    if ($[18] !== T0 || $[19] !== t1 || $[20] !== t2 || $[21] !== t3 || $[22] !== t4 || $[23] !== t5 || $[24] !== t6 || $[25] !== t7 || $[26] !== t8) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(T0, {
            data: t1,
            cx: t2,
            cy: t3,
            innerRadius: t4,
            outerRadius: t5,
            dataKey: t6,
            paddingAngle: t7,
            children: t8
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 144,
            columnNumber: 11
        }, this);
        $[18] = T0;
        $[19] = t1;
        $[20] = t2;
        $[21] = t3;
        $[22] = t4;
        $[23] = t5;
        $[24] = t6;
        $[25] = t7;
        $[26] = t8;
        $[27] = t13;
    } else {
        t13 = $[27];
    }
    let t14;
    if ($[28] === Symbol.for("react.memo_cache_sentinel")) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
            contentStyle: {
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #e5e5e5",
                background: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
            },
            formatter: _CategoryDonutChartTooltipFormatter
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 160,
            columnNumber: 11
        }, this);
        $[28] = t14;
    } else {
        t14 = $[28];
    }
    let t15;
    if ($[29] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Legend"], {
            content: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CustomLegend, {}, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                lineNumber: 173,
                columnNumber: 28
            }, void 0)
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 173,
            columnNumber: 11
        }, this);
        $[29] = t15;
    } else {
        t15 = $[29];
    }
    let t16;
    if ($[30] !== T1 || $[31] !== t13) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(T1, {
            children: [
                t13,
                t14,
                t15
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 180,
            columnNumber: 11
        }, this);
        $[30] = T1;
        $[31] = t13;
        $[32] = t16;
    } else {
        t16 = $[32];
    }
    let t17;
    if ($[33] !== T2 || $[34] !== t10 || $[35] !== t16 || $[36] !== t9) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(T2, {
            width: t9,
            height: t10,
            children: t16
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 189,
            columnNumber: 11
        }, this);
        $[33] = T2;
        $[34] = t10;
        $[35] = t16;
        $[36] = t9;
        $[37] = t17;
    } else {
        t17 = $[37];
    }
    let t18;
    if ($[38] === Symbol.for("react.memo_cache_sentinel")) {
        t18 = {
            top: 0,
            bottom: 32
        };
        $[38] = t18;
    } else {
        t18 = $[38];
    }
    let t19;
    if ($[39] !== totalProducts) {
        t19 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-2xl font-serif text-neutral-900",
            children: totalProducts
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 210,
            columnNumber: 11
        }, this);
        $[39] = totalProducts;
        $[40] = t19;
    } else {
        t19 = $[40];
    }
    let t20;
    if ($[41] === Symbol.for("react.memo_cache_sentinel")) {
        t20 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-[9px] uppercase tracking-widest text-neutral-400 mt-0.5",
            children: "Products"
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 218,
            columnNumber: 11
        }, this);
        $[41] = t20;
    } else {
        t20 = $[41];
    }
    let t21;
    if ($[42] !== t19) {
        t21 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "absolute inset-0 flex flex-col items-center justify-center pointer-events-none",
            style: t18,
            children: [
                t19,
                t20
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 225,
            columnNumber: 11
        }, this);
        $[42] = t19;
        $[43] = t21;
    } else {
        t21 = $[43];
    }
    let t22;
    if ($[44] !== t11 || $[45] !== t17 || $[46] !== t21) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: t11,
            children: [
                t17,
                t21
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 233,
            columnNumber: 11
        }, this);
        $[44] = t11;
        $[45] = t17;
        $[46] = t21;
        $[47] = t22;
    } else {
        t22 = $[47];
    }
    return t22;
}
_c1 = CategoryDonutChart;
function _CategoryDonutChartTooltipFormatter(value_0, name_0) {
    return [
        `${value_0} product${Number(value_0) !== 1 ? "s" : ""}`,
        String(name_0)
    ];
}
function _CategoryDonutChartDataMap(_, i) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Cell"], {
        fill: DONUT_COLORS[i % DONUT_COLORS.length]
    }, i, false, {
        fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
        lineNumber: 247,
        columnNumber: 10
    }, this);
}
function _CategoryDonutChartCategoryEntriesMap(t0) {
    const [name, value] = t0;
    return {
        name: name.replace(/_/g, " "),
        value
    };
}
function ConversionFunnelChart(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(12);
    if ($[0] !== "ec456a4faa9f568cd52f22319243d8163ce1887a3133416d9707de8ccfd7d8ab") {
        for(let $i = 0; $i < 12; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "ec456a4faa9f568cd52f22319243d8163ce1887a3133416d9707de8ccfd7d8ab";
    }
    const { funnelSteps, conversionRate } = t0;
    if (!funnelSteps[0] || funnelSteps[0].value === 0) {
        let t1;
        if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
            t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-neutral-400 italic text-sm font-serif",
                children: "No activity yet. Funnel will populate as orders come in."
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                lineNumber: 271,
                columnNumber: 12
            }, this);
            $[1] = t1;
        } else {
            t1 = $[1];
        }
        return t1;
    }
    let t1;
    if ($[2] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = [
            {
                bar: "#e5e5e5",
                text: "text-neutral-500"
            },
            {
                bar: "#737373",
                text: "text-neutral-600"
            },
            {
                bar: "#1a1a1a",
                text: "text-neutral-900"
            }
        ];
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    const stepStyles = t1;
    let t2;
    if ($[3] !== funnelSteps) {
        let t3;
        if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
            t3 = ({
                "ConversionFunnelChart[funnelSteps.map()]": (step, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-between text-xs mb-1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: `capitalize font-medium ${stepStyles[i]?.text ?? "text-neutral-700"}`,
                                        children: step.label
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                                        lineNumber: 300,
                                        columnNumber: 141
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-semibold text-neutral-800",
                                        children: step.value
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                                        lineNumber: 300,
                                        columnNumber: 248
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                                lineNumber: 300,
                                columnNumber: 88
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-full bg-neutral-100 rounded-full h-3 overflow-hidden",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "h-3 rounded-full transition-all duration-700",
                                    style: {
                                        width: `${Math.max(step.h, 2)}%`,
                                        backgroundColor: stepStyles[i]?.bar ?? "#000"
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                                    lineNumber: 300,
                                    columnNumber: 394
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                                lineNumber: 300,
                                columnNumber: 322
                            }, this)
                        ]
                    }, step.label, true, {
                        fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                        lineNumber: 300,
                        columnNumber: 66
                    }, this)
            })["ConversionFunnelChart[funnelSteps.map()]"];
            $[5] = t3;
        } else {
            t3 = $[5];
        }
        t2 = funnelSteps.map(t3);
        $[3] = funnelSteps;
        $[4] = t2;
    } else {
        t2 = $[4];
    }
    let t3;
    if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-xs text-neutral-500",
            children: "Order-to-Fulfillment Rate"
        }, void 0, false, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 317,
            columnNumber: 10
        }, this);
        $[6] = t3;
    } else {
        t3 = $[6];
    }
    let t4;
    if ($[7] !== conversionRate) {
        t4 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "pt-4 border-t border-neutral-100 flex items-center justify-between",
            children: [
                t3,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm font-semibold text-neutral-900",
                    children: [
                        conversionRate,
                        "%"
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
                    lineNumber: 324,
                    columnNumber: 98
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 324,
            columnNumber: 10
        }, this);
        $[7] = conversionRate;
        $[8] = t4;
    } else {
        t4 = $[8];
    }
    let t5;
    if ($[9] !== t2 || $[10] !== t4) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-4",
            children: [
                t2,
                t4
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/miss-tokyo/OverviewCharts.tsx",
            lineNumber: 332,
            columnNumber: 10
        }, this);
        $[9] = t2;
        $[10] = t4;
        $[11] = t5;
    } else {
        t5 = $[11];
    }
    return t5;
}
_c2 = ConversionFunnelChart;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "CustomLegend");
__turbopack_context__.k.register(_c1, "CategoryDonutChart");
__turbopack_context__.k.register(_c2, "ConversionFunnelChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/PushNotificationBanner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PushNotificationBanner",
    ()=>PushNotificationBanner
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function PushNotificationBanner() {
    _s();
    const [show, setShow] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [dismissed, setDismissed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PushNotificationBanner.useEffect": ()=>{
            if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
            if (Notification.permission === "granted") {
                navigator.serviceWorker.ready.then({
                    "PushNotificationBanner.useEffect": (reg)=>reg.pushManager.getSubscription()
                }["PushNotificationBanner.useEffect"]).then({
                    "PushNotificationBanner.useEffect": (sub)=>{
                        if (!sub) setShow(true);
                    }
                }["PushNotificationBanner.useEffect"]);
            } else if (Notification.permission === "default") {
                setShow(true);
            }
        }
    }["PushNotificationBanner.useEffect"], []);
    async function handleEnable() {
        setLoading(true);
        try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") {
                setDismissed(true);
                setShow(false);
                return;
            }
            await navigator.serviceWorker.register("/sw.js");
            const reg_0 = await navigator.serviceWorker.ready;
            const vapidKey = ("TURBOPACK compile-time value", "BDlpSwqVW4J83mcFbzyc63WK-zDBsxbFdis6whW6aU_ChHbV_4O9qArS269-ECM-n47mhT-YLOVcDlFgrX0IuFY");
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const raw = atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/"));
            const uint8 = new Uint8Array(raw.length);
            for(let i = 0; i < raw.length; i++)uint8[i] = raw.charCodeAt(i);
            const sub_0 = await reg_0.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: uint8
            });
            await fetch("/api/admin/push/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    subscription: sub_0.toJSON()
                })
            });
            setShow(false);
        } catch (err) {
            console.error("[push banner] Error:", err);
            setShow(false);
        } finally{
            setLoading(false);
        }
    }
    if (!show || dismissed) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "mb-6 flex items-center justify-between gap-4 border border-neutral-200 bg-neutral-50 px-4 py-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                        size: 14,
                        className: "text-neutral-500 shrink-0"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/PushNotificationBanner.tsx",
                        lineNumber: 62,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-neutral-600",
                        children: "Enable desktop notifications to be alerted instantly when a new order is placed."
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/PushNotificationBanner.tsx",
                        lineNumber: 63,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/PushNotificationBanner.tsx",
                lineNumber: 61,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-3 shrink-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: handleEnable,
                        disabled: loading,
                        className: "text-[10px] uppercase tracking-widest text-black font-semibold hover:underline disabled:opacity-50",
                        children: loading ? "Enabling…" : "Enable"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/PushNotificationBanner.tsx",
                        lineNumber: 68,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setDismissed(true),
                        className: "text-neutral-400 hover:text-black transition-colors",
                        "aria-label": "Dismiss",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                            size: 14
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/PushNotificationBanner.tsx",
                            lineNumber: 72,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/PushNotificationBanner.tsx",
                        lineNumber: 71,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/PushNotificationBanner.tsx",
                lineNumber: 67,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/PushNotificationBanner.tsx",
        lineNumber: 60,
        columnNumber: 10
    }, this);
}
_s(PushNotificationBanner, "F8nkpnIs3dXMDvDxEL8/Hgw7gds=");
_c = PushNotificationBanner;
var _c;
__turbopack_context__.k.register(_c, "PushNotificationBanner");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_components_ui_50c6bb53._.js.map