module.exports = [
"[project]/src/lib/toast.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSnapshot",
    ()=>getSnapshot,
    "subscribe",
    ()=>subscribe,
    "toast",
    ()=>toast
]);
let toasts = [];
const listeners = new Set();
function notify() {
    listeners.forEach((l)=>l(toasts));
}
function subscribe(listener) {
    listeners.add(listener);
    return ()=>listeners.delete(listener);
}
function getSnapshot() {
    return toasts;
}
function add(message, type) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    toasts = [
        ...toasts,
        {
            id,
            message,
            type
        }
    ];
    notify();
    setTimeout(()=>{
        toasts = toasts.filter((t)=>t.id !== id);
        notify();
    }, 3500);
}
const toast = {
    success: (message)=>add(message, "success"),
    error: (message)=>add(message, "error"),
    info: (message)=>add(message, "info")
};
}),
"[project]/src/components/ui/miss-tokyo/Toaster.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Toaster",
    ()=>Toaster
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
const EMPTY_TOASTS = [];
const STYLES = {
    success: "bg-black text-white",
    error: "bg-red-600 text-white",
    info: "bg-neutral-700 text-white"
};
function Toaster() {
    const toasts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSyncExternalStore"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["subscribe"], __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getSnapshot"], ()=>EMPTY_TOASTS);
    if (toasts.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed bottom-6 right-6 z-50 flex flex-col gap-2 no-print",
        children: toasts.map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `px-5 py-3 text-xs uppercase tracking-widest font-semibold shadow-lg toast-enter ${STYLES[t.type]}`,
                children: t.message
            }, t.id, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/Toaster.tsx",
                lineNumber: 22,
                columnNumber: 17
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/ui/miss-tokyo/Toaster.tsx",
        lineNumber: 20,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/lib/supabase.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient,
    "supabase",
    ()=>supabase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-ssr] (ecmascript) <locals>");
;
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://wcygtmcnysbhzgcicocm.supabase.co") || 'https://placeholder.supabase.co';
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjeWd0bWNueXNiaHpnY2ljb2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzY5MTAsImV4cCI6MjA4OTAxMjkxMH0.JZh3JRLS4KVLNS8b-ClOB4ifkRJcsONvCDfkK4QEMTs") || 'placeholder';
// Singleton for the browser bundle — one GoTrueClient instance across the whole app
let _browserClient;
function createClient() {
    if ("TURBOPACK compile-time truthy", 1) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey);
    }
    //TURBOPACK unreachable
    ;
}
const supabase = createClient();
}),
"[project]/src/components/ui/miss-tokyo/RealtimeStockMonitor.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RealtimeStockMonitor",
    ()=>RealtimeStockMonitor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/toast.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
function RealtimeStockMonitor() {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const channel = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].channel("products-stock-monitor").on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "products"
        }, (payload)=>{
            const updated = payload.new;
            if (updated.is_active && typeof updated.inventory_count === "number" && updated.inventory_count < 5) {
                const msg = updated.inventory_count === 0 ? `${updated.name} is out of stock.` : `Low stock: ${updated.name} — ${updated.inventory_count} remaining.`;
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$toast$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toast"].error(msg);
            }
        }).subscribe();
        return ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["supabase"].removeChannel(channel);
        };
    }, []);
    return null;
}
}),
"[project]/src/components/ui/miss-tokyo/LogoutButton.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LogoutButton",
    ()=>LogoutButton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
"use client";
;
;
function LogoutButton() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const handleLogout = async ()=>{
        await fetch("/api/auth/logout", {
            method: "POST"
        });
        window.location.href = "/admin/login";
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        onClick: handleLogout,
        className: "block px-4 py-2 text-sm text-neutral-500 hover:text-black transition-colors w-full text-left",
        children: "Sign Out"
    }, void 0, false, {
        fileName: "[project]/src/components/ui/miss-tokyo/LogoutButton.tsx",
        lineNumber: 14,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AdminSidebar",
    ()=>AdminSidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$LogoutButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/miss-tokyo/LogoutButton.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
function NavLink({ href, label, badge }) {
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const isActive = href === "/overview" && pathname === "/overview" || href !== "/overview" && (pathname === href || pathname.startsWith(href + "/"));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        href: href,
        className: `flex items-center justify-between px-3 py-[5px] text-sm transition-all duration-150 ${isActive ? "bg-neutral-100 text-black font-semibold border-l-2 border-black" : "text-neutral-500 hover:bg-neutral-50 hover:text-black border-l-2 border-transparent"}`,
        style: {
            borderRadius: "0 6px 6px 0"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: label
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 26,
                columnNumber: 13
            }, this),
            badge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded",
                style: {
                    backgroundColor: "#b8960c",
                    color: "white"
                },
                children: badge
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 28,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
        lineNumber: 17,
        columnNumber: 9
    }, this);
}
function NavSection({ title, items }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-1 px-3",
                children: title
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 42,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                className: "space-y-0.5",
                children: items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(NavLink, {
                            ...item
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                            lineNumber: 48,
                            columnNumber: 25
                        }, this)
                    }, item.href, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                        lineNumber: 47,
                        columnNumber: 21
                    }, this))
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 45,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
        lineNumber: 41,
        columnNumber: 9
    }, this);
}
function AdminSidebar({ isFullAccess, showCustomRequests, businessName }) {
    const [mobileOpen, setMobileOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const displayName = businessName || "Miss Tokyo";
    const salesItems = [
        {
            label: "Point of Sale",
            href: "/pos"
        },
        {
            label: "POS History",
            href: "/pos/history"
        },
        {
            label: "Orders",
            href: "/sales/orders"
        },
        {
            label: "Pre-Orders",
            href: "/sales/pre-orders"
        },
        {
            label: "Abandoned Carts",
            href: "/customers/abandoned"
        },
        {
            label: "Discounts",
            href: "/catalog/discounts"
        },
        {
            label: "Auto Discounts",
            href: "/catalog/auto-discounts"
        },
        {
            label: "Gift Cards",
            href: "/catalog/gift-cards"
        },
        ...isFullAccess ? [
            {
                label: "Pay Links",
                href: "/finance/links"
            },
            {
                label: "Invoices",
                href: "/finance/invoices"
            }
        ] : []
    ];
    const catalogueItems = [
        {
            label: "Products",
            href: "/catalog/products"
        },
        {
            label: "Categories",
            href: "/catalog/categories"
        },
        ...isFullAccess ? [
            {
                label: "Wholesalers",
                href: "/sales/wholesalers"
            }
        ] : []
    ];
    const customerItems = [
        {
            label: "Contact List",
            href: "/customers"
        },
        {
            label: "Form Submissions",
            href: "/customers/forms"
        },
        {
            label: "Riders",
            href: "/sales/riders"
        },
        ...showCustomRequests ? [
            {
                label: "Custom Requests",
                href: "/customers/requests"
            }
        ] : []
    ];
    const settingsItems = isFullAccess ? [
        {
            label: "Site Settings",
            href: "/settings"
        },
        {
            label: "CMS",
            href: "/cms",
            badge: "New"
        }
    ] : [];
    const navContent = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
        className: "flex-1 py-3 px-2 space-y-3 overflow-y-auto",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(NavSection, {
                title: "Overview",
                items: [
                    {
                        label: "Dashboard",
                        href: "/overview"
                    },
                    {
                        label: "Analytics",
                        href: "/sales/analytics"
                    }
                ]
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 108,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(NavSection, {
                title: "Sales",
                items: salesItems
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 115,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(NavSection, {
                title: "Catalogue",
                items: catalogueItems
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 116,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(NavSection, {
                title: "Customers",
                items: customerItems
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 117,
                columnNumber: 13
            }, this),
            settingsItems.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(NavSection, {
                title: "Settings",
                items: settingsItems
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 119,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
        lineNumber: 107,
        columnNumber: 9
    }, this);
    const bottomStrip = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "border-t border-neutral-100 px-2 py-3 space-y-1",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                href: "/",
                className: "flex items-center px-3 py-2 text-xs text-neutral-400 hover:text-black rounded-lg hover:bg-neutral-50 transition-all duration-150",
                children: "← Storefront"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 126,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$miss$2d$tokyo$2f$LogoutButton$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LogoutButton"], {}, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 132,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
        lineNumber: 125,
        columnNumber: 9
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: "w-[220px] shrink-0 border-r border-neutral-200 hidden md:flex flex-col h-screen sticky top-0 bg-white",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-4 py-6 border-b border-neutral-100",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: "/overview",
                                className: "font-serif text-lg tracking-widest uppercase block text-neutral-900 leading-tight",
                                children: displayName
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                                lineNumber: 141,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[9px] uppercase tracking-widest text-neutral-400 mt-1.5 block",
                                children: "Atelier Console"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                                lineNumber: 147,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                        lineNumber: 140,
                        columnNumber: 17
                    }, this),
                    navContent,
                    bottomStrip
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 139,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-neutral-200 flex items-center justify-between px-4 h-14",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/overview",
                        className: "font-serif text-base tracking-widest uppercase text-neutral-900",
                        children: displayName
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                        lineNumber: 157,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setMobileOpen(true),
                        "aria-label": "Open navigation",
                        className: "p-2 text-neutral-600 hover:text-black transition-colors",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                            width: "20",
                            height: "20",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            strokeLinecap: "round",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                    x1: "3",
                                    y1: "6",
                                    x2: "21",
                                    y2: "6"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                                    lineNumber: 177,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                    x1: "3",
                                    y1: "12",
                                    x2: "21",
                                    y2: "12"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                                    lineNumber: 178,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                    x1: "3",
                                    y1: "18",
                                    x2: "21",
                                    y2: "18"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                                    lineNumber: 179,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                            lineNumber: 168,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                        lineNumber: 163,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 156,
                columnNumber: 13
            }, this),
            mobileOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "md:hidden fixed inset-0 z-40 bg-black/40",
                onClick: ()=>setMobileOpen(false)
            }, void 0, false, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 186,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("aside", {
                className: `md:hidden fixed top-0 left-0 z-50 h-full bg-white flex flex-col shadow-2xl transition-transform duration-200 w-[260px] ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between px-4 h-14 border-b border-neutral-100 shrink-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-serif text-base tracking-widest uppercase text-neutral-900",
                                children: displayName
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                                lineNumber: 199,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setMobileOpen(false),
                                "aria-label": "Close navigation",
                                className: "p-1.5 text-neutral-500 hover:text-black transition-colors",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    width: "18",
                                    height: "18",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2",
                                    strokeLinecap: "round",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "18",
                                            y1: "6",
                                            x2: "6",
                                            y2: "18"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                                            lineNumber: 216,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("line", {
                                            x1: "6",
                                            y1: "6",
                                            x2: "18",
                                            y2: "18"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                                            lineNumber: 217,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                                    lineNumber: 207,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                                lineNumber: 202,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                        lineNumber: 198,
                        columnNumber: 17
                    }, this),
                    navContent,
                    bottomStrip
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/miss-tokyo/AdminSidebar.tsx",
                lineNumber: 193,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true);
}
}),
];

//# sourceMappingURL=src_8a9382b3._.js.map