(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__5cf8d48e._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/src/proxy.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "proxy",
    ()=>proxy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [middleware-edge] (ecmascript)");
;
;
// ── Security headers injected on every response ───────────────────────────────
const SECURITY_HEADERS = {
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": [
        "default-src 'self'",
        // blob: for FFmpeg Web Worker inline scripts; https://vercel.live for Live Preview toolbar; https://va.vercel-scripts.com for Vercel Analytics
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://vercel.live https://va.vercel-scripts.com blob:",
        "style-src 'self' 'unsafe-inline'",
        // https://vercel.live fonts used by the Vercel preview toolbar
        "font-src 'self' https://vercel.live data:",
        "img-src 'self' blob: data: https:",
        "media-src 'self' https://*.supabase.co blob: data:",
        // blob: allows FFmpeg Web Workers instantiated via createObjectURL
        "worker-src 'self' blob:",
        // https://vercel.live/ required for Vercel Live Preview toolbar iframe
        "frame-src 'self' https://js.paystack.co https://vercel.live/",
        // wss:// for Supabase Realtime; https://vercel.live for Live toolbar; blob: for FFmpeg fetch
        "connect-src 'self' https: wss://*.supabase.co wss://*.pusher.com https://vercel.live blob:"
    ].join("; ")
};
function applySecurityHeaders(response) {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)){
        response.headers.set(key, value);
    }
    return response;
}
async function proxy(request) {
    const { pathname } = request.nextUrl;
    // Build a mutable response — cookie mutations must be forwarded to the browser
    let response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request
    });
    // Create a Supabase SSR client that can read & refresh the session cookie.
    // getUser() validates the JWT with Supabase and refreshes tokens when needed.
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://wcygtmcnysbhzgcicocm.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjeWd0bWNueXNiaHpnY2ljb2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzY5MTAsImV4cCI6MjA4OTAxMjkxMH0.JZh3JRLS4KVLNS8b-ClOB4ifkRJcsONvCDfkK4QEMTs"), {
        cookies: {
            getAll () {
                return request.cookies.getAll();
            },
            setAll (cookiesToSet) {
                cookiesToSet.forEach(({ name, value })=>request.cookies.set(name, value));
                response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next({
                    request
                });
                cookiesToSet.forEach(({ name, value, options })=>response.cookies.set(name, value, options));
            }
        }
    });
    const { data: { user } } = await supabase.auth.getUser();
    // ── Route protection ──────────────────────────────────────────────────────
    const isDashboard = pathname.startsWith("/overview") || pathname.startsWith("/sales") || pathname.startsWith("/catalog") || pathname.startsWith("/customers") || pathname.startsWith("/finance") || pathname.startsWith("/seo") || pathname.startsWith("/settings") || pathname.startsWith("/cms") || pathname.startsWith("/communications") || pathname.startsWith("/team");
    const isAccount = pathname.startsWith("/account");
    if (isDashboard || isAccount) {
        if (!user) {
            const loginUrl = request.nextUrl.clone();
            loginUrl.pathname = "/login";
            loginUrl.searchParams.set("next", pathname);
            return applySecurityHeaders(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(loginUrl));
        }
    // Role-gating for dashboard is handled server-side within each page/layout
    // (via supabaseAdmin profiles lookup) — the edge cannot query the DB.
    }
    // Already authenticated — redirect away from login pages
    if (pathname === "/admin/login" && user) {
        const dest = request.nextUrl.clone();
        dest.pathname = "/overview";
        return applySecurityHeaders(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(dest));
    }
    if (pathname === "/login" && user) {
        const dest = request.nextUrl.clone();
        dest.pathname = "/";
        return applySecurityHeaders(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(dest));
    }
    // Landing-page redirect: anonymous visitors hitting "/" are sent to the
    // admin-configured route (shop or gallery). Authenticated users always
    // see the real home page so admins can still access it.
    if (pathname === "/" && !user) {
        try {
            const apiUrl = new URL("/api/landing-route", request.url);
            const res = await fetch(apiUrl.toString(), {
                cache: "no-store"
            });
            if (res.ok) {
                const { route } = await res.json();
                if (route === "shop" || route === "gallery") {
                    const dest = request.nextUrl.clone();
                    dest.pathname = `/${route}`;
                    return applySecurityHeaders(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].redirect(dest));
                }
            }
        } catch  {
        // Fetch failed — serve the real home page
        }
    }
    return applySecurityHeaders(response);
}
const config = {
    matcher: [
        /*
         * Match all paths EXCEPT:
         *   - _next/static  (Next.js static assets)
         *   - _next/image   (Next.js image optimisation)
         *   - favicon, sitemap, robots
         *   - public folder assets (images, fonts, video, etc.)
         */ "/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|mp4|mov)).*)"
    ]
};
}),
"[project]/src/middleware.ts [middleware-edge] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
// Next.js requires the middleware entry-point to be named `middleware.ts`.
// All logic lives in proxy.ts so it can be imported by tests independently.
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$proxy$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/proxy.ts [middleware-edge] (ecmascript)");
;
}),
"[project]/src/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$proxy$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["config"],
    "middleware",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$proxy$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["proxy"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$middleware$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/middleware.ts [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$proxy$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/proxy.ts [middleware-edge] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__5cf8d48e._.js.map