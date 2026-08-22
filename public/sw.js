// Miss Tokyo — Service Worker
// Handles: Web Push Notifications + PWA Caching

// ─── Cache Names (bump version suffix to force cache invalidation) ────────────
// v3: stop caching private (admin/dashboard) pages. Bumping the version evicts
// any authenticated shells the v2 cache-first catch-all had already stored, so
// a logged-out user no longer sees a cached dashboard.
// v4: /pos was missing from PRIVATE_PREFIXES, so the till fell through to the
// cache-first catch-all with no max-age — a permanent copy that was never
// revalidated. Staff iPads kept serving a months-old till and never saw
// features added since. The bump is what evicts those copies; adding the
// prefix alone would leave every existing device stuck.
const SHELL_CACHE  = "mt-shell-v4";
const IMAGE_CACHE  = "mt-images-v4";
const DATA_CACHE   = "mt-data-v4";

// ─── Private route prefixes — NEVER cached (auth-gated admin dashboard) ───────
// Mirrors the dashboard/account protection in src/proxy.ts. Caching these would
// let the shell render for a logged-out user before any API call 401s.
// Keep this list and the isDashboard check in src/proxy.ts in step — /pos was
// absent from both, which is how the till ended up cached.
const PRIVATE_PREFIXES = [
    "/overview", "/sales", "/catalog", "/customers", "/finance",
    "/seo", "/settings", "/cms", "/communications", "/team", "/admin",
    "/pos",
];

// ─── App Shell URLs to precache on install ────────────────────────────────────
const SHELL_URLS = [
    "/",
    "/shop",
    "/gallery",
    "/gift-cards",
    "/account",
    "/offline.html",
];

// ─── Install: precache the app shell ──────────────────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then((cache) => {
            // addAll is all-or-nothing; individual failures won't break the SW
            return Promise.allSettled(
                SHELL_URLS.map((url) => cache.add(url).catch(() => { /* ignore */ }))
            );
        })
    );
    self.skipWaiting();
});

// ─── Activate: clean up stale cache versions ──────────────────────────────────
self.addEventListener("activate", (event) => {
    const KNOWN_CACHES = [SHELL_CACHE, IMAGE_CACHE, DATA_CACHE];
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => !KNOWN_CACHES.includes(key))
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ─── Fetch: route requests to the right caching strategy ─────────────────────
self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Only handle GET requests
    if (request.method !== "GET") return;

    let url;
    try {
        url = new URL(request.url);
    } catch {
        return;
    }

    // Only handle http/https — chrome-extension:// and others throw on cache.put
    if (url.protocol !== "http:" && url.protocol !== "https:") return;

    // ── NEVER cache: financial, auth, private admin & API endpoints ──
    // Only apply passthrough rules to our own origin — cross-origin (Supabase,
    // Paystack CDN) is handled by the strategy branches below.
    const sameOrigin = url.origin === self.location.origin;
    const isPaystack =
        url.hostname.includes("paystack.co") ||
        url.pathname.startsWith("/api/paystack");
    const isAuth =
        url.pathname.startsWith("/api/auth") ||
        url.pathname === "/login" ||
        url.pathname === "/register" ||
        url.pathname.startsWith("/auth/");
    const isCheckout = url.pathname.startsWith("/checkout");
    // Private admin dashboard pages + all first-party API responses — these are
    // auth-dependent and must never be served from cache (esp. after logout).
    const isPrivate = sameOrigin && (
        url.pathname.startsWith("/api") ||
        PRIVATE_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))
    );

    if (isPaystack || isAuth || isCheckout || isPrivate) {
        return; // pass through to network, no caching
    }

    // ── Images: Cache-First (7-day TTL) ──
    if (request.destination === "image") {
        event.respondWith(cacheFirst(IMAGE_CACHE, request, 7 * 24 * 60 * 60));
        return;
    }

    // ── Supabase API data: Network-First with stale fallback ──
    if (url.hostname.includes("supabase.co")) {
        event.respondWith(networkFirst(DATA_CACHE, request, 10000));
        return;
    }

    // ── Product/gallery/account pages: Stale-While-Revalidate ──
    const swrPaths = ["/shop", "/gallery", "/gift-cards", "/account", "/products", "/search"];
    if (swrPaths.some((p) => url.pathname.startsWith(p))) {
        event.respondWith(staleWhileRevalidate(DATA_CACHE, request));
        return;
    }

    // ── App shell (fonts, CSS, JS, HTML): Cache-First ──
    event.respondWith(cacheFirst(SHELL_CACHE, request, null));
});

// ─── Strategy: Cache-First ────────────────────────────────────────────────────
async function cacheFirst(cacheName, request, maxAgeSeconds) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
        // Optionally check max-age
        if (maxAgeSeconds !== null) {
            const dateHeader = cached.headers.get("date");
            if (dateHeader) {
                const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
                if (age > maxAgeSeconds) {
                    // Stale — fetch fresh in background
                    fetchAndCache(cache, request);
                }
            }
        }
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) safePut(cache, request, response.clone());
        return response;
    } catch {
        const fallback = await caches.match("/offline.html");
        return fallback || new Response("Offline", { status: 503 });
    }
}

// ─── Strategy: Network-First ──────────────────────────────────────────────────
async function networkFirst(cacheName, request, timeoutMs) {
    const cache = await caches.open(cacheName);

    const networkPromise = fetch(request).then((response) => {
        if (response.ok) safePut(cache, request, response.clone());
        return response;
    });

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs)
    );

    try {
        return await Promise.race([networkPromise, timeoutPromise]);
    } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        const fallback = await caches.match("/offline.html");
        return fallback || new Response("Offline", { status: 503 });
    }
}

// ─── Strategy: Stale-While-Revalidate ────────────────────────────────────────
async function staleWhileRevalidate(cacheName, request) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const networkFetch = fetch(request)
        .then((response) => {
            if (response.ok) safePut(cache, request, response.clone());
            return response;
        })
        .catch(() => null);

    if (cached) {
        // Return stale immediately, update in background
        networkFetch; // don't await
        return cached;
    }

    try {
        const response = await networkFetch;
        if (response) return response;
        throw new Error("no response");
    } catch {
        const fallback = await caches.match("/offline.html");
        return fallback || new Response("Offline", { status: 503 });
    }
}

// ─── Helper: fire-and-forget background fetch ────────────────────────────────
function fetchAndCache(cache, request) {
    fetch(request)
        .then((res) => { if (res.ok) safePut(cache, request, res); })
        .catch(() => {});
}

// ─── Helper: safe cache.put (skips chrome-extension and opaque schemes) ──────
function safePut(cache, request, response) {
    try {
        const u = new URL(request.url);
        if (u.protocol !== "http:" && u.protocol !== "https:") return;
        cache.put(request, response).catch(() => {});
    } catch {
        // ignore unparseable URLs
    }
}

// ─── Message: clear caches on demand (called on logout) ──────────────────────
self.addEventListener("message", (event) => {
    if (event.data?.type === "CLEAR_PRIVATE_CACHE") {
        // Nuke the shell + data caches so no authenticated page survives logout.
        // Images are non-sensitive and left intact.
        event.waitUntil(
            Promise.all([caches.delete(SHELL_CACHE), caches.delete(DATA_CACHE)])
        );
    }
});

// ─── Web Push: show notification ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
    const data = event.data?.json() ?? {};
    const title   = data.title   || "Miss Tokyo";
    const options = {
        body:    data.body    || "",
        tag:     data.tag     || "mt-notification",
        data:    { url: data.url || "/sales/orders" },
        requireInteraction: true,
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Web Push: handle notification click ──────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/sales/orders";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
            const match = list.find((c) => c.url.includes(url));
            if (match) return match.focus();
            return clients.openWindow(url);
        })
    );
});
